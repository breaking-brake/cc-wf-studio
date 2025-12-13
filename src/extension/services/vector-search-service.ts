/**
 * Claude Code Workflow Studio - Vector Search Service (Orama Wrapper)
 *
 * Provides BM25 full-text search capabilities using Orama.
 * Based on: GitHub Issue #265
 */

import type { Orama, Results, SearchParams } from '@orama/orama';
import { count, create, insertMultiple, removeMultiple, search } from '@orama/orama';
import { persistToFile, restoreFromFile } from '@orama/plugin-data-persistence/server';
import * as vscode from 'vscode';
import type {
  CodeDocument,
  SearchOptions,
  SearchResponse,
  SearchResult,
} from '../../shared/types/codebase-index';

// Orama schema definition
const SCHEMA = {
  id: 'string',
  filePath: 'string',
  content: 'string',
  language: 'string',
  startLine: 'number',
  endLine: 'number',
  chunkIndex: 'number',
  updatedAt: 'number',
} as const;

type OramaDB = Orama<typeof SCHEMA>;

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
 * Vector Search Service - Orama wrapper for BM25 full-text search
 */
export class VectorSearchService {
  private db: OramaDB | null = null;
  private indexFilePath: string | null = null;

  constructor() {
    log('VectorSearchService initialized');
  }

  /**
   * Initialize the Orama database
   */
  async initialize(): Promise<void> {
    if (this.db) {
      log('Database already initialized');
      return;
    }

    try {
      this.db = await create({ schema: SCHEMA });
      log('Orama database created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to create Orama database: ${errorMessage}`);
      throw new Error(`Failed to initialize search database: ${errorMessage}`);
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Insert documents into the database
   */
  async insertDocuments(documents: CodeDocument[]): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    if (documents.length === 0) {
      log('No documents to insert');
      return 0;
    }

    try {
      await insertMultiple(this.db, documents);
      log(`Inserted ${documents.length} documents into database`);
      return documents.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to insert documents: ${errorMessage}`);
      throw new Error(`Failed to insert documents: ${errorMessage}`);
    }
  }

  /**
   * Search the database using BM25 full-text search
   */
  async searchFullText(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const startTime = Date.now();

    const searchParams: SearchParams<OramaDB, typeof SCHEMA> = {
      term: query,
      properties: (options.properties || ['content', 'filePath']) as Array<keyof typeof SCHEMA>,
      limit: options.limit || 10,
      threshold: options.threshold || 0,
    };

    try {
      const results: Results<CodeDocument> = await search(this.db, searchParams);
      const executionTimeMs = Date.now() - startTime;

      const searchResults: SearchResult[] = results.hits.map((hit) => ({
        document: hit.document as CodeDocument,
        score: hit.score,
      }));

      // Apply additional filters if specified
      let filteredResults = searchResults;

      if (options.filterExtensions && options.filterExtensions.length > 0) {
        const extensions = options.filterExtensions.map((ext) =>
          ext.startsWith('.') ? ext : `.${ext}`
        );
        filteredResults = filteredResults.filter((result) =>
          extensions.some((ext) => result.document.filePath.endsWith(ext))
        );
      }

      log(
        `Search completed: "${query}" - ${filteredResults.length} results in ${executionTimeMs}ms`
      );

      return {
        results: filteredResults,
        totalMatches: results.count,
        executionTimeMs,
        query,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Search failed: ${errorMessage}`);
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  /**
   * Get the total number of documents in the database
   */
  async getDocumentCount(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    try {
      return await count(this.db);
    } catch (error) {
      log(`Failed to get document count: ${error}`);
      return 0;
    }
  }

  /**
   * Remove documents by their IDs
   */
  async removeDocuments(ids: string[]): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    if (ids.length === 0) {
      return 0;
    }

    try {
      await removeMultiple(this.db, ids);
      log(`Removed ${ids.length} documents from database`);
      return ids.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to remove documents: ${errorMessage}`);
      throw new Error(`Failed to remove documents: ${errorMessage}`);
    }
  }

  /**
   * Clear all documents from the database
   */
  async clearDatabase(): Promise<void> {
    try {
      // Re-create the database to clear all documents
      this.db = await create({ schema: SCHEMA });
      log('Database cleared successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to clear database: ${errorMessage}`);
      throw new Error(`Failed to clear database: ${errorMessage}`);
    }
  }

  /**
   * Persist the database to a file
   */
  async persistToFile(filePath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      await persistToFile(this.db, 'json', filePath);
      this.indexFilePath = filePath;
      log(`Database persisted to: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to persist database: ${errorMessage}`);
      throw new Error(`Failed to persist database: ${errorMessage}`);
    }
  }

  /**
   * Restore the database from a file
   */
  async restoreFromFile(filePath: string): Promise<boolean> {
    try {
      this.db = (await restoreFromFile('json', filePath)) as OramaDB;
      this.indexFilePath = filePath;
      const docCount = await this.getDocumentCount();
      log(`Database restored from: ${filePath} (${docCount} documents)`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to restore database from ${filePath}: ${errorMessage}`);
      // Initialize a fresh database if restore fails
      await this.initialize();
      return false;
    }
  }

  /**
   * Get the current index file path
   */
  getIndexFilePath(): string | null {
    return this.indexFilePath;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.db = null;
    this.indexFilePath = null;
    log('VectorSearchService disposed');
  }
}

/**
 * Singleton instance of VectorSearchService
 */
let vectorSearchServiceInstance: VectorSearchService | null = null;

/**
 * Get the singleton instance of VectorSearchService
 */
export function getVectorSearchService(): VectorSearchService {
  if (!vectorSearchServiceInstance) {
    vectorSearchServiceInstance = new VectorSearchService();
  }
  return vectorSearchServiceInstance;
}

/**
 * Dispose of the singleton instance
 */
export function disposeVectorSearchService(): void {
  if (vectorSearchServiceInstance) {
    vectorSearchServiceInstance.dispose();
    vectorSearchServiceInstance = null;
  }
}
