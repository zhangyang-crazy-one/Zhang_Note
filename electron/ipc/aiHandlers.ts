import { ipcMain, net } from 'electron';
import { logger } from '../utils/logger.js';

export interface FetchResult {
    status: number;
    data: unknown;
    headers: Record<string, string>;
}

export function registerAiHandlers(): void {
    logger.info('Registering AI IPC handlers');

    // Proxy fetch requests to avoid CORS issues
    ipcMain.handle('ai:fetch', async (_, url: string, options: RequestInit): Promise<FetchResult> => {
        try {
            logger.debug('AI fetch request', { url, method: options.method });

            // 规范化localhost URL处理
            let fetchUrl = url;
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
                // 如果不以http://或https://开头，则添加http://
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    fetchUrl = `http://${url}`;
                }
            }

            logger.debug('Normalized URL', { original: url, normalized: fetchUrl });

            const response = await net.fetch(fetchUrl, {
                method: options.method || 'POST',
                headers: options.headers as Record<string, string>,
                body: options.body as string
            });

            const contentType = response.headers.get('content-type') || '';
            let data: unknown;

            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            logger.debug('AI fetch response', { status: response.status, url: fetchUrl });

            return {
                status: response.status,
                data,
                headers
            };
        } catch (error) {
            logger.error('ai:fetch failed', { error, url });

            // 提供更具体的错误信息
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let userFriendlyError = errorMessage;

            if (errorMessage.includes('ECONNREFUSED')) {
                userFriendlyError = `连接被拒绝: ${url}。请确保AI服务正在运行。`;
            } else if (errorMessage.includes('ETIMEDOUT')) {
                userFriendlyError = `连接超时: ${url}。请检查网络连接。`;
            } else if (errorMessage.includes('ENOTFOUND')) {
                userFriendlyError = `找不到主机: ${url}。请检查URL是否正确。`;
            } else if (errorMessage.includes('ERR_INVALID_URL')) {
                userFriendlyError = `无效的URL: ${url}。请检查URL格式。`;
            }

            // 使用状态码0表示网络错误（HTTP级别的错误）
            return {
                status: 0,
                data: {
                    error: userFriendlyError,
                    originalError: errorMessage,
                    url: url
                },
                headers: {}
            };
        }
    });

    // Stream fetch for AI responses (future enhancement)
    ipcMain.handle('ai:streamFetch', async (event, url: string, options: RequestInit) => {
        try {
            logger.debug('AI stream fetch request', { url, method: options.method });

            const response = await net.fetch(url, {
                method: options.method || 'POST',
                headers: options.headers as Record<string, string>,
                body: options.body as string
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            // For now, just return the full response
            // Streaming would require a different approach with IPC
            const text = await response.text();

            logger.debug('AI stream fetch response', { status: response.status, size: text.length });

            return {
                status: response.status,
                data: text,
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            logger.error('ai:streamFetch failed', { error, url });

            // 使用状态码0表示网络错误（保持一致性）
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let userFriendlyError = errorMessage;

            if (errorMessage.includes('ECONNREFUSED')) {
                userFriendlyError = `连接被拒绝: ${url}。请确保AI服务正在运行。`;
            } else if (errorMessage.includes('ETIMEDOUT')) {
                userFriendlyError = `连接超时: ${url}。请检查网络连接。`;
            } else if (errorMessage.includes('ENOTFOUND')) {
                userFriendlyError = `找不到主机: ${url}。请检查URL是否正确。`;
            }

            return {
                status: 0,
                data: {
                    error: userFriendlyError,
                    originalError: errorMessage,
                    url: url
                },
                headers: {}
            };
        }
    });

    logger.info('AI IPC handlers registered');
}
