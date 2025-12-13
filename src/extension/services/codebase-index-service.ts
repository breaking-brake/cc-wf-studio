/**
 * Claude Code Workflow Studio - Codebase Index Service
 *
 * Manages codebase indexing for BM25 full-text search.
 * Based on: GitHub Issue #265
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { minimatch } from 'minimatch';
import * as vscode from 'vscode';
import type {
  CodeDocument,
  IndexBuildResult,
  IndexOptions,
  IndexProgress,
  IndexState,
  IndexStatus,
  SearchOptions,
  SearchResponse,
} from '../../shared/types/codebase-index';
import { DEFAULT_INDEX_OPTIONS } from '../../shared/types/codebase-index';
import type { VectorSearchService } from './vector-search-service';
import { disposeVectorSearchService, getVectorSearchService } from './vector-search-service';

/**
 * Output channel for logging
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Get or create the output channel
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(
      'Claude Code Workflow Studio - Codebase Index'
    );
  }
  return outputChannel;
}

/**
 * Log message to output channel
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  getOutputChannel().appendLine(`[${timestamp}] ${message}`);
}

/**
 * Extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sh': 'shellscript',
  '.bash': 'shellscript',
  '.zsh': 'shellscript',
  '.sql': 'sql',
};

/**
 * Get language from file extension
 */
function getLanguageFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

/**
 * Codebase Index Service
 */
class CodebaseIndexService {
  private vectorSearchService: VectorSearchService;
  private workspaceRoot: string | null = null;
  private indexState: IndexState = 'idle';
  private lastBuildTime: string | null = null;
  private indexFilePath: string | null = null;
  private fileCount: number = 0;
  private isCancelled: boolean = false;
  private progressCallback: ((progress: IndexProgress) => void) | null = null;
  private options: IndexOptions = DEFAULT_INDEX_OPTIONS;

  constructor() {
    this.vectorSearchService = getVectorSearchService();
    log('CodebaseIndexService initialized');
  }

  /**
   * Initialize the service with a workspace root
   */
  async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    await this.vectorSearchService.initialize();

    // Try to restore existing index
    const indexPath = this.getDefaultIndexPath();
    if (fs.existsSync(indexPath)) {
      const restored = await this.vectorSearchService.restoreFromFile(indexPath);
      if (restored) {
        this.indexState = 'ready';
        this.indexFilePath = indexPath;
        const docCount = await this.vectorSearchService.getDocumentCount();
        log(`Restored existing index: ${docCount} documents`);
      }
    }

