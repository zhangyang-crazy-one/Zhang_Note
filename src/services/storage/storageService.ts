import { StorageService } from './types';
import { ElectronStorageService } from './electronStorage';
import { WebStorageService } from './webStorage';
import { getPlatform } from '../platform/platformService';

export type { StorageService, ExportData, ImportResult } from './types';

let storageService: StorageService | null = null;

/**
 * Get the storage service instance
 * Returns a singleton based on the current platform
 */
export function getStorageService(): StorageService {
    if (storageService) {
        return storageService;
    }

    const platform = getPlatform();

    if (platform.isElectron) {
        storageService = new ElectronStorageService();
    } else if (platform.isMobile) {
        // Mobile uses web storage for now (could be replaced with AsyncStorage bridge)
        storageService = new WebStorageService();
    } else {
        storageService = new WebStorageService();
    }

    return storageService;
}

/**
 * Initialize the storage service
 */
export async function initializeStorage(): Promise<StorageService> {
    const service = getStorageService();
    await service.initialize();
    return service;
}

/**
 * Reset the storage service singleton (for testing)
 */
export function resetStorageService(): void {
    storageService = null;
}
