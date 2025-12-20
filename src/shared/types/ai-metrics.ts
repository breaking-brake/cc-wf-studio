/**
 * AI Generation Metrics for A/B comparison
 */

export type SchemaFormat = 'json' | 'toon';
export type PromptFormat = 'freetext' | 'json' | 'toon';

export interface AIGenerationMetrics {
  /** Unique request ID */
  requestId: string;

  /** Schema format used */
  schemaFormat: SchemaFormat;

  /** Prompt structure format used */
  promptFormat: PromptFormat;

  /** Total prompt size in characters */
  promptSizeChars: number;

  /** Schema portion size in characters */
  schemaSizeChars: number;

  /** Estimated token count (chars / 4 approximation) */
  estimatedTokens: number;

  /** CLI execution time in milliseconds */
  executionTimeMs: number;

  /** Whether generation succeeded */
  success: boolean;

  /** Timestamp of generation */
  timestamp: string;

  /** User description length (for normalization) */
  userDescriptionLength: number;
}

export interface MetricsSummary {
  jsonMetrics: AIGenerationMetrics[];
  toonMetrics: AIGenerationMetrics[];
  comparison: {
    averagePromptSizeReduction: number; // percentage
    averageExecutionTimeDiff: number; // milliseconds
    jsonSuccessRate: number;
    toonSuccessRate: number;
  };
}
