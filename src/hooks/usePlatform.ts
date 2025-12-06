import { useState, useEffect } from 'react';
import { getPlatform, Platform } from '../services/platform/platformService';

/**
 * React hook for platform detection
 * Returns platform information and feature availability
 */
export function usePlatform(): Platform {
    const [platform] = useState<Platform>(() => getPlatform());
    return platform;
}

/**
 * React hook to check if a specific feature is supported
 */
export function useSupportsFeature(feature: 'pdf' | 'fileSystem' | 'nativeMenus'): boolean {
    const platform = usePlatform();

    switch (feature) {
        case 'pdf':
            return platform.supportsPdf;
        case 'fileSystem':
            return platform.supportsFileSystem;
        case 'nativeMenus':
            return platform.supportsNativeMenus;
        default:
            return false;
    }
}
