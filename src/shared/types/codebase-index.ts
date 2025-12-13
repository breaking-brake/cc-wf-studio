/**
 * Claude Code Workflow Studio - Codebase Index Types
 *
 * Types for local codebase indexing using BM25 full-text search (Orama)
 * Based on: GitHub Issue #265
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for codebase indexing operations
 */
export type CodebaseIndexErrorCode =
  | 'INDEX_FILE_READ_ERROR'
  | 'INDEX_DATABASE_ERROR'
  | 'INDEX_MEMORY_EXCEEDED'
  | 'INDEX_CANCELLED'
  | 'INDEX_WORKSPACE_NOT_FOUND'
  | 'SEARCH_INDEX_NOT_FOUND'
  | 'SEARCH_QUERY_EMPTY'
  | 'SEARCH_DATABASE_ERROR';

// ============================================================================
// Index Configuration
// ============================================================================

/**
 * Options for configuring the indexing process
 */
export interface IndexOptions {
  /** Number of files to process in a single batch (default: 50) */
  batchSize: number;
  /** Size of each content chunk in characters (default: 1000) */
  chunkSize: number;
  /** Overlap between chunks in characters (default: 100) */
  chunkOverlap: number;
  /** Maximum file size to index in KB (default: 500) */
  maxFileSizeKB: number;
  /** Glob patterns to exclude from indexing (default: node_modules, .git, etc.) */
  excludePatterns: string[];
  /** File extensions to include in indexing (default: common code extensions) */
  includeExtensions: string[];
}

/**
 * Default indexing options
 */
export const DEFAULT_INDEX_OPTIONS: IndexOptions = {
  batchSize: 50,
  chunkSize: 1000,
  chunkOverlap: 100,
  maxFileSizeKB: 500,
  excludePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.vscode/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.min.css',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
  ],
  includeExtensions: [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.md',
    '.mdx',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.kt',
    '.swift',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.rb',
    '.php',
    '.vue',
    '.svelte',
    '.astro',
    '.html',
    '.css',
    '.scss',
    '.less',
    '.yaml',
    '.yml',
    '.toml',
    '.sh',
    '.bash',
    '.zsh',
    '.sql',
  ],
};

// ============================================================================
// Document Types
// ============================================================================

/**
 * Code document stored in the index
 * Note: No vector field - using BM25 full-text search only
 */
export interface CodeDocument {
  /** Unique document ID (filePath:chunkIndex) */
  id: string;
  /** Absolute path to the source file */
  filePath: string;
  /** Content of the chunk */
  content: string;
  /** Programming language (determined from file extension) */
  language: string;
  /** Starting line number in the original file */
  startLine: number;
  /** Ending line number in the original file */
  endLine: number;
  /** Index of this chunk within the file (0-based) */
  chunkIndex: number;
  /** Timestamp when the document was last updated (Unix ms) */
  updatedAt: number;
}

// ============================================================================
// Index Status
// ============================================================================

/**
 * Current state of the index
 */
export type IndexState = 'idle' | 'building' | 'ready' | 'error';

/**
 * Status information about the codebase index
 */
export interface IndexStatus {
  /** Current state of the index */
  state: IndexState;
  /** Total number of documents in the index */
  documentCount: number;
  /** Total number of indexed files */
  fileCount: number;
  /** Timestamp of last successful index build (ISO 8601) */
  lastBuildTime: string | null;
  /** Path to the persisted index file */
  indexFilePath: string | null;
  /** Error message if state is 'error' */
  errorMessage?: string;
}

// ============================================================================
// Index Progress
// ============================================================================

/**
 * Progress information during index building
 */
export interface IndexProgress {
  /** Current phase of indexing */
  phase: 'scanning' | 'indexing' | 'persisting';
  /** Number of files processed so far */
  processedFiles: number;
  /** Total number of files to process */
  totalFiles: number;
  /** Current file being processed */
  currentFile?: string;
  /** Progress percentage (0-100) */
  percentage: number;
}

// ============================================================================
// Search Options
// ============================================================================

/**
 * Options for searching the codebase index
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum relevance score threshold (0-1, default: 0) */
  threshold?: number;
  /** Filter by specific file extensions */
  filterExtensions?: string[];
  /** Filter by specific file paths (glob patterns) */
  filterPaths?: string[];
  /** Properties to search in (default: ['content', 'filePath']) */
  properties?: Array<'content' | 'filePath'>;
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  limit: 10,
  threshold: 0,
  filterExtensions: [],
  filterPaths: [],
  properties: ['content', 'filePath'],
};

// ============================================================================
// Search Results
// ============================================================================

/**
 * A single search result
 */
export interface SearchResult {
  /** Document that matched the query */
  document: CodeDocument;
  /** Relevance score (0-1, higher is more relevant) */
  score: number;
}

/**
 * Complete search response
 */
export interface SearchResponse {
  /** Array of search results */
  results: SearchResult[];
  /** Total number of matches (before limit applied) */
  totalMatches: number;
  /** Search execution time in milliseconds */
  executionTimeMs: number;
  /** The query that was searched */
  query: string;
}

// ============================================================================
// Build Results
// ============================================================================

/**
 * Result of an index build operation
 */
export interface IndexBuildResult {
  /** Whether the build succeeded */
  success: boolean;
  /** Number of documents indexed */
  documentCount: number;
  /** Number of files indexed */
  fileCount: number;
  /** Total build time in milliseconds */
  buildTimeMs: number;
  /** Path to the persisted index file */
  indexFilePath: string | null;
  /** Error message if build failed */
  errorMessage?: string;
  /** Error code if build failed */
  errorCode?: CodebaseIndexErrorCode;
}
