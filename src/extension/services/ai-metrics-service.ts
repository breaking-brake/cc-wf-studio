/**
 * AI Metrics Collection Service
 *
 * Collects and logs metrics for A/B comparison of schema formats.
 */

import * as vscode from 'vscode';
import type { AIGenerationMetrics, SchemaFormat } from '../../shared/types/ai-metrics';
import { log } from '../extension';

// In-memory storage for session metrics
const sessionMetrics: AIGenerationMetrics[] = [];

/**
 * Check if metrics collection is enabled
 */
export function isMetricsCollectionEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('cc-wf-studio');
  return config.get<boolean>('ai.collectMetrics', false);
}

/**
 * Get configured schema format
 */
export function getConfiguredSchemaFormat(): SchemaFormat {
  const config = vscode.workspace.getConfiguration('cc-wf-studio');
  return config.get<SchemaFormat>('ai.schemaFormat', 'json');
}

/**
 * Record AI generation metrics
 */
export function recordMetrics(metrics: AIGenerationMetrics): void {
  if (!isMetricsCollectionEnabled()) {
    return;
  }

  sessionMetrics.push(metrics);

  // Log to output channel
  log('INFO', 'AI Generation Metrics', {
    requestId: metrics.requestId,
    schemaFormat: metrics.schemaFormat,
    promptFormat: metrics.promptFormat,
    promptSize: metrics.promptSizeChars,
    schemaSize: metrics.schemaSizeChars,
    estimatedTokens: metrics.estimatedTokens,
    executionTimeMs: metrics.executionTimeMs,
    success: metrics.success,
  });

  // Log summary every 10 generations
  if (sessionMetrics.length % 10 === 0) {
    logSessionSummary();
  }
}

/**
 * Log session summary for comparison
 */
function logSessionSummary(): void {
  const jsonMetrics = sessionMetrics.filter((m) => m.schemaFormat === 'json');
  const toonMetrics = sessionMetrics.filter((m) => m.schemaFormat === 'toon');

  if (jsonMetrics.length === 0 || toonMetrics.length === 0) {
    return; // Need both formats for comparison
  }

  const avgJsonPromptSize = average(jsonMetrics.map((m) => m.promptSizeChars));
  const avgToonPromptSize = average(toonMetrics.map((m) => m.promptSizeChars));
  const avgJsonExecTime = average(jsonMetrics.map((m) => m.executionTimeMs));
  const avgToonExecTime = average(toonMetrics.map((m) => m.executionTimeMs));

  log('INFO', 'AI Metrics Session Summary', {
    totalGenerations: sessionMetrics.length,
    jsonCount: jsonMetrics.length,
    toonCount: toonMetrics.length,
    avgPromptSizeReduction: `${(((avgJsonPromptSize - avgToonPromptSize) / avgJsonPromptSize) * 100).toFixed(1)}%`,
    avgExecutionTimeDiff: `${(avgToonExecTime - avgJsonExecTime).toFixed(0)}ms`,
    jsonSuccessRate: `${((jsonMetrics.filter((m) => m.success).length / jsonMetrics.length) * 100).toFixed(1)}%`,
    toonSuccessRate: `${((toonMetrics.filter((m) => m.success).length / toonMetrics.length) * 100).toFixed(1)}%`,
  });
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/**
 * Estimate token count from character count
 * Using rough approximation: 1 token ~ 4 characters for English text
 */
export function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}

/**
 * Clear session metrics
 */
export function clearSessionMetrics(): void {
  sessionMetrics.length = 0;
}

/**
 * Get all session metrics
 */
export function getSessionMetrics(): AIGenerationMetrics[] {
  return [...sessionMetrics];
}