    log(`CodebaseIndexService initialized for workspace: ${workspaceRoot}`);
  }

  /**
   * Get the default index file path
   */
  private getDefaultIndexPath(): string {
    if (!this.workspaceRoot) {
      throw new Error('Workspace root not set');
    }
    return path.join(this.workspaceRoot, '.vscode', 'codebase-index.json');
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ((progress: IndexProgress) => void) | null): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: IndexProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Scan workspace for files to index
   */
  private async scanFiles(): Promise<string[]> {
    const workspaceRoot = this.workspaceRoot;
    if (!workspaceRoot) {
      throw new Error('Workspace root not set');
    }

    log('Scanning workspace for files...');
    const files: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      if (this.isCancelled) return;

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (this.isCancelled) return;

          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(workspaceRoot, fullPath);

          // Check if path matches any exclude pattern
          const shouldExclude = this.options.excludePatterns.some((pattern) =>
            minimatch(relativePath, pattern, { dot: true })
          );

          if (shouldExclude) {
            continue;
          }

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (this.options.includeExtensions.includes(ext)) {
              // Check file size
              try {
                const stats = await fs.promises.stat(fullPath);
                const fileSizeKB = stats.size / 1024;
                if (fileSizeKB <= this.options.maxFileSizeKB) {
                  files.push(fullPath);
                } else {
                  log(`Skipping large file: ${relativePath} (${fileSizeKB.toFixed(2)} KB)`);
                }
              } catch {
                // Skip files that can't be stat'd
              }
            }
          }
        }
      } catch (error) {
        log(`Error scanning directory ${dir}: ${error}`);
      }
    };

    await scanDirectory(this.workspaceRoot);
    log(`Found ${files.length} files to index`);
    return files;
  }

  /**
   * Split content into chunks with overlap
   */
  private chunkContent(
    content: string,
    _filePath: string
  ): Array<{ content: string; startLine: number; endLine: number; chunkIndex: number }> {
    const chunks: Array<{
      content: string;
      startLine: number;
      endLine: number;
      chunkIndex: number;
    }> = [];

    const lines = content.split('\n');
    const { chunkSize, chunkOverlap } = this.options;

    let currentChunk: string[] = [];
    let currentLength = 0;
    let startLine = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline

      if (currentLength + lineLength > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.join('\n'),
          startLine: startLine + 1, // 1-based line numbers
          endLine: startLine + currentChunk.length,
          chunkIndex,
        });
        chunkIndex++;

        // Start new chunk with overlap
        const overlapLines = Math.floor(chunkOverlap / (currentLength / currentChunk.length));
        const overlapStart = Math.max(0, currentChunk.length - overlapLines);
        currentChunk = currentChunk.slice(overlapStart);
        startLine = startLine + overlapStart;
        currentLength = currentChunk.join('\n').length;
      }

      currentChunk.push(line);
      currentLength += lineLength;
    }

    // Save last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLine: startLine + 1,
        endLine: startLine + currentChunk.length,
        chunkIndex,
      });
    }

    return chunks;
  }

  /**
   * Build the index
   */
  async buildIndex(options?: Partial<IndexOptions>): Promise<IndexBuildResult> {
    const workspaceRoot = this.workspaceRoot;
    if (!workspaceRoot) {
      return {
        success: false,
        documentCount: 0,
        fileCount: 0,
        buildTimeMs: 0,
        indexFilePath: null,
        errorMessage: 'Workspace not initialized',
        errorCode: 'INDEX_WORKSPACE_NOT_FOUND',
      };
    }

    if (this.indexState === 'building') {
      return {
        success: false,
        documentCount: 0,
        fileCount: 0,
        buildTimeMs: 0,
        indexFilePath: null,
        errorMessage: 'Index build already in progress',
        errorCode: 'INDEX_DATABASE_ERROR',
      };
    }

    const startTime = Date.now();
    this.indexState = 'building';
    this.isCancelled = false;
    this.options = { ...DEFAULT_INDEX_OPTIONS, ...options };

    try {
      // Clear existing index
      await this.vectorSearchService.clearDatabase();

      // Phase 1: Scanning
      this.reportProgress({
        phase: 'scanning',
        processedFiles: 0,
        totalFiles: 0,
        percentage: 0,
      });

      const files = await this.scanFiles();

      if (this.isCancelled) {
        this.indexState = 'idle';
        return {
          success: false,
          documentCount: 0,
          fileCount: 0,
          buildTimeMs: Date.now() - startTime,
          indexFilePath: null,
          errorMessage: 'Index build cancelled',
          errorCode: 'INDEX_CANCELLED',
        };
      }

      // Phase 2: Indexing
      const totalFiles = files.length;
      let processedFiles = 0;
      let totalDocuments = 0;
      const allDocuments: CodeDocument[] = [];

      for (let i = 0; i < files.length; i += this.options.batchSize) {
        if (this.isCancelled) {
          this.indexState = 'idle';
          return {
            success: false,
            documentCount: totalDocuments,
            fileCount: processedFiles,
            buildTimeMs: Date.now() - startTime,
            indexFilePath: null,
            errorMessage: 'Index build cancelled',
            errorCode: 'INDEX_CANCELLED',
          };
        }

        const batch = files.slice(i, i + this.options.batchSize);
        const batchDocuments: CodeDocument[] = [];

        for (const filePath of batch) {
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const language = getLanguageFromExtension(filePath);
            const relativePath = path.relative(workspaceRoot, filePath);
            const chunks = this.chunkContent(content, filePath);

            for (const chunk of chunks) {
              const doc: CodeDocument = {
                id: `${relativePath}:${chunk.chunkIndex}`,
                filePath: relativePath,
                content: chunk.content,
                language,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                chunkIndex: chunk.chunkIndex,
                updatedAt: Date.now(),
              };
              batchDocuments.push(doc);
            }
          } catch (error) {
            log(`Error processing file ${filePath}: ${error}`);
          }

          processedFiles++;
        }

        if (batchDocuments.length > 0) {
          allDocuments.push(...batchDocuments);
          totalDocuments += batchDocuments.length;
        }

        this.reportProgress({
          phase: 'indexing',
          processedFiles,
          totalFiles,
          currentFile: batch[batch.length - 1],
          percentage: Math.round((processedFiles / totalFiles) * 90), // 0-90% for indexing
        });
      }

      // Insert all documents at once
      if (allDocuments.length > 0) {
        await this.vectorSearchService.insertDocuments(allDocuments);
      }

      // Phase 3: Persisting
      this.reportProgress({
        phase: 'persisting',
        processedFiles: totalFiles,
        totalFiles,
        percentage: 95,
      });

      const indexPath = this.getDefaultIndexPath();
      const indexDir = path.dirname(indexPath);
      if (!fs.existsSync(indexDir)) {
        await fs.promises.mkdir(indexDir, { recursive: true });
      }

      await this.vectorSearchService.persistToFile(indexPath);

      // Complete
      this.indexState = 'ready';
      this.lastBuildTime = new Date().toISOString();
      this.indexFilePath = indexPath;
      this.fileCount = totalFiles;

      this.reportProgress({
        phase: 'persisting',
        processedFiles: totalFiles,
        totalFiles,
        percentage: 100,
      });

      const buildTimeMs = Date.now() - startTime;
      log(
        `Index build completed: ${totalDocuments} documents from ${totalFiles} files in ${buildTimeMs}ms`
      );

      return {
        success: true,
        documentCount: totalDocuments,
        fileCount: totalFiles,
        buildTimeMs,
        indexFilePath: indexPath,
      };
    } catch (error) {
      this.indexState = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Index build failed: ${errorMessage}`);

      return {
        success: false,
        documentCount: 0,
        fileCount: 0,
        buildTimeMs: Date.now() - startTime,
        indexFilePath: null,
        errorMessage,
        errorCode: 'INDEX_DATABASE_ERROR',
      };
    }
  }

  /**
   * Cancel the current index build
   */
  cancelBuild(): void {
    if (this.indexState === 'building') {
      this.isCancelled = true;
      log('Index build cancellation requested');
    }
  }

  /**
   * Clear the index
   */
  async clearIndex(): Promise<void> {
    await this.vectorSearchService.clearDatabase();
    this.indexState = 'idle';
    this.lastBuildTime = null;
    this.fileCount = 0;

    // Delete persisted index file
    if (this.indexFilePath && fs.existsSync(this.indexFilePath)) {
      try {
        await fs.promises.unlink(this.indexFilePath);
        log(`Deleted index file: ${this.indexFilePath}`);
      } catch (error) {
        log(`Failed to delete index file: ${error}`);
      }
    }
    this.indexFilePath = null;

    log('Index cleared');
  }

  /**
   * Search the codebase
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (this.indexState !== 'ready') {
      throw new Error('Index not ready. Build the index first.');
    }

    return this.vectorSearchService.searchFullText(query, options);
  }

  /**
   * Get the current index status
   */
  async getStatus(): Promise<IndexStatus> {
    const documentCount = await this.vectorSearchService.getDocumentCount();

    return {
      state: this.indexState,
      documentCount,
      fileCount: this.fileCount,
      lastBuildTime: this.lastBuildTime,
      indexFilePath: this.indexFilePath,
      errorMessage: this.indexState === 'error' ? 'Index build failed' : undefined,
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.workspaceRoot = null;
    this.indexState = 'idle';
    this.progressCallback = null;
    disposeVectorSearchService();
    log('CodebaseIndexService disposed');
  }
}

/**
 * Singleton instance
 */
let codebaseIndexServiceInstance: CodebaseIndexService | null = null;

/**
 * Initialize the codebase index service
 */
export async function initializeCodebaseIndexService(
  _context: vscode.ExtensionContext
): Promise<CodebaseIndexService | null> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceRoot) {
    log('No workspace folder found, skipping codebase index initialization');
    return null;
  }

  if (!codebaseIndexServiceInstance) {
    codebaseIndexServiceInstance = new CodebaseIndexService();
    await codebaseIndexServiceInstance.initialize(workspaceRoot);
  }

  return codebaseIndexServiceInstance;
}

/**
 * Get the codebase index service instance
 */
export function getCodebaseIndexService(): CodebaseIndexService | null {
  return codebaseIndexServiceInstance;
}

/**
 * Dispose of the codebase index service
 */
export function disposeCodebaseIndexService(): void {
  if (codebaseIndexServiceInstance) {
    codebaseIndexServiceInstance.dispose();
    codebaseIndexServiceInstance = null;
  }
}
