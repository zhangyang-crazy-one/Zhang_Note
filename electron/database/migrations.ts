import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * 数据库迁移接口
 */
export interface Migration {
    version: number;
    description: string;
    up: (db: Database.Database) => void;
    down?: (db: Database.Database) => void;
}

/**
 * 迁移管理器
 * 负责管理数据库 schema 版本和执行迁移
 */
export class MigrationManager {
    private db: Database.Database;
    private migrations: Migration[] = [];

    constructor(db: Database.Database) {
        this.db = db;
    }

    /**
     * 注册迁移
     */
    register(migration: Migration): void {
        this.migrations.push(migration);
        // 按版本号排序
        this.migrations.sort((a, b) => a.version - b.version);
    }

    /**
     * 批量注册迁移
     */
    registerAll(migrations: Migration[]): void {
        migrations.forEach(m => this.register(m));
    }

    /**
     * 获取当前数据库版本
     */
    getCurrentVersion(): number {
        try {
            const result = this.db.prepare(`
                SELECT MAX(version) as version FROM schema_version
            `).get() as { version: number | null };

            return result?.version || 0;
        } catch (error) {
            logger.warn('schema_version table not found, assuming version 0', error);
            return 0;
        }
    }

    /**
     * 设置数据库版本
     */
    private setVersion(version: number): void {
        this.db.prepare(`
            INSERT INTO schema_version (version, applied_at)
            VALUES (?, ?)
        `).run(version, Date.now());
    }

