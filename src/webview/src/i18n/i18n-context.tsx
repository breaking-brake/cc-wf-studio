/**
 * Claude Code Workflow Studio - Webview i18n Context
 *
 * Provides translation functionality via React Context
 */

import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { WebviewTranslationKeys } from './translation-keys';
import { enWebviewTranslations } from './translations/en';
import { jaWebviewTranslations } from './translations/ja';
import { koWebviewTranslations } from './translations/ko';
import { zhCNWebviewTranslations } from './translations/zh-CN';
import { zhTWWebviewTranslations } from './translations/zh-TW';

type Translations = typeof enWebviewTranslations;

interface I18nContextValue {
  t: <K extends keyof WebviewTranslationKeys>(
    key: K,
    params?: Record<string, string | number>
  ) => string;
  locale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Get translations for a given locale
 */
function getTranslations(locale: string): Translations {
  const languageCode = locale.split('-')[0];

  // Check full locale first (e.g., zh-CN, zh-TW)
  if (locale === 'zh-CN') {
    return zhCNWebviewTranslations;
  }
  if (locale === 'zh-TW' || locale === 'zh-HK') {
    return zhTWWebviewTranslations;
  }

  // Check language code (e.g., ja, ko)
  switch (languageCode) {
    case 'ja':
      return jaWebviewTranslations;
    case 'ko':
      return koWebviewTranslations;
    case 'zh':
      // Default to Simplified Chinese if no region specified
      return zhCNWebviewTranslations;
    default:
      return enWebviewTranslations;
  }
}

interface I18nProviderProps {
  locale: string;
  children: React.ReactNode;
}

/**
 * I18n Provider Component
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ locale, children }) => {
  const value = useMemo(() => {
    const translations = getTranslations(locale);

    return {
      t: <K extends keyof WebviewTranslationKeys>(
        key: K,
        params?: Record<string, string | number>
      ): string => {
        let text = translations[key] as string;

        // Replace parameters if provided
        if (params) {
          for (const paramKey of Object.keys(params)) {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
          }
        }

        return text;
      },
      locale,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * Hook to use i18n in components
 */
export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }

  return context;
}
