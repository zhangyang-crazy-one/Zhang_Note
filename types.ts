

export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  lastModified: number;
  handle?: FileSystemFileHandle; // For local file persistence
  isLocal?: boolean;
  path?: string; // Relative path for folder imports (e.g. "docs/v1/intro.md")
}

export enum ViewMode {
  Split = 'SPLIT',
  Editor = 'EDITOR',
  Preview = 'PREVIEW',
  Graph = 'GRAPH',
  Quiz = 'QUIZ',
  MindMap = 'MINDMAP'
}

export type ThemeType = 'dark' | 'light';

// Helper type for compatibility with old code
export type Theme = ThemeType; 

export interface ThemeColors {
  '--bg-main': string;
  '--bg-panel': string;
  '--bg-element': string;
  '--border-main': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--primary-500': string; // Main Brand Color
  '--primary-600': string; // Hover state / Deeper
  '--secondary-500': string; // Accent (Violet usually)

  // Neutral palette mappings for Tailwind Slate
  '--neutral-50': string;
  '--neutral-100': string;
  '--neutral-200': string;
  '--neutral-300': string; // Used for text in dark mode
  '--neutral-400': string;
  '--neutral-500': string;
  '--neutral-600': string;
  '--neutral-700': string;
  '--neutral-800': string; // Used for text in light mode
  '--neutral-900': string;

  // Font Configuration (Optional)
  '--font-primary'?: string;
  '--font-header'?: string;
  '--font-mono'?: string;

  // Font Size Configuration (Optional) - rem values
  '--font-size-base'?: string;      // Base font size (default: 1rem)
  '--font-size-sm'?: string;        // Small text
  '--font-size-lg'?: string;        // Large text
  '--font-size-h1'?: string;        // H1 heading
  '--font-size-h2'?: string;        // H2 heading
  '--font-size-h3'?: string;        // H3 heading
  '--line-height-base'?: string;    // Base line height

  // Index signature for additional custom properties
  [key: string]: string | undefined;
}

export interface AppTheme {
  id: string;
  name: string;
  type: ThemeType;
  colors: ThemeColors;
  isCustom?: boolean;
}

export interface AIState {
  isThinking: boolean;
  error: string | null;
  message: string | null;
}

export type AIProvider = 'gemini' | 'ollama' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  embeddingProvider?: AIProvider; // Independent embedding provider selection
  embeddingModel?: string; // Added embedding model selection
  embeddingBaseUrl?: string; // Base URL for embedding provider
  embeddingApiKey?: string; // API key for embedding provider
  compactModel?: string; // Model used for compacting context
  baseUrl?: string;
  apiKey?: string;
  temperature: number;
  language: 'en' | 'zh'; // Added language support
  enableWebSearch?: boolean; // Added Web Search support for Gemini
  mcpTools?: string; // JSON string of custom tool definitions
  customPrompts?: {
    polish?: string;
    expand?: string;
  };
}

export interface RAGResultData {
  fileName: string;
  count: number;
  maxScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  tool_call_id?: string;
  ragResults?: {
    totalChunks: number;
    queryTime: number;
    results: RAGResultData[];
  };
}

export interface GraphNode {
  id: string;
  label: string;
  group?: number;
  val?: number; 
}

export interface GraphLink {
  source: string;
  target: string;
  relationship?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Quiz System Types
export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string | string[]; // For auto-grading if applicable
  userAnswer?: string | string[];
  explanation?: string;
  isCorrect?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  isGraded: boolean;
  score?: number;
}

export interface MistakeRecord {
  id: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  timestamp: number;
  quizTitle?: string;
}

export interface RAGStats {
  totalFiles: number;
  indexedFiles: number;
  totalChunks: number;
  isIndexing: boolean;
}

export interface AppShortcut {
  id: string;
  label: string;
  keys: string; // e.g. "Ctrl+S", "Alt+Shift+P"
  actionId: string;
}

// Vector Store Types (for RAG system)
export interface VectorChunk {
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

export interface IndexMeta {
  fileId: string;
  lastModified: number;
  chunkCount: number;
  indexedAt: number;
  embeddingModel?: string;
  embeddingProvider?: string;
}