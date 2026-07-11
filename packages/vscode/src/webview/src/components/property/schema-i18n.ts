/**
 * i18n helpers for schema-driven fields.
 *
 * Schema `labelKey`/`helpKey`/... values arrive as plain strings from
 * @cc-wf-studio/core, so they can't satisfy the typed `t()` signature. These
 * wrappers cast per-call and handle missing keys: required keys fall back to
 * the raw key (visible during development), optional keys resolve to
 * `undefined` so the caller skips rendering.
 */

import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';

export function useSchemaTranslation() {
  const { t } = useTranslation();

  const st = (key: string, params?: Record<string, string | number>): string =>
    t(key as keyof WebviewTranslationKeys, params) ?? key;

  const stOptional = (key: string | undefined): string | undefined =>
    key ? (t(key as keyof WebviewTranslationKeys) ?? undefined) : undefined;

  return { st, stOptional };
}
