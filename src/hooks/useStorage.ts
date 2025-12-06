import { useState, useEffect, useCallback } from 'react';
import { getStorageService, StorageService, ExportData, ImportResult } from '../services/storage/storageService';
import { MarkdownFile, AIConfig, ChatMessage, AppTheme, MistakeRecord } from '../../types';

interface UseStorageResult {
    isInitialized: boolean;
    isLoading: boolean;
    error: Error | null;
    storage: StorageService | null;

    // File operations
    files: MarkdownFile[];
    loadFiles: () => Promise<void>;
    createFile: (file: MarkdownFile) => Promise<MarkdownFile>;
    updateFile: (id: string, updates: Partial<MarkdownFile>) => Promise<MarkdownFile | null>;
    deleteFile: (id: string) => Promise<boolean>;

    // AI Config
    aiConfig: AIConfig | null;
    loadAIConfig: () => Promise<void>;
    saveAIConfig: (config: AIConfig) => Promise<AIConfig>;

    // Chat
    chatMessages: ChatMessage[];
    loadChatMessages: () => Promise<void>;
    addChatMessage: (message: ChatMessage) => Promise<ChatMessage>;
    clearChatMessages: () => Promise<void>;

    // Themes
    themes: AppTheme[];
    activeThemeId: string;
    loadThemes: () => Promise<void>;
    saveTheme: (theme: AppTheme) => Promise<AppTheme>;
    deleteTheme: (id: string) => Promise<boolean>;
    setActiveThemeId: (id: string) => Promise<void>;

    // Mistakes
    mistakes: MistakeRecord[];
    loadMistakes: () => Promise<void>;
    addMistake: (record: MistakeRecord) => Promise<MistakeRecord>;
    deleteMistake: (id: string) => Promise<boolean>;

    // Export/Import
    exportData: () => Promise<ExportData>;
    importData: (data: ExportData) => Promise<ImportResult>;
}

/**
 * React hook for unified storage access
 * Handles initialization and provides reactive state
 */
