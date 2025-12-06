import fs from 'fs';
import path from 'path';
import { getLogsPath, ensureLogsDir } from './paths.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private logFile: string | null = null;
    private isDev: boolean;

    constructor() {
        this.isDev = process.env.NODE_ENV !== 'production';
    }

    initialize(): void {
        ensureLogsDir();
        const date = new Date().toISOString().split('T')[0];
        this.logFile = path.join(getLogsPath(), `neonmark-${date}.log`);
    }

    private formatMessage(level: LogLevel, message: string, data?: unknown): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }

    private writeToFile(message: string): void {
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, message + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    debug(message: string, data?: unknown): void {
        if (this.isDev) {
            const formatted = this.formatMessage('debug', message, data);
            console.log(formatted);
            this.writeToFile(formatted);
        }
    }

    info(message: string, data?: unknown): void {
        const formatted = this.formatMessage('info', message, data);
        console.log(formatted);
        this.writeToFile(formatted);
    }

    warn(message: string, data?: unknown): void {
        const formatted = this.formatMessage('warn', message, data);
        console.warn(formatted);
        this.writeToFile(formatted);
    }

    error(message: string, data?: unknown): void {
        const formatted = this.formatMessage('error', message, data);
        console.error(formatted);
        this.writeToFile(formatted);
    }
}

export const logger = new Logger();
