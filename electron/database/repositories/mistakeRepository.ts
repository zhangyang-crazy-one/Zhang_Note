import { getDatabase } from '../index.js';

export interface MistakeRecordRow {
    id: string;
    question: string;
    user_answer: string;
    correct_answer: string;
    explanation: string | null;
    timestamp: number;
    quiz_title: string | null;
    file_id: string | null;
}

export interface MistakeRecord {
    id: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
    timestamp: number;
    quizTitle?: string;
    fileId?: string;
}

export class MistakeRepository {
    getAll(): MistakeRecord[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, question, user_answer, correct_answer, explanation, timestamp, quiz_title, file_id
            FROM mistake_records
            ORDER BY timestamp DESC
        `).all() as MistakeRecordRow[];

        return rows.map(this.rowToRecord);
    }

    getByFileId(fileId: string): MistakeRecord[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, question, user_answer, correct_answer, explanation, timestamp, quiz_title, file_id
            FROM mistake_records
            WHERE file_id = ?
            ORDER BY timestamp DESC
        `).all(fileId) as MistakeRecordRow[];

        return rows.map(this.rowToRecord);
    }

    add(record: MistakeRecord): MistakeRecord {
        const db = getDatabase();

        db.prepare(`
            INSERT INTO mistake_records (id, question, user_answer, correct_answer, explanation, timestamp, quiz_title, file_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            record.id,
            record.question,
            record.userAnswer,
            record.correctAnswer,
            record.explanation || null,
            record.timestamp,
            record.quizTitle || null,
            record.fileId || null
        );

        return record;
    }

    delete(id: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM mistake_records WHERE id = ?').run(id);
        return result.changes > 0;
    }

    deleteAll(): void {
        const db = getDatabase();
        db.prepare('DELETE FROM mistake_records').run();
    }

    private rowToRecord(row: MistakeRecordRow): MistakeRecord {
        return {
            id: row.id,
            question: row.question,
            userAnswer: row.user_answer,
            correctAnswer: row.correct_answer,
            explanation: row.explanation || undefined,
            timestamp: row.timestamp,
            quizTitle: row.quiz_title || undefined,
            fileId: row.file_id || undefined
        };
    }
}

export const mistakeRepository = new MistakeRepository();
