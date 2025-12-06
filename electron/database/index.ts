import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePath, ensureUserDataDir } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { MigrationManager, migrations } from './migrations.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database
 */
export function initializeDatabase(): Database.Database {
    if (db) {
        return db;
    }

    ensureUserDataDir();
    const dbPath = getDatabasePath();

    logger.info('Initializing database', { path: dbPath });

    try {
        db = new Database(dbPath);

        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        // Enable WAL mode for better concurrent access
        db.pragma('journal_mode = WAL');

        // Run schema
        runSchema(db);

        // Run migrations
        runMigrations(db);

        logger.info('Database initialized successfully');
        return db;
    } catch (error) {
        logger.error('Failed to initialize database', error);
        throw error;
    }
}

/**
 * Run the schema SQL to create tables
 */
function runSchema(database: Database.Database): void {
    const schemaPath = path.join(__dirname, 'schema.sql');

    // In production, schema.sql is bundled, so we need to handle both cases
    let schema: string;

    if (fs.existsSync(schemaPath)) {
        schema = fs.readFileSync(schemaPath, 'utf-8');
    } else {
        // Fallback: embedded schema for production builds
        schema = getEmbeddedSchema();
    }

    database.exec(schema);
    logger.debug('Schema applied successfully');
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
    try {
        const migrationManager = new MigrationManager(database);

        // Register all migrations
        migrationManager.registerAll(migrations);

        // Validate migrations
        const validation = migrationManager.validate();
        if (!validation.valid) {
            logger.error('Migration validation failed', { errors: validation.errors });
            throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
        }

        // Run migrations to latest version
        const appliedCount = migrationManager.migrateToLatest();

        if (appliedCount > 0) {
            logger.info(`Applied ${appliedCount} database migrations`);
        }
    } catch (error) {
        logger.error('Failed to run migrations', error);
        throw error;
    }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        logger.info('Database connection closed');
    }
}

/**
 * Embedded schema for production builds where schema.sql might not be accessible
 */
function getEmbeddedSchema(): string {
    return `
-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Markdown files storage
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    last_modified INTEGER NOT NULL,
    file_path TEXT,
    is_local INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE INDEX IF NOT EXISTS idx_files_modified ON files(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);

-- AI Configuration (singleton pattern)
CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT 'gemini',
    model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    base_url TEXT,
    api_key_encrypted TEXT,
    temperature REAL DEFAULT 0.7,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'zh')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    conversation_id TEXT DEFAULT 'default'
);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_messages(conversation_id);

-- Themes
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dark', 'light')),
    colors TEXT NOT NULL,
    is_custom INTEGER DEFAULT 0,
    is_builtin INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Mistake records
CREATE TABLE IF NOT EXISTS mistake_records (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    timestamp INTEGER NOT NULL,
    quiz_title TEXT,
    file_id TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_mistakes_timestamp ON mistake_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mistakes_file ON mistake_records(file_id);

-- Insert default AI config if not exists
INSERT OR IGNORE INTO ai_config (id, provider, model, temperature, language)
VALUES (1, 'gemini', 'gemini-2.5-flash', 0.7, 'en');

-- Insert schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`;
}
