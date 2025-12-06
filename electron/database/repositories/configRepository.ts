import { getDatabase } from '../index.js';

export type AIProvider = 'gemini' | 'ollama' | 'openai';

export interface AIConfigRow {
    id: number;
    provider: string;
    model: string;
    base_url: string | null;
    api_key_encrypted: string | null;
    temperature: number;
    language: string;
    updated_at: number;
}

export interface AIConfig {
    provider: AIProvider;
    model: string;
    baseUrl?: string;
    apiKey?: string;
    temperature: number;
    language: 'en' | 'zh';
}

export class ConfigRepository {
    getAIConfig(): AIConfig {
        const db = getDatabase();
        const row = db.prepare(`
            SELECT id, provider, model, base_url, api_key_encrypted, temperature, language, updated_at
            FROM ai_config
            WHERE id = 1
        `).get() as AIConfigRow | undefined;

        if (!row) {
            // Return default config
            return {
                provider: 'gemini',
                model: 'gemini-2.5-flash',
                temperature: 0.7,
                language: 'en'
            };
        }

        return this.rowToConfig(row);
    }

    setAIConfig(config: AIConfig): AIConfig {
        const db = getDatabase();
        const now = Date.now();

        db.prepare(`
            INSERT OR REPLACE INTO ai_config (id, provider, model, base_url, api_key_encrypted, temperature, language, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            config.provider,
            config.model,
            config.baseUrl || null,
            config.apiKey || null,  // TODO: Encrypt in production
            config.temperature,
            config.language,
            now
        );

        return this.getAIConfig();
    }

    private rowToConfig(row: AIConfigRow): AIConfig {
        return {
            provider: row.provider as AIProvider,
            model: row.model,
            baseUrl: row.base_url || undefined,
            apiKey: row.api_key_encrypted || undefined,  // TODO: Decrypt in production
            temperature: row.temperature,
            language: row.language as 'en' | 'zh'
        };
    }
}

export class SettingsRepository {
    get(key: string): string | null {
        const db = getDatabase();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row?.value || null;
    }

    set(key: string, value: string): void {
        const db = getDatabase();
        const now = Date.now();

        db.prepare(`
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
        `).run(key, value, now);
    }

    delete(key: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
        return result.changes > 0;
    }

    getAll(): Record<string, string> {
        const db = getDatabase();
        const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const result: Record<string, string> = {};
        for (const row of rows) {
            result[row.key] = row.value;
        }
        return result;
    }
}

export const configRepository = new ConfigRepository();
export const settingsRepository = new SettingsRepository();
