import { ipcMain } from 'electron';
import { mcpManager } from './index.js';
import { logger } from '../utils/logger.js';
import type { MCPTool, MCPServerStatus } from './types.js';

/**
 * 注册 MCP 相关的 IPC 处理器
 */
export function registerMCPHandlers(): void {
    logger.info('Registering MCP IPC handlers');

    /**
     * 加载 MCP 配置并连接服务器
     */
    ipcMain.handle('mcp:loadConfig', async (_, configStr: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            logger.info('Loading MCP config from renderer');
            await mcpManager.loadConfig(configStr);
            return { success: true };
        } catch (error) {
            logger.error('mcp:loadConfig failed', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    /**
     * 获取所有可用工具
     */
    ipcMain.handle('mcp:getTools', async (): Promise<MCPTool[]> => {
        try {
            const tools = mcpManager.getAllTools();
            logger.debug('mcp:getTools called', { count: tools.length });
            return tools;
        } catch (error) {
            logger.error('mcp:getTools failed', error);
            return [];
        }
    });

    /**
     * 调用工具
     */
    ipcMain.handle('mcp:callTool', async (_, name: string, args: any): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }> => {
        try {
            logger.info('mcp:callTool called', { name, args });
            const result = await mcpManager.callTool(name, args);
            return {
                success: true,
                result
            };
        } catch (error) {
            logger.error('mcp:callTool failed', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    /**
     * 获取所有服务器状态
     */
    ipcMain.handle('mcp:getStatuses', async (): Promise<MCPServerStatus[]> => {
        try {
            const statuses = mcpManager.getStatuses();
            logger.debug('mcp:getStatuses called', { count: statuses.length });
            return statuses;
        } catch (error) {
            logger.error('mcp:getStatuses failed', error);
            return [];
        }
    });

    /**
     * 断开所有连接
     */
    ipcMain.handle('mcp:disconnectAll', async (): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            logger.info('mcp:disconnectAll called');
            await mcpManager.disconnectAll();
            return { success: true };
        } catch (error) {
            logger.error('mcp:disconnectAll failed', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    logger.info('MCP IPC handlers registered');
}
