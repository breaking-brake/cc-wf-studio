import type { ChangelogEntry, ChangelogItem, ChangelogSection } from '../../shared/types/messages';

const VERSION_HEADER = /^## \[([^\]]+)\]\(([^)]+)\) \(([^)]+)\)/;
const SECTION_HEADER = /^### (.+)/;
// Match: * text ([#num](prUrl)) ([commitHash](commitUrl))
// Captures: text, optional PR number, optional PR URL
const ITEM_LINE = /^\* (.+?)(?:\s*\(\[#(\d+)\]\(([^)]+)\)\))?(?:\s*\(\[[a-f0-9]+\]\([^)]+\)\))?$/;

export function parseChangelog(content: string, maxEntries = 5): ChangelogEntry[] {
  const lines = content.split('\n');
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const line of lines) {
    const versionMatch = line.match(VERSION_HEADER);
    if (versionMatch) {
      if (currentSection && currentEntry) {
        currentEntry.sections.push(currentSection);
      }
      if (currentEntry) {
        entries.push(currentEntry);
        if (entries.length >= maxEntries) break;
      }
      currentEntry = {
        version: versionMatch[1],
        compareUrl: versionMatch[2],
        date: versionMatch[3],
        sections: [],
      };
      currentSection = null;
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch && currentEntry) {
      if (currentSection) {
        currentEntry.sections.push(currentSection);
      }
      currentSection = { title: sectionMatch[1], items: [] };
      continue;
    }

    const itemMatch = line.match(ITEM_LINE);
    if (itemMatch && currentSection) {
      const item: ChangelogItem = { text: itemMatch[1].trim() };
      if (itemMatch[2]) item.prNumber = `#${itemMatch[2]}`;
      if (itemMatch[3]) item.prUrl = itemMatch[3];
      currentSection.items.push(item);
    }
  }

  // Push last section and entry
  if (currentSection && currentEntry) {
    currentEntry.sections.push(currentSection);
  }
  if (currentEntry && entries.length < maxEntries) {
    entries.push(currentEntry);
  }

  return entries;
}

export function extractVersions(content: string): string[] {
  const versions: string[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(VERSION_HEADER);
    if (match) {
      versions.push(match[1]);
    }
  }
  return versions;
}

export function countUnreadVersions(
  content: string,
  lastViewedVersion: string | undefined
): number {
  if (!lastViewedVersion) return 0;
  const versions = extractVersions(content);
  const lastViewedIndex = versions.indexOf(lastViewedVersion);
  if (lastViewedIndex === -1) return versions.length;
  return lastViewedIndex;
}
