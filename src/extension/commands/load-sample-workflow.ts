/**
 * Claude Code Workflow Studio - Load Sample Workflow Command
 *
 * Lists available sample workflows and loads a specific sample workflow
 * from the resources/samples/ directory bundled with the extension.
 *
 * Sample files may be locale-tagged: `<sampleId>.<locale>.json`.
 * Untagged `<sampleId>.json` is treated as a locale-agnostic fallback.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  SampleWorkflowListPayload,
  SampleWorkflowLoadedPayload,
  SampleWorkflowPreviewLoadedPayload,
} from '../../shared/types/messages';
import type { SampleWorkflowFile } from '../../shared/types/sample-workflow';

const LOCALE_SUFFIX_PATTERN = /^([a-z]{2})(-[a-z]{2,4})?$/i;
const SAMPLE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

interface ParsedFilename {
  sampleId: string;
  locale: string | null;
}

function parseFilename(filename: string): ParsedFilename | null {
  if (!filename.endsWith('.json')) return null;
  const base = filename.slice(0, -'.json'.length);
  const lastDot = base.lastIndexOf('.');
  if (lastDot === -1) {
    return SAMPLE_ID_PATTERN.test(base) ? { sampleId: base, locale: null } : null;
  }
  const tail = base.slice(lastDot + 1);
  if (LOCALE_SUFFIX_PATTERN.test(tail)) {
    const sampleId = base.slice(0, lastDot);
    return SAMPLE_ID_PATTERN.test(sampleId) ? { sampleId, locale: tail } : null;
  }
  return SAMPLE_ID_PATTERN.test(base) ? { sampleId: base, locale: null } : null;
}

/**
 * Pick the best file for a given sampleId and preferred locale.
 *
 * Resolution order (case-insensitive locale match):
 *  1. exact `<sampleId>.<preferredLocale>.json`
 *  2. language-only `<sampleId>.<lang>.json` (e.g. zh from zh-CN)
 *  3. any other file with same language prefix (e.g. zh-CN when asked for zh-TW)
 *  4. `<sampleId>.en.json`
 *  5. `<sampleId>.json` (no locale suffix)
 *  6. first remaining file with this sampleId
 */
function selectFileForLocale(
  filesForSample: ParsedFilename[],
  preferredLocale: string
): ParsedFilename | null {
  if (filesForSample.length === 0) return null;
  const want = preferredLocale.toLowerCase();
  const wantLang = want.split('-')[0];
  const norm = (s: string | null) => (s ?? '').toLowerCase();

  return (
    filesForSample.find((f) => norm(f.locale) === want) ??
    filesForSample.find((f) => norm(f.locale) === wantLang) ??
    filesForSample.find((f) => norm(f.locale).startsWith(`${wantLang}-`)) ??
    filesForSample.find((f) => norm(f.locale) === 'en') ??
    filesForSample.find((f) => f.locale === null) ??
    filesForSample[0] ??
    null
  );
}

function buildFilename(parsed: ParsedFilename): string {
  return parsed.locale ? `${parsed.sampleId}.${parsed.locale}.json` : `${parsed.sampleId}.json`;
}

async function readParsedFilesIn(samplesDir: string): Promise<ParsedFilename[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(samplesDir);
  } catch (error) {
    console.log('No samples directory or empty:', error);
    return [];
  }
  const parsed: ParsedFilename[] = [];
  for (const f of files) {
    const p = parseFilename(f);
    if (p) parsed.push(p);
  }
  return parsed;
}

function groupBySampleId(files: ParsedFilename[]): Map<string, ParsedFilename[]> {
  const groups = new Map<string, ParsedFilename[]>();
  for (const f of files) {
    const arr = groups.get(f.sampleId) ?? [];
    arr.push(f);
    groups.set(f.sampleId, arr);
  }
  return groups;
}

/**
 * List all available sample workflows and send metadata to webview.
 * Each unique sampleId is listed once, picking the best-matching locale file
 * to source the metadata.
 */
