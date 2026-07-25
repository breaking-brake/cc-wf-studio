/**
 * Read a workflow JSON file from disk (or stdin) and parse it.
 *
 * Used by every subcommand that takes a `<file>` argument. Errors are wrapped
 * so commander can surface a stable exit code (2) with a friendly stderr line
 * instead of a raw stack trace.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Workflow } from '@cc-wf-studio/core';

export class WorkflowLoadError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 2
  ) {
    super(message);
    this.name = 'WorkflowLoadError';
  }
}

/**
 * Minimal shape check — every workflow carries a `nodes` array. Full
 * validation stays in `ccwf validate`; this only exists so downstream
 * generators never dereference `undefined`.
 */
function looksLikeWorkflow(value: unknown): value is Workflow {
  return (
    typeof value === 'object' && value !== null && Array.isArray((value as Partial<Workflow>).nodes)
  );
}

export interface WorkflowDocument {
  workflow: Workflow;
  /** Set when the source wraps the workflow as `{ meta, workflow }` and carries a `meta` value. */
  wrapperMeta?: unknown;
}

interface JsonErrorLocation {
  /** 1-based line number of the parse error. */
  line: number;
  /** 1-based column number of the parse error. */
  column: number;
}

/**
 * Recover the error location from a V8 `JSON.parse` message. Node 22+ appends
 * "at position N (line L column C)"; Node 20 only "at position N", so the
 * line/column is re-derived from the position there; very short inputs get the
 * whole text inlined with no location at all.
 */
function locateJsonError(detail: string, raw: string): JsonErrorLocation | undefined {
  const lineCol = /\(line (\d+) column (\d+)\)/.exec(detail);
  if (lineCol) {
    return { line: Number(lineCol[1]), column: Number(lineCol[2]) };
  }
  const positionMatch = /at position (\d+)/.exec(detail);
  if (!positionMatch) {
    return undefined;
  }
  const position = Math.min(Number(positionMatch[1]), raw.length);
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < position; i++) {
    if (raw.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: position - lineStart + 1 };
}

/** Widest slice of the offending line shown in a snippet (minified files can be one huge line). */
const SNIPPET_MAX_WIDTH = 100;

function renderCaretSnippet(raw: string, location: JsonErrorLocation): string {
  const lines = raw.split('\n').map((line) => line.replace(/\r$/, '').replace(/\t/g, ' '));
  const errorIndex = location.line - 1;
  if (errorIndex < 0 || errorIndex >= lines.length) {
    return '';
  }
  const first = Math.max(0, errorIndex - 1);
  const last = Math.min(lines.length - 1, errorIndex + 1);
  const gutterWidth = String(last + 1).length;

  const column = Math.max(1, location.column);
  const errorLine = lines[errorIndex];
  const windowStart =
    errorLine.length > SNIPPET_MAX_WIDTH
      ? Math.max(
          0,
          Math.min(
            column - 1 - Math.floor(SNIPPET_MAX_WIDTH / 2),
            errorLine.length - SNIPPET_MAX_WIDTH
          )
        )
      : 0;
  const clip = (line: string): string => {
    const sliced = line.slice(windowStart, windowStart + SNIPPET_MAX_WIDTH);
    const prefix = windowStart > 0 ? '…' : '';
    const suffix = windowStart + SNIPPET_MAX_WIDTH < line.length ? '…' : '';
    return `${prefix}${sliced}${suffix}`;
  };

  const rows: string[] = [];
  for (let i = first; i <= last; i++) {
    const marker = i === errorIndex ? '>' : ' ';
    rows.push(`${marker} ${String(i + 1).padStart(gutterWidth)} | ${clip(lines[i])}`);
    if (i === errorIndex) {
      const caretOffset =
        Math.min(column - 1 - windowStart, SNIPPET_MAX_WIDTH - 1) + (windowStart > 0 ? 1 : 0);
      rows.push(`  ${' '.repeat(gutterWidth)} | ${' '.repeat(Math.max(0, caretOffset))}^`);
    }
  }
  return rows.join('\n');
}

/**
 * Turn a raw `JSON.parse` failure into a message that points at the offending
 * line with a caret. Falls back to the raw V8 message when no location can be
 * recovered from it.
 */
function describeJsonParseError(raw: string, sourceLabel: string, detail: string): string {
  const location = locateJsonError(detail, raw);
  if (!location) {
    return `Invalid JSON in ${sourceLabel}: ${detail}`;
  }
  const reason =
    detail
      .replace(/\s*(?:in|after) JSON at position \d+(?:\s*\(line \d+ column \d+\))?/, '')
      .trim() || detail;
  const header = `Invalid JSON in ${sourceLabel}: ${reason} (line ${location.line}, column ${location.column})`;
  const snippet = renderCaretSnippet(raw, location);
  return snippet === '' ? header : `${header}\n${snippet}`;
}

/**
 * Parse a raw JSON string into a workflow, unwrapping the `{ meta, workflow }`
 * wrapper that sample/share files use. Callers that write the file back (e.g.
 * `ccwf canvas` save) can use `wrapperMeta` to preserve the wrapper on save.
 */
export function parseWorkflowDocument(raw: string, sourceLabel: string): WorkflowDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new WorkflowLoadError(
      describeJsonParseError(raw, sourceLabel, error instanceof Error ? error.message : String(error))
    );
  }
  if (looksLikeWorkflow(parsed)) {
    return { workflow: parsed };
  }
  // Sample/share files wrap the workflow: { meta: {...}, workflow: {...} }
  const wrapped =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { workflow?: unknown }).workflow
      : undefined;
  if (looksLikeWorkflow(wrapped)) {
    const meta = (parsed as { meta?: unknown }).meta;
    return meta === undefined ? { workflow: wrapped } : { workflow: wrapped, wrapperMeta: meta };
  }
  throw new WorkflowLoadError(
    `${sourceLabel} does not look like a workflow file: expected a top-level "nodes" array or a { meta, workflow } wrapper`
  );
}

function parseWorkflowSource(raw: string, sourceLabel: string): Workflow {
  return parseWorkflowDocument(raw, sourceLabel).workflow;
}

export async function loadWorkflowFromFile(filePath: string): Promise<{
  workflow: Workflow;
  absolutePath: string;
}> {
  const absolutePath = path.resolve(filePath);
  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new WorkflowLoadError(`File not found: ${absolutePath}`);
    }
    throw new WorkflowLoadError(
      `Failed to read ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return { workflow: parseWorkflowSource(raw, absolutePath), absolutePath };
}

/** Label used wherever a file path would appear in reports and error messages. */
export const STDIN_LABEL = '<stdin>';

/**
 * Read a workflow JSON document from stdin (the `-` argument convention).
 *
 * Refuses to read from an interactive terminal — a bare `ccwf validate -`
 * with nothing piped in would otherwise hang waiting for input forever.
 */
export async function loadWorkflowFromStdin(): Promise<{
  workflow: Workflow;
  absolutePath: string;
}> {
  if (process.stdin.isTTY) {
    throw new WorkflowLoadError(
      `No input on stdin: '-' expects workflow JSON piped in (e.g. \`cat wf.json | ccwf validate -\`).`
    );
  }
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } catch (error) {
    throw new WorkflowLoadError(
      `Failed to read stdin: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (raw.trim() === '') {
    throw new WorkflowLoadError('No input on stdin: received an empty stream.');
  }
  return { workflow: parseWorkflowSource(raw, STDIN_LABEL), absolutePath: STDIN_LABEL };
}
