

import { MarkdownFile, AIConfig, RAGStats } from "../types";
import { getEmbedding } from "./aiService";

export interface Chunk {
  id: string;
  fileId: string;
  text: string;
  embedding?: number[];
  metadata: {
    start: number;
    end: number;
    fileName: string;
  };
}

// Search result with score for display
export interface SearchResult {
  chunk: Chunk;
  score: number;
}

// RAG search response with both formatted context and structured results
export interface RAGSearchResponse {
  context: string;           // Formatted context for AI
  results: SearchResult[];   // Structured results for UI display
  queryTime: number;         // Search time in ms
}

// Configuration
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const MAX_CHUNKS_PER_QUERY = 15; // Number of chunks to retrieve
const MIN_SIMILARITY_THRESHOLD = 0.3; // Only return chunks above this score

// --- Helper: Text Splitter ---
export const splitTextIntoChunks = (file: MarkdownFile): Chunk[] => {
    const text = file.content;
    const chunks: Chunk[] = [];
    
    // Normalized simple splitter
    const cleanText = text.replace(/\r\n/g, '\n');
    
    // First, split by Headers to respect document structure
    const sections = cleanText.split(/(?=^#{1,3}\s)/m);

    sections.forEach(section => {
        if (section.length <= CHUNK_SIZE) {
            if (section.trim()) {
                chunks.push({
                    id: `${file.id}-${chunks.length}`,
                    fileId: file.id,
                    text: section.trim(),
                    metadata: { start: 0, end: 0, fileName: file.name } // Simplified metadata
                });
            }
        } else {
            // Sub-chunk large sections
            for (let i = 0; i < section.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
                let end = Math.min(i + CHUNK_SIZE, section.length);
                // Try to break at newline or period
                if (end < section.length) {
                    const nextPeriod = section.indexOf('.', end - 50);
                    const nextNewline = section.indexOf('\n', end - 50);
                    if (nextPeriod !== -1 && nextPeriod < end + 50) end = nextPeriod + 1;
                    else if (nextNewline !== -1 && nextNewline < end + 50) end = nextNewline + 1;
                }
                
                const chunkText = section.substring(i, end).trim();
                if (chunkText) {
                    chunks.push({
                        id: `${file.id}-${chunks.length}`,
                        fileId: file.id,
                        text: chunkText,
                        metadata: { start: i, end: end, fileName: file.name }
                    });
                }
                if (end >= section.length) break;
            }
        }
    });

    return chunks;
};

// --- Math: Cosine Similarity ---
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// --- Class: Client-Side Vector Store ---
export class VectorStore {
    private chunks: Chunk[] = [];
    private fileSignatures: Map<string, number> = new Map(); // fileId -> lastModified
    private isProcessing = false;
    private lastSearchResponse: RAGSearchResponse | null = null;
    private initialized = false; // 标记是否已初始化

    constructor() {
        // 初始化会在 initialize() 异步方法中进行
    }

    /**
     * 检测是否在 Electron 环境
     */
    private isElectron(): boolean {
        return typeof window !== 'undefined' &&
               window.electronAPI?.db?.vectors !== undefined;
    }

    /**
     * 初始化向量存储（从数据库加载）
     * 必须在使用 VectorStore 前调用
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // 如果在 Electron 环境，从数据库加载向量
        if (this.isElectron()) {
            try {
                console.log('[VectorStore] Initializing from database...');

                // 加载所有向量块
                const chunks = await window.electronAPI.db.vectors.getAll();
                this.chunks = chunks;

                // 重建 fileSignatures Map
                const meta = await window.electronAPI.db.vectors.getMeta();
                meta.forEach((m: any) => {
                    this.fileSignatures.set(m.fileId, m.lastModified);
                });

                const stats = await window.electronAPI.db.vectors.getStats();
                console.log('[VectorStore] Initialized from database', {
                    totalFiles: stats.totalFiles,
                    totalChunks: stats.totalChunks
                });
            } catch (e) {
                console.warn('[VectorStore] Failed to load vectors from database:', e);
                // 出错时继续，使用空的内存存储
            }
        } else {
            console.log('[VectorStore] Running in Web mode, using in-memory storage');
        }

        this.initialized = true;
    }

    /**
     * 检查文件是否需要索引（支持异步数据库查询）
     */
    async needsIndexing(file: MarkdownFile): Promise<boolean> {
        // 在 Electron 环境下，查询数据库
        if (this.isElectron()) {
            try {
                return await window.electronAPI.db.vectors.needsIndexing(file.id, file.lastModified);
            } catch (e) {
                console.warn('[VectorStore] needsIndexing query failed, fallback to memory check:', e);
            }
        }

        // Web 模式或查询失败时，使用内存判断
        return this.fileSignatures.get(file.id) !== file.lastModified;
    }

    /**
     * 检查是否有文件需要索引（异步版本）
     */
    async hasFilesToIndex(files: MarkdownFile[]): Promise<boolean> {
        for (const file of files) {
            if (await this.needsIndexing(file)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 主索引方法（添加持久化支持）
     */
    async indexFile(file: MarkdownFile, config: AIConfig): Promise<boolean> {
        // 跳过已索引且有效的文件
        if (this.fileSignatures.get(file.id) === file.lastModified) {
            return false; // No update needed
        }

        this.isProcessing = true;
        try {
            // Remove old chunks
            this.chunks = this.chunks.filter(c => c.fileId !== file.id);

            // Create new chunks
            const newChunks = splitTextIntoChunks(file);

            // Embed chunks (Batching is ideal, but let's do sequential for safety with rate limits)
            let chunkIndex = 0;
            for (const chunk of newChunks) {
                try {
                    // Rate limit guard (simple delay)
                    await new Promise(r => setTimeout(r, 200));
                    chunk.embedding = await getEmbedding(chunk.text, config);

                    // 添加 chunkIndex 和 fileLastModified 属性
                    (chunk as any).chunkIndex = chunkIndex++;
                    (chunk as any).fileLastModified = file.lastModified;
                } catch (e) {
                    console.warn(`Failed to embed chunk in ${file.name}`, e);
                    // We keep the chunk without embedding? Or skip?
                    // Better to skip if vector search is the goal.
                }
            }

            // Filter out failed embeddings
            const validChunks = newChunks.filter(c => c.embedding && c.embedding.length > 0);
            this.chunks.push(...validChunks);
            this.fileSignatures.set(file.id, file.lastModified);

            // 持久化到数据库（Electron 模式）
            if (this.isElectron() && validChunks.length > 0) {
                try {
                    // 转换 chunks 为 VectorChunk 格式
                    const vectorChunks = validChunks.map((chunk, idx) => ({
                        id: chunk.id,
                        fileId: chunk.fileId,
                        chunkIndex: idx,
                        text: chunk.text,
                        embedding: chunk.embedding || null,
                        metadata: chunk.metadata,
                        fileLastModified: file.lastModified
                    }));

                    await window.electronAPI.db.vectors.save(
                        file.id,
                        vectorChunks,
                        file.lastModified,
                        config.model,
                        config.provider
                    );
                    console.log(`[VectorStore] Persisted ${validChunks.length} chunks for file ${file.name}`);
                } catch (e) {
                    console.error('[VectorStore] Failed to persist chunks to database:', e);
                    // 即使持久化失败，内存中的向量仍然可用
                }
            }

            return true;
        } finally {
            this.isProcessing = false;
        }
    }

    // Enhanced search with structured results
    async searchWithResults(query: string, config: AIConfig, topK: number = MAX_CHUNKS_PER_QUERY): Promise<RAGSearchResponse> {
        const startTime = Date.now();

        if (this.chunks.length === 0) {
            return { context: "", results: [], queryTime: 0 };
        }

        try {
            const queryEmbedding = await getEmbedding(query, config);
            if (!queryEmbedding || queryEmbedding.length === 0) {
                return { context: "", results: [], queryTime: Date.now() - startTime };
            }

            // Score chunks
            const scored = this.chunks.map(chunk => ({
                chunk,
                score: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : -1
            }));

            // Sort and Top K, filter by minimum threshold
            scored.sort((a, b) => b.score - a.score);
            const topResults = scored
                .filter(r => r.score >= MIN_SIMILARITY_THRESHOLD)
                .slice(0, topK);

            // Format context for AI
            const context = topResults
                .map(r => `[Source: ${r.chunk.metadata.fileName} (Score: ${r.score.toFixed(2)})]\n${r.chunk.text}`)
                .join("\n\n");

            const response: RAGSearchResponse = {
                context,
                results: topResults,
                queryTime: Date.now() - startTime
            };

            this.lastSearchResponse = response;
            return response;
        } catch (e) {
            console.error("Vector Search Failed", e);
            return { context: "", results: [], queryTime: Date.now() - startTime };
        }
    }

    // Legacy search method for backward compatibility
    async search(query: string, config: AIConfig, topK: number = MAX_CHUNKS_PER_QUERY): Promise<string> {
        const response = await this.searchWithResults(query, config, topK);
        return response.context;
    }

    // Get the last search response (for UI display)
    getLastSearchResponse(): RAGSearchResponse | null {
        return this.lastSearchResponse;
    }

    getStats(): RAGStats {
        return {
            totalFiles: this.fileSignatures.size,
            indexedFiles: this.fileSignatures.size, // Approximation
            totalChunks: this.chunks.length,
            isIndexing: this.isProcessing
        };
    }

    /**
     * 清空向量存储（同时清空数据库）
     */
    async clear(): Promise<void> {
        this.chunks = [];
        this.fileSignatures.clear();
        this.lastSearchResponse = null;

        // 清空数据库（Electron 模式）
        if (this.isElectron()) {
            try {
                await window.electronAPI.db.vectors.clear();
                console.log('[VectorStore] Database vectors cleared');
            } catch (e) {
                console.error('[VectorStore] Failed to clear database vectors:', e);
            }
        }
    }
}