export function useStorage(): UseStorageResult {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [storage, setStorage] = useState<StorageService | null>(null);

    // State
    const [files, setFiles] = useState<MarkdownFile[]>([]);
    const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [themes, setThemes] = useState<AppTheme[]>([]);
    const [activeThemeId, setActiveThemeIdState] = useState('neon-cyber');
    const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);

    // Initialize storage
    useEffect(() => {
        async function init() {
            try {
                setIsLoading(true);
                const service = getStorageService();
                await service.initialize();
                setStorage(service);

                // Load initial data
                const [loadedFiles, loadedConfig, loadedMessages, loadedThemes, loadedThemeId, loadedMistakes] =
                    await Promise.all([
                        service.getFiles(),
                        service.getAIConfig(),
                        service.getChatMessages(),
                        service.getThemes(),
                        service.getActiveThemeId(),
                        service.getMistakes()
                    ]);

                setFiles(loadedFiles);
                setAIConfig(loadedConfig);
                setChatMessages(loadedMessages);
                setThemes(loadedThemes);
                setActiveThemeIdState(loadedThemeId);
                setMistakes(loadedMistakes);

                setIsInitialized(true);
            } catch (e) {
                setError(e as Error);
                console.error('Failed to initialize storage:', e);
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, []);

    // File operations
    const loadFiles = useCallback(async () => {
        if (!storage) return;
        const loaded = await storage.getFiles();
        setFiles(loaded);
    }, [storage]);

    const createFile = useCallback(async (file: MarkdownFile) => {
        if (!storage) throw new Error('Storage not initialized');
        const created = await storage.createFile(file);
        setFiles(prev => [...prev, created]);
        return created;
    }, [storage]);

    const updateFile = useCallback(async (id: string, updates: Partial<MarkdownFile>) => {
        if (!storage) throw new Error('Storage not initialized');
        const updated = await storage.updateFile(id, updates);
        if (updated) {
            setFiles(prev => prev.map(f => f.id === id ? updated : f));
        }
        return updated;
    }, [storage]);

    const deleteFile = useCallback(async (id: string) => {
        if (!storage) throw new Error('Storage not initialized');
        const deleted = await storage.deleteFile(id);
        if (deleted) {
            setFiles(prev => prev.filter(f => f.id !== id));
        }
        return deleted;
    }, [storage]);

    // AI Config operations
    const loadAIConfig = useCallback(async () => {
        if (!storage) return;
        const loaded = await storage.getAIConfig();
        setAIConfig(loaded);
    }, [storage]);

    const saveAIConfig = useCallback(async (config: AIConfig) => {
        if (!storage) throw new Error('Storage not initialized');
        const saved = await storage.setAIConfig(config);
        setAIConfig(saved);
        return saved;
    }, [storage]);

    // Chat operations
    const loadChatMessages = useCallback(async () => {
        if (!storage) return;
        const loaded = await storage.getChatMessages();
        setChatMessages(loaded);
    }, [storage]);

    const addChatMessage = useCallback(async (message: ChatMessage) => {
        if (!storage) throw new Error('Storage not initialized');
        const added = await storage.addChatMessage(message);
        setChatMessages(prev => [...prev, added]);
        return added;
    }, [storage]);

    const clearChatMessages = useCallback(async () => {
        if (!storage) return;
        await storage.clearChatMessages();
        setChatMessages([]);
    }, [storage]);

    // Theme operations
    const loadThemes = useCallback(async () => {
        if (!storage) return;
        const loaded = await storage.getThemes();
        setThemes(loaded);
    }, [storage]);

    const saveTheme = useCallback(async (theme: AppTheme) => {
        if (!storage) throw new Error('Storage not initialized');
        const saved = await storage.saveTheme(theme);
        setThemes(prev => {
            const existing = prev.findIndex(t => t.id === saved.id);
            if (existing >= 0) {
                const newThemes = [...prev];
                newThemes[existing] = saved;
                return newThemes;
            }
            return [...prev, saved];
        });
        return saved;
    }, [storage]);

    const deleteTheme = useCallback(async (id: string) => {
        if (!storage) throw new Error('Storage not initialized');
        const deleted = await storage.deleteTheme(id);
        if (deleted) {
            setThemes(prev => prev.filter(t => t.id !== id));
        }
        return deleted;
    }, [storage]);

    const setActiveThemeId = useCallback(async (id: string) => {
        if (!storage) return;
        await storage.setActiveThemeId(id);
        setActiveThemeIdState(id);
    }, [storage]);

    // Mistake operations
    const loadMistakes = useCallback(async () => {
        if (!storage) return;
        const loaded = await storage.getMistakes();
        setMistakes(loaded);
    }, [storage]);

    const addMistake = useCallback(async (record: MistakeRecord) => {
        if (!storage) throw new Error('Storage not initialized');
        const added = await storage.addMistake(record);
        setMistakes(prev => [...prev, added]);
        return added;
    }, [storage]);

    const deleteMistake = useCallback(async (id: string) => {
        if (!storage) throw new Error('Storage not initialized');
        const deleted = await storage.deleteMistake(id);
        if (deleted) {
            setMistakes(prev => prev.filter(m => m.id !== id));
        }
        return deleted;
    }, [storage]);

    // Export/Import
    const exportData = useCallback(async () => {
        if (!storage) throw new Error('Storage not initialized');
        return storage.exportAllData();
    }, [storage]);

    const importDataFn = useCallback(async (data: ExportData) => {
        if (!storage) throw new Error('Storage not initialized');
        const result = await storage.importData(data);

        // Reload all data after import
        await Promise.all([
            loadFiles(),
            loadAIConfig(),
            loadChatMessages(),
            loadThemes(),
            loadMistakes()
        ]);

        return result;
    }, [storage, loadFiles, loadAIConfig, loadChatMessages, loadThemes, loadMistakes]);

    return {
        isInitialized,
        isLoading,
        error,
        storage,

        files,
        loadFiles,
        createFile,
        updateFile,
        deleteFile,

        aiConfig,
        loadAIConfig,
        saveAIConfig,

        chatMessages,
        loadChatMessages,
        addChatMessage,
        clearChatMessages,

        themes,
        activeThemeId,
        loadThemes,
        saveTheme,
        deleteTheme,
        setActiveThemeId,

        mistakes,
        loadMistakes,
        addMistake,
        deleteMistake,

        exportData,
        importData: importDataFn
    };
}