export async function listSampleWorkflows(
  extensionPath: string,
  webview: vscode.Webview,
  requestId?: string
): Promise<void> {
  try {
    const samplesDir = path.join(extensionPath, 'resources', 'samples');
    const parsedFiles = await readParsedFilesIn(samplesDir);
    const groups = groupBySampleId(parsedFiles);
    const preferredLocale = vscode.env.language || 'en';

    const samples = [];
    for (const [, groupFiles] of groups) {
      const selected = selectFileForLocale(groupFiles, preferredLocale);
      if (!selected) continue;
      const filename = buildFilename(selected);
      try {
        const filePath = path.join(samplesDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsedFile: SampleWorkflowFile = JSON.parse(content);
        if (parsedFile.meta) {
          samples.push(parsedFile.meta);
        }
      } catch (error) {
        console.error(`Failed to parse sample workflow file ${filename}:`, error);
      }
    }

    const payload: SampleWorkflowListPayload = { samples };
    webview.postMessage({
      type: 'SAMPLE_WORKFLOW_LIST',
      requestId,
      payload,
    });

    console.log(`Sample workflow list loaded: ${samples.length} samples`);
  } catch (error) {
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load sample workflow list',
        details: error,
      },
    });
  }
}

type ResolveResult =
  | { ok: true; parsed: SampleWorkflowFile; selected: ParsedFilename }
  | { ok: false; message: string };

async function resolveAndReadSample(
  extensionPath: string,
  sampleId: string
): Promise<ResolveResult> {
  if (!SAMPLE_ID_PATTERN.test(sampleId)) {
    return { ok: false, message: `Invalid sample workflow ID: "${sampleId}"` };
  }
  const baseDir = path.resolve(extensionPath, 'resources', 'samples');
  const parsedFiles = await readParsedFilesIn(baseDir);
  const groups = groupBySampleId(parsedFiles);
  const groupFiles = groups.get(sampleId);
  if (!groupFiles) {
    return { ok: false, message: `Sample workflow "${sampleId}" not found` };
  }
  const preferredLocale = vscode.env.language || 'en';
  const selected = selectFileForLocale(groupFiles, preferredLocale);
  if (!selected) {
    return { ok: false, message: `Sample workflow "${sampleId}" not found` };
  }
  const filename = buildFilename(selected);
  const filePath = path.resolve(baseDir, filename);
  if (!filePath.startsWith(baseDir + path.sep)) {
    return { ok: false, message: `Invalid sample workflow ID: "${sampleId}"` };
  }
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed: SampleWorkflowFile = JSON.parse(content);
  return { ok: true, parsed, selected };
}

/**
 * Load a specific sample workflow and send it to webview.
 * Picks the locale variant matching VSCode's display language, with fallback chain.
 */
export async function loadSampleWorkflow(
  extensionPath: string,
  webview: vscode.Webview,
  sampleId: string,
  requestId?: string
): Promise<void> {
  try {
    const result = await resolveAndReadSample(extensionPath, sampleId);
    if (!result.ok) {
      webview.postMessage({
        type: 'ERROR',
        requestId,
        payload: {
          code: 'LOAD_FAILED',
          message: result.message,
        },
      });
      return;
    }

    const payload: SampleWorkflowLoadedPayload = { workflow: result.parsed.workflow };
    webview.postMessage({
      type: 'SAMPLE_WORKFLOW_LOADED',
      requestId,
      payload,
    });

    console.log(`Sample workflow loaded: ${sampleId} (${result.selected.locale ?? 'no-locale'})`);
  } catch (error) {
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load sample workflow',
        details: error,
      },
    });
  }
}

/**
 * Load a specific sample workflow for preview only (does not apply to canvas).
 */
export async function previewSampleWorkflow(
  extensionPath: string,
  webview: vscode.Webview,
  sampleId: string,
  requestId?: string
): Promise<void> {
  try {
    const result = await resolveAndReadSample(extensionPath, sampleId);
    if (!result.ok) {
      webview.postMessage({
        type: 'ERROR',
        requestId,
        payload: {
          code: 'LOAD_FAILED',
          message: result.message,
        },
      });
      return;
    }

    const payload: SampleWorkflowPreviewLoadedPayload = {
      sampleId,
      workflow: result.parsed.workflow,
    };
    webview.postMessage({
      type: 'SAMPLE_WORKFLOW_PREVIEW_LOADED',
      requestId,
      payload,
    });

    console.log(`Sample workflow previewed: ${sampleId}`);
  } catch (error) {
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to preview sample workflow',
        details: error,
      },
    });
  }
}
