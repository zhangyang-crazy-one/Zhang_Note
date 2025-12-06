import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { logger } from '../utils/logger.js';
import type {
    MCPServerConfig,
    MCPRequest,
    MCPResponse,
    MCPTool,
    MCPInitializeResult,
    MCPToolsListResult,
    MCPToolCallResult
} from './types.js';

/**
 * MCP 客户端 - 连接单个 MCP 服务器
 * 使用 JSON-RPC 2.0 over stdio 协议通信
 */
export class MCPClient {
    private name: string;
    private config: MCPServerConfig;
    private process: ChildProcess | null = null;
    private requestId = 0;
    private pendingRequests: Map<number, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();
    private tools: MCPTool[] = [];
    private isInitialized = false;

    constructor(name: string, config: MCPServerConfig) {
        this.name = name;
        this.config = config;
    }

    /**
     * 连接并初始化 MCP 服务器
     */
    async connect(): Promise<void> {
        if (this.process) {
            logger.warn(`MCP server ${this.name} already connected`);
            return;
        }

        try {
            logger.info(`Starting MCP server: ${this.name}`, {
                command: this.config.command,
                args: this.config.args
            });

            // 启动子进程 - Windows需要shell: true才能运行npx
            this.process = spawn(this.config.command, this.config.args, {
                env: { ...process.env, ...this.config.env },
                cwd: this.config.cwd || process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: process.platform === 'win32',  // Windows需要shell模式
                windowsHide: true  // 隐藏Windows控制台窗口
            });

            // 设置 stderr 日志
            if (this.process.stderr) {
                this.process.stderr.on('data', (data) => {
                    logger.debug(`MCP ${this.name} stderr:`, data.toString());
                });
            }

            // 设置 stdout 读取器
            if (this.process.stdout) {
                const rl = readline.createInterface({
                    input: this.process.stdout,
                    crlfDelay: Infinity
                });

                rl.on('line', (line) => {
                    try {
                        const response: MCPResponse = JSON.parse(line);
                        this.handleResponse(response);
                    } catch (error) {
                        logger.error(`Failed to parse MCP response from ${this.name}:`, error);
                    }
                });
            }

            // 处理进程退出
            this.process.on('exit', (code) => {
                logger.info(`MCP server ${this.name} exited with code ${code}`);
                this.cleanup();
            });

            this.process.on('error', (error) => {
                logger.error(`MCP server ${this.name} error:`, error);
                this.cleanup();
            });

            // 等待进程启动
            await this.waitForProcessReady();

            // 初始化协议 - 重试逻辑（最多3次）
            await this.initializeWithRetry(3);

            // 发现工具
            await this.discoverTools();

            logger.info(`MCP server ${this.name} connected successfully`, {
                toolsCount: this.tools.length
            });
        } catch (error) {
            logger.error(`Failed to connect to MCP server ${this.name}:`, error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * 初始化协议 - 带重试逻辑
     * @param maxRetries 最大重试次数
     */
    private async initializeWithRetry(maxRetries: number): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.debug(`MCP ${this.name} initialize attempt ${attempt}/${maxRetries}`);
                await this.initialize();
                return; // 成功则直接返回
            } catch (error) {
                lastError = error as Error;
                logger.warn(`MCP ${this.name} initialize attempt ${attempt} failed:`, lastError.message);

                // 如果不是最后一次尝试，等待后重试
                if (attempt < maxRetries) {
                    const delayMs = 1000 * attempt; // 指数延迟：1s, 2s, 3s...
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        // 所有重试都失败
        throw new Error(
            `Failed to initialize MCP server ${this.name} after ${maxRetries} attempts: ${lastError?.message}`
        );
    }

    /**
     * 等待进程就绪
     */
    private waitForProcessReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`MCP server ${this.name} startup timeout`));
            }, 30000);  // 增加到30秒，npx需要更长时间

            let stderrBuffer = '';
            let resolved = false;

            const checkReady = () => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                resolve();
            };

            // 监听stdout - 有输出表示服务器就绪
            if (this.process?.stdout) {
                this.process.stdout.once('data', () => {
                    logger.debug(`MCP ${this.name} stdout received, server ready`);
                    checkReady();
                });
            }

            // 监听stderr - 某些服务器先输出到stderr
            if (this.process?.stderr) {
                this.process.stderr.on('data', (data) => {
                    stderrBuffer += data.toString();
                    logger.debug(`MCP ${this.name} stderr: ${data.toString()}`);

                    // 检查常见的"就绪"标识
                    if (stderrBuffer.includes('listening') ||
                        stderrBuffer.includes('started') ||
                        stderrBuffer.includes('ready')) {
                        checkReady();
                    }
                });
            }

            // 处理进程错误
            this.process?.on('error', (err) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    reject(new Error(`Failed to start MCP server: ${err.message}`));
                }
            });

            // 处理提前退出
            this.process?.on('exit', (code) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    if (code !== 0) {
                        reject(new Error(`MCP server exited with code ${code}. stderr: ${stderrBuffer}`));
                    }
                }
            });

            // 备用：如果3秒后没有输出，假设就绪
            setTimeout(() => {
                if (!resolved && this.process && !this.process.killed) {
                    logger.debug(`MCP ${this.name} fallback ready after 3s`);
                    checkReady();
                }
            }, 3000);
        });
    }

    /**
     * 发送 JSON-RPC 请求
     */
    private sendRequest(method: string, params?: any, timeoutMs = 30000): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdin) {
                reject(new Error(`MCP server ${this.name} not connected`));
                return;
            }

            const id = ++this.requestId;
            const request: MCPRequest = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };

            // 设置超时
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout for ${method} on ${this.name}`));
            }, timeoutMs);

            // 存储待处理请求
            this.pendingRequests.set(id, { resolve, reject, timeout });

            // 发送请求
            const requestLine = JSON.stringify(request) + '\n';
            this.process.stdin.write(requestLine, (error) => {
                if (error) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(id);
                    reject(new Error(`Failed to send request: ${error.message}`));
                }
            });

            logger.debug(`Sent MCP request to ${this.name}:`, { method, id });
        });
    }

    /**
     * 处理响应
     */
    private handleResponse(response: MCPResponse): void {
        const pending = this.pendingRequests.get(response.id as number);
        if (!pending) {
            logger.warn(`Received response for unknown request ID: ${response.id}`);
            return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id as number);

        if (response.error) {
            pending.reject(new Error(`MCP Error: ${response.error.message}`));
        } else {
            pending.resolve(response.result);
        }
    }

    /**
     * 初始化协议
     */
    private async initialize(): Promise<void> {
        const result: MCPInitializeResult = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {}
            },
            clientInfo: {
                name: 'zhang-reader',
                version: '1.0.0'
            }
        });

        logger.debug(`MCP server ${this.name} initialized:`, result);

        // 发送 initialized 通知
        if (this.process && this.process.stdin) {
            const notification = JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/initialized'
            }) + '\n';
            this.process.stdin.write(notification);
        }

        this.isInitialized = true;
    }

    /**
     * 发现工具
     */
    async discoverTools(): Promise<MCPTool[]> {
        if (!this.isInitialized) {
            throw new Error(`MCP server ${this.name} not initialized`);
        }

        const result: MCPToolsListResult = await this.sendRequest('tools/list');
        this.tools = result.tools || [];

        logger.info(`Discovered ${this.tools.length} tools from ${this.name}:`,
            this.tools.map(t => t.name)
        );

        return this.tools;
    }

    /**
     * 调用工具
     */
    async callTool(name: string, args: any): Promise<any> {
        if (!this.isInitialized) {
            throw new Error(`MCP server ${this.name} not initialized`);
        }

        logger.debug(`Calling tool ${name} on ${this.name}:`, args);

        const result: MCPToolCallResult = await this.sendRequest('tools/call', {
            name,
            arguments: args
        });

        // 提取文本内容
        if (result.content && Array.isArray(result.content)) {
            const textContent = result.content
                .filter(c => c.type === 'text' && c.text)
                .map(c => c.text)
                .join('\n');

            return {
                success: !result.isError,
                output: textContent || JSON.stringify(result.content)
            };
        }

        return {
            success: !result.isError,
            output: JSON.stringify(result)
        };
    }

    /**
     * 获取工具列表
     */
    getTools(): MCPTool[] {
        return this.tools;
    }

    /**
     * 获取服务器名称
     */
    getName(): string {
        return this.name;
    }

    /**
     * 检查是否已连接
     */
    isConnected(): boolean {
        return this.process !== null && this.isInitialized;
    }

    /**
     * 断开连接
     */
    async disconnect(): Promise<void> {
        logger.info(`Disconnecting MCP server: ${this.name}`);
        this.cleanup();
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        // 拒绝所有待处理请求
        for (const [id, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`MCP server ${this.name} disconnected`));
        }
        this.pendingRequests.clear();

        // 终止进程
        if (this.process) {
            this.process.kill();
            this.process = null;
        }

        this.isInitialized = false;
        this.tools = [];
    }
}
