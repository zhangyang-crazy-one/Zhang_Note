import { getPlatform } from '../platform/platformService';

export interface FetchResult {
    status: number;
    data: unknown;
    headers: Record<string, string>;
}

/**
 * Rewrite API URLs to use Vite proxy in development browser mode
 */
function rewriteUrlForProxy(url: string): string {
    // Only rewrite in browser dev mode (not Electron, not production)
    if (typeof window !== 'undefined' &&
        !window.electronAPI &&
        import.meta.env?.DEV) {

        // DeepSeek API proxy
        if (url.startsWith('https://api.deepseek.com')) {
            return url.replace('https://api.deepseek.com', '/api/deepseek');
        }
        // OpenAI API proxy
        if (url.startsWith('https://api.openai.com')) {
            return url.replace('https://api.openai.com', '/api/openai');
        }
    }
    return url;
}

/**
 * Platform-aware fetch function
 * Routes through Electron's main process when running in Electron to avoid CORS
 * Uses Vite proxy in browser dev mode
 * Uses native fetch in browser production/mobile
 */
export async function platformFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const platform = getPlatform();

    if (platform.isElectron && window.electronAPI) {
        // Route through Electron main process to avoid CORS
        const result = await window.electronAPI.ai.fetch(url, options);

        // 检测网络级错误（status 0表示网络错误）
        if (result.status === 0) {
            // status 0 表示IPC层捕获到错误
            let errorMessage = 'Network error';
            if (result.data && typeof result.data === 'object' && 'error' in result.data) {
                errorMessage = (result.data as { error: string }).error;
            }
            throw new Error(errorMessage);
        }

        // Convert to Response object
        const body = typeof result.data === 'string'
            ? result.data
            : JSON.stringify(result.data);

        return new Response(body, {
            status: result.status,
            headers: new Headers(result.headers)
        });
    }

    // Rewrite URL for Vite proxy in dev mode
    const finalUrl = rewriteUrlForProxy(url);

    // Direct fetch for web/mobile
    return fetch(finalUrl, options);
}

/**
 * Platform-aware JSON fetch
 */
export async function platformFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await platformFetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}
