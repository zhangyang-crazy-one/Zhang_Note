import { registerDbHandlers } from './dbHandlers.js';
import { registerFileHandlers } from './fileHandlers.js';
import { registerAiHandlers } from './aiHandlers.js';
import { logger } from '../utils/logger.js';

export function registerAllHandlers(): void {
    logger.info('Registering all IPC handlers');

    registerDbHandlers();
    registerFileHandlers();
    registerAiHandlers();

    logger.info('All IPC handlers registered');
}

export { registerDbHandlers } from './dbHandlers.js';
export { registerFileHandlers } from './fileHandlers.js';
export { registerAiHandlers } from './aiHandlers.js';