    /**
     * 执行所有待处理的迁移
     * @returns 成功执行的迁移数量
     */
    migrateToLatest(): number {
        const currentVersion = this.getCurrentVersion();
        const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

        if (pendingMigrations.length === 0) {
            logger.info('Database is up to date', { currentVersion });
            return 0;
        }

        logger.info('Pending migrations found', {
            currentVersion,
            pendingCount: pendingMigrations.length,
            targetVersion: pendingMigrations[pendingMigrations.length - 1].version
        });

        let appliedCount = 0;

        for (const migration of pendingMigrations) {
            try {
                this.applyMigration(migration);
                appliedCount++;
            } catch (error) {
                logger.error('Migration failed', {
                    version: migration.version,
                    description: migration.description,
                    error
                });
                throw new Error(`Migration ${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        logger.info('Migrations completed successfully', { appliedCount });
        return appliedCount;
    }

    /**
     * 应用单个迁移（在事务中执行）
     */
    private applyMigration(migration: Migration): void {
        logger.info('Applying migration', {
            version: migration.version,
            description: migration.description
        });

        // 使用事务确保原子性
        const transaction = this.db.transaction(() => {
            migration.up(this.db);
            this.setVersion(migration.version);
        });

        transaction();

        logger.info('Migration applied successfully', {
            version: migration.version
        });
    }

    /**
     * 回滚到指定版本（谨慎使用）
     * @param targetVersion 目标版本号
     */
    rollbackTo(targetVersion: number): void {
        const currentVersion = this.getCurrentVersion();

        if (targetVersion >= currentVersion) {
            logger.warn('Target version is not lower than current version', {
                currentVersion,
                targetVersion
            });
            return;
        }

        const migrationsToRollback = this.migrations
            .filter(m => m.version > targetVersion && m.version <= currentVersion)
            .sort((a, b) => b.version - a.version); // 倒序回滚

        for (const migration of migrationsToRollback) {
            if (!migration.down) {
                throw new Error(`Migration ${migration.version} does not support rollback`);
            }

            logger.warn('Rolling back migration', {
                version: migration.version,
                description: migration.description
            });

            const transaction = this.db.transaction(() => {
                migration.down!(this.db);
                this.db.prepare('DELETE FROM schema_version WHERE version = ?').run(migration.version);
            });

            transaction();
        }

        logger.info('Rollback completed', { targetVersion });
    }

    /**
     * 验证迁移完整性
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const versions = new Set<number>();

        // 检查版本号唯一性
        for (const migration of this.migrations) {
            if (versions.has(migration.version)) {
                errors.push(`Duplicate migration version: ${migration.version}`);
            }
            versions.add(migration.version);
        }

        // 检查版本号连续性（建议但不强制）
        const sortedVersions = Array.from(versions).sort((a, b) => a - b);
        for (let i = 1; i < sortedVersions.length; i++) {
            if (sortedVersions[i] - sortedVersions[i - 1] > 1) {
                logger.warn('Gap in migration versions', {
                    from: sortedVersions[i - 1],
                    to: sortedVersions[i]
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取迁移历史
     */
    getHistory(): { version: number; applied_at: number }[] {
        try {
            const rows = this.db.prepare(`
                SELECT version, applied_at
                FROM schema_version
                ORDER BY version ASC
            `).all() as { version: number; applied_at: number }[];

            return rows;
        } catch (error) {
            logger.warn('Failed to get migration history', error);
            return [];
        }
    }
}

/**
 * 预定义的迁移示例
 * 未来可以添加更多迁移
 */
export const migrations: Migration[] = [
    // Version 2: RAG 向量存储持久化
    {
        version: 2,
        description: 'Add vector_chunks table for RAG persistence',
        up: (db) => {
            db.exec(`
                -- 向量块存储表 (无外键约束，允许独立于files表存储)
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    id TEXT PRIMARY KEY,
                    file_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    embedding BLOB,
                    chunk_start INTEGER NOT NULL,
                    chunk_end INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    file_last_modified INTEGER NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    UNIQUE(file_id, chunk_index)
                );

                -- 索引: 按文件ID查询
                CREATE INDEX IF NOT EXISTS idx_chunks_file ON vector_chunks(file_id);
                -- 索引: 按文件ID和修改时间查询(用于检查是否需要重新索引)
                CREATE INDEX IF NOT EXISTS idx_chunks_file_modified ON vector_chunks(file_id, file_last_modified);

                -- 向量索引元数据表 (无外键约束)
                CREATE TABLE IF NOT EXISTS vector_index_meta (
                    file_id TEXT PRIMARY KEY,
                    last_modified INTEGER NOT NULL,
                    chunk_count INTEGER NOT NULL,
                    indexed_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    embedding_model TEXT,
                    embedding_provider TEXT
                );
            `);
            logger.info('RAG vector persistence tables created successfully');
        },
        down: (db) => {
            db.exec(`
                DROP TABLE IF EXISTS vector_index_meta;
                DROP TABLE IF EXISTS vector_chunks;
            `);
            logger.warn('RAG vector persistence tables dropped');
        }
    },
    // Version 3: 修复外键约束问题 - 重建无外键的向量表
    {
        version: 3,
        description: 'Rebuild vector tables without foreign key constraints',
        up: (db) => {
            db.exec(`
                -- 删除旧表（如果存在）
                DROP TABLE IF EXISTS vector_chunks;
                DROP TABLE IF EXISTS vector_index_meta;

                -- 重建向量块存储表（无外键约束）
                CREATE TABLE vector_chunks (
                    id TEXT PRIMARY KEY,
                    file_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    embedding BLOB,
                    chunk_start INTEGER NOT NULL,
                    chunk_end INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    file_last_modified INTEGER NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    UNIQUE(file_id, chunk_index)
                );

                -- 索引
                CREATE INDEX idx_chunks_file ON vector_chunks(file_id);
                CREATE INDEX idx_chunks_file_modified ON vector_chunks(file_id, file_last_modified);

                -- 重建向量索引元数据表（无外键约束）
                CREATE TABLE vector_index_meta (
                    file_id TEXT PRIMARY KEY,
                    last_modified INTEGER NOT NULL,
                    chunk_count INTEGER NOT NULL,
                    indexed_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                    embedding_model TEXT,
                    embedding_provider TEXT
                );
            `);
            logger.info('Vector tables rebuilt without foreign key constraints');
        },
        down: (db) => {
            // Version 3 down 不做任何事，因为版本2也能处理
            logger.warn('Version 3 rollback - no action needed');
        }
    }
];
