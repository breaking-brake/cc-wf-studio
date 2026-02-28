/**
 * Claude Code Workflow Studio - i18n Service
 *
 * Handles internationalization for workflow exports
 * Detects VSCode locale and provides translations
 */

import * as vscode from 'vscode';
import type { TranslationKeys } from './translation-keys';
import { enTranslations } from './translations/en';
import { jaTranslations } from './translations/ja';
import { koTranslations } from './translations/ko';
import { zhCNTranslations } from './translations/zh-CN';
import { zhTWTranslations } from './translations/zh-TW';

type Translations = typeof enTranslations;

/**
 * Get current locale from VSCode
 *
 * @returns Locale code (e.g., 'en', 'ja', 'zh-CN', 'zh-TW')
 */
export function getCurrentLocale(): string {
  // Get VSCode's display language
  return vscode.env.language;
}

/**
 * Get translations for the current locale
 *
 * @returns Translation object for current locale (defaults to English)
 */
export function getTranslations(): Translations {
  const locale = getCurrentLocale();
  const languageCode = locale.split('-')[0];

  // Check full locale first (e.g., zh-CN, zh-TW)
  if (locale === 'zh-CN') {
    return zhCNTranslations;
  }
  if (locale === 'zh-TW' || locale === 'zh-HK') {
    return zhTWTranslations;
  }

  // Check language code (e.g., ja, ko)
  switch (languageCode) {
    case 'ja':
      return jaTranslations;
    case 'ko':
      return koTranslations;
    case 'zh':
      // Default to Simplified Chinese if no region specified
      return zhCNTranslations;
    default:
      return enTranslations;
  }
}

/**
 * Translate a key to the current locale
 *
 * @param key - Translation key
 * @param params - Optional parameters for string interpolation
 * @returns Translated string
 */
export function translate<K extends keyof TranslationKeys>(
  key: K,
  params?: Record<string, string | number>
): string {
  const translations = getTranslations();
  let text = translations[key] as string;

  // Handle nested keys (e.g., 'mermaid.start')
  if (text === undefined) {
    const parts = (key as string).split('.');
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic nested property access requires any
    let current: any = translations;

    for (const part of parts) {
      current = current[part];
      if (current === undefined) {
        // Fallback to English if translation is missing
        current = enTranslations;
        for (const part of parts) {
          current = current[part];
          if (current === undefined) {
            return key as string;
          }
        }
        break;
      }
    }

    text = current as string;
  }

  // Replace parameters (e.g., {{name}} -> value)
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(`{{${paramKey}}}`, String(paramValue));
    }
  }

  return text;
}

/**
 * Get shorthand translation function for a specific namespace
 *
 * @returns Translation function
 */
export function useTranslation() {
  return {
    t: translate,
    locale: getCurrentLocale(),
  };
}
