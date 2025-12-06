import { getDatabase } from '../index.js';

export interface ThemeRow {
    id: string;
    name: string;
    type: string;
    colors: string;  // JSON string
    is_custom: number;
    is_builtin: number;
    created_at: number;
}

// ThemeColors with index signature for flexibility
export interface ThemeColors {
    '--bg-main': string;
    '--bg-panel': string;
    '--bg-element': string;
    '--border-main': string;
    '--text-primary': string;
    '--text-secondary': string;
    '--primary-500': string;
    '--primary-600': string;
    '--secondary-500': string;
    '--neutral-50': string;
    '--neutral-100': string;
    '--neutral-200': string;
    '--neutral-300': string;
    '--neutral-400': string;
    '--neutral-500': string;
    '--neutral-600': string;
    '--neutral-700': string;
    '--neutral-800': string;
    '--neutral-900': string;
    // Font configuration
    '--font-primary'?: string;
    '--font-header'?: string;
    '--font-mono'?: string;
    // Font size configuration
    '--font-size-base'?: string;
    '--font-size-sm'?: string;
    '--font-size-lg'?: string;
    '--font-size-h1'?: string;
    '--font-size-h2'?: string;
    '--font-size-h3'?: string;
    '--line-height-base'?: string;
    [key: string]: string | undefined;
}

export interface AppTheme {
    id: string;
    name: string;
    type: 'dark' | 'light';
    colors: ThemeColors;
    isCustom?: boolean;
}

export class ThemeRepository {
    getAll(): AppTheme[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, name, type, colors, is_custom, is_builtin, created_at
            FROM themes
            ORDER BY is_builtin DESC, created_at ASC
        `).all() as ThemeRow[];

        return rows.map(this.rowToTheme);
    }

    getById(id: string): AppTheme | null {
        const db = getDatabase();
        const row = db.prepare(`
            SELECT id, name, type, colors, is_custom, is_builtin, created_at
            FROM themes
            WHERE id = ?
        `).get(id) as ThemeRow | undefined;

        return row ? this.rowToTheme(row) : null;
    }

    save(theme: AppTheme): AppTheme {
        const db = getDatabase();
        const now = Date.now();
        const colorsJson = JSON.stringify(theme.colors);

        db.prepare(`
            INSERT OR REPLACE INTO themes (id, name, type, colors, is_custom, is_builtin, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        `).run(
            theme.id,
            theme.name,
            theme.type,
            colorsJson,
            theme.isCustom ? 1 : 0,
            now
        );

        return this.getById(theme.id)!;
    }

    delete(id: string): boolean {
        const db = getDatabase();
        // Don't allow deleting built-in themes
        const result = db.prepare('DELETE FROM themes WHERE id = ? AND is_builtin = 0').run(id);
        return result.changes > 0;
    }

    initializeBuiltinThemes(themes: AppTheme[]): void {
        const db = getDatabase();
        const now = Date.now();

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO themes (id, name, type, colors, is_custom, is_builtin, created_at)
            VALUES (?, ?, ?, ?, 0, 1, ?)
        `);

        for (const theme of themes) {
            stmt.run(
                theme.id,
                theme.name,
                theme.type,
                JSON.stringify(theme.colors),
                now
            );
        }
    }

    private rowToTheme(row: ThemeRow): AppTheme {
        return {
            id: row.id,
            name: row.name,
            type: row.type as 'dark' | 'light',
            colors: JSON.parse(row.colors) as ThemeColors,
            isCustom: row.is_custom === 1
        };
    }
}

export const themeRepository = new ThemeRepository();
