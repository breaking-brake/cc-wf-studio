import { describe, expect, it } from 'vitest';
import { nodeNameToFileName } from './workflow-export.js';

/**
 * The first test in the repository. Its job is to prove the vitest wiring
 * works end to end (see the `qa` issue for the S0 foundation task), so it
 * stays deliberately small.
 *
 * It targets `nodeNameToFileName` rather than something trivial because the
 * naming rule is stated independently of the code, in
 * `packages/vscode/specs/001-cc-wf-studio/spec.md` (Export Format Details):
 *
 *   > ファイル名: ノード名を小文字化し、スペースをハイフンに置換
 *   > (例: "Data Analysis" → "data-analysis.md")
 *
 * Checking the implementation against a separately maintained specification
 * relates two artifacts, so it is a real check rather than a transcription of
 * the code — the distinction drawn in `docs/quality/03-assurance-map.md`.
 */
describe('nodeNameToFileName', () => {
  it('applies the naming rule from the export specification', () => {
    // The worked example given in spec.md.
    expect(nodeNameToFileName('Data Analysis')).toBe('data-analysis');
  });

  it('collapses runs of whitespace into a single hyphen', () => {
    // Without this, a stray double space yields `report--generation`, which
    // is a different file from the one the workflow references.
    expect(nodeNameToFileName('Report   Generation')).toBe('report-generation');
  });

  it('drops characters that are not filename-safe', () => {
    // A node named with punctuation must still resolve to a path the agent
    // can load; anything outside [a-z0-9-_] is removed.
    expect(nodeNameToFileName('Deploy (staging)!')).toBe('deploy-staging');
  });

  it('preserves hyphens and underscores already present', () => {
    expect(nodeNameToFileName('build_and-test')).toBe('build_and-test');
  });
});
