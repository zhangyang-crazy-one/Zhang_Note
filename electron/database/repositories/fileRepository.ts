import { getDatabase } from '../index.js';

export interface MarkdownFileRow {
    id: string;
    name: string;
    content: string;
    last_modified: number;
    file_path: string | null;
    is_local: number;
    created_at: number;
}

export interface MarkdownFile {
    id: string;
    name: string;
    content: string;
    lastModified: number;
    filePath?: string;
    isLocal?: boolean;
}

export class FileRepository {
    getAll(): MarkdownFile[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, name, content, last_modified, file_path, is_local, created_at
            FROM files
            ORDER BY last_modified DESC
        `).all() as MarkdownFileRow[];

        return rows.map(this.rowToFile);
    }

    getById(id: string): MarkdownFile | null {
        const db = getDatabase();
        const row = db.prepare(`
            SELECT id, name, content, last_modified, file_path, is_local, created_at
            FROM files
            WHERE id = ?
        `).get(id) as MarkdownFileRow | undefined;

        return row ? this.rowToFile(row) : null;
    }

    create(file: MarkdownFile): MarkdownFile {
        const db = getDatabase();
        const now = Date.now();

        db.prepare(`
            INSERT INTO files (id, name, content, last_modified, file_path, is_local, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            file.id,
            file.name,
            file.content,
            file.lastModified || now,
            file.filePath || null,
            file.isLocal ? 1 : 0,
            now
        );

        return this.getById(file.id)!;
    }

    update(id: string, updates: Partial<MarkdownFile>): MarkdownFile | null {
        const db = getDatabase();
        const existing = this.getById(id);

        if (!existing) {
            return null;
        }

        const fields: string[] = [];
        const values: (string | number | null)[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.content !== undefined) {
            fields.push('content = ?');
            values.push(updates.content);
        }
        if (updates.lastModified !== undefined) {
            fields.push('last_modified = ?');
            values.push(updates.lastModified);
        }
        if (updates.filePath !== undefined) {
            fields.push('file_path = ?');
            values.push(updates.filePath || null);
        }
        if (updates.isLocal !== undefined) {
            fields.push('is_local = ?');
            values.push(updates.isLocal ? 1 : 0);
        }

        if (fields.length === 0) {
            return existing;
        }

        values.push(id);
        db.prepare(`
            UPDATE files SET ${fields.join(', ')} WHERE id = ?
        `).run(...values);

        return this.getById(id);
    }

    delete(id: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM files WHERE id = ?').run(id);
        return result.changes > 0;
    }

    deleteAll(): void {
        const db = getDatabase();
        db.prepare('DELETE FROM files').run();
    }

    private rowToFile(row: MarkdownFileRow): MarkdownFile {
        return {
            id: row.id,
            name: row.name,
            content: row.content,
            lastModified: row.last_modified,
            filePath: row.file_path || undefined,
            isLocal: row.is_local === 1
        };
    }
}

export const fileRepository = new FileRepository();
