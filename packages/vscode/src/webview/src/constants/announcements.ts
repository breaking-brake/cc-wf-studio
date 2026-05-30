/**
 * Feature Announcement Configuration
 *
 * Set CURRENT_ANNOUNCEMENT to display a banner at the top of the canvas.
 * Set to null when there is no active announcement.
 *
 * Usage:
 * 1. Add translation keys to all translation files (ja.ts, en.ts, etc.)
 * 2. Add featureId to VALID_FEATURE_IDS
 * 3. Set the announcement config in CURRENT_ANNOUNCEMENT
 * 4. When done, set CURRENT_ANNOUNCEMENT = null
 * 5. To cleanup localStorage, remove featureId from VALID_FEATURE_IDS
 */

import type { WebviewTranslationKeys } from '../i18n/translation-keys';

const DISMISSED_KEY_PREFIX = 'cc-wf-studio:feature-dismissed:';

export interface AnnouncementConfig {
  /** Unique identifier for localStorage persistence */
  featureId: string;
  /** Translation key for the title */
  titleKey: keyof WebviewTranslationKeys;
  /** Translation key for the description (optional) */
  descriptionKey?: keyof WebviewTranslationKeys;
}

/**
 * Valid feature IDs that should be retained in localStorage.
 * Remove featureId from this list to cleanup dismissed state on next app launch.
 */
export const VALID_FEATURE_IDS: string[] = [];

/**
 * Current active announcement.
 * Set to null when there is no announcement to display.
 *
 * Example:
 * export const CURRENT_ANNOUNCEMENT: AnnouncementConfig | null = {
 *   featureId: 'codex-cli-v3.17',
 *   titleKey: 'announcement.codexCli.title',
 *   descriptionKey: 'announcement.codexCli.description',
 * };
 */
export const CURRENT_ANNOUNCEMENT: AnnouncementConfig | null = null;

/**
 * Cleanup dismissed announcement entries from localStorage.
 * Removes entries for featureIds not in VALID_FEATURE_IDS.
 * Call this on app startup to prevent localStorage bloat.
 */
export function cleanupDismissedAnnouncements(): void {
  try {
    // Collect keys first to avoid issues with modifying localStorage during iteration
    const keysToRemove = Object.keys(localStorage)
      .filter((key) => key.startsWith(DISMISSED_KEY_PREFIX))
      .filter((key) => {
        const featureId = key.slice(DISMISSED_KEY_PREFIX.length);
        return !VALID_FEATURE_IDS.includes(featureId);
      });

    for (const key of keysToRemove) {
      const featureId = key.slice(DISMISSED_KEY_PREFIX.length);
      localStorage.removeItem(key);
      console.log(`[Announcement] Cleaned up dismissed entry: ${featureId}`);
    }
  } catch {
    // localStorage may not be available in some contexts
  }
}
