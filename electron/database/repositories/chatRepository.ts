import { getDatabase } from '../index.js';

export interface ChatMessageRow {
    id: string;
    role: string;
    content: string;
    timestamp: number;
    conversation_id: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    tool_call_id?: string;
}

export class ChatRepository {
    getAll(conversationId: string = 'default'): ChatMessage[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, role, content, timestamp, conversation_id
            FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY timestamp ASC
        `).all(conversationId) as ChatMessageRow[];

        return rows.map(this.rowToMessage);
    }

    add(message: ChatMessage, conversationId: string = 'default'): ChatMessage {
        const db = getDatabase();

        db.prepare(`
            INSERT INTO chat_messages (id, role, content, timestamp, conversation_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            message.id,
            message.role,
            message.content,
            message.timestamp,
            conversationId
        );

        return message;
    }

    clear(conversationId: string = 'default'): void {
        const db = getDatabase();
        db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(conversationId);
    }

    clearAll(): void {
        const db = getDatabase();
        db.prepare('DELETE FROM chat_messages').run();
    }

    deleteById(id: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
        return result.changes > 0;
    }

    getConversationIds(): string[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT DISTINCT conversation_id FROM chat_messages
        `).all() as { conversation_id: string }[];

        return rows.map(row => row.conversation_id);
    }

    private rowToMessage(row: ChatMessageRow): ChatMessage {
        return {
            id: row.id,
            role: row.role as 'user' | 'assistant' | 'system' | 'tool',
            content: row.content,
            timestamp: row.timestamp
        };
    }
}

export const chatRepository = new ChatRepository();
