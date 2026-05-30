import { Lexer, type Token, type Tokens } from 'marked';
import type { ChangelogEntry, ChangelogItem, ChangelogSection } from '../../shared/types/messages';

/**
 * Extract plain text and the first PR link from a list of inline tokens.
 * Handles semantic-release format:
 *   "description ([#num](url)) ([hash](url)), closes [#n](url) ..."
 */
function extractItemFromTokens(tokens: Token[]): ChangelogItem {
  let text = '';
  let prNumber: string | undefined;
  let prUrl: string | undefined;
  let foundPr = false;

  for (const token of tokens) {
    if (token.type === 'link' && !foundPr) {
      // First link starting with # is the PR reference
      if (token.text.startsWith('#')) {
        prNumber = token.text;
        prUrl = token.href;
        foundPr = true;
        continue;
      }
    }
    // Skip commit hash links and "closes" references after PR link
    if (foundPr) continue;

    if (token.type === 'text') {
      text += token.raw;
    } else if (token.type === 'codespan') {
      text += `\`${(token as Tokens.Codespan).text}\``;
    } else if (token.type === 'strong') {
      text += (token as Tokens.Strong).text;
    } else if (token.type === 'em') {
      text += (token as Tokens.Em).text;
    }
  }

  const item: ChangelogItem = { text: text.replace(/\s*\($/, '').trim() };
  if (prNumber) item.prNumber = prNumber;
  if (prUrl) item.prUrl = prUrl;
  return item;
}

export function parseChangelog(content: string, maxEntries = 5): ChangelogEntry[] {
  const lexer = new Lexer();
  const tokens = lexer.lex(content);
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const token of tokens) {
    // ## [version](compareUrl) (date)
    if (token.type === 'heading' && token.depth === 2) {
      if (currentSection && currentEntry) {
        currentEntry.sections.push(currentSection);
        currentSection = null;
      }
      if (currentEntry) {
        entries.push(currentEntry);
        if (entries.length >= maxEntries) break;
      }

      // Parse version heading inline tokens. Two formats are supported:
      //   semantic-release: "## [3.34.1](compareUrl) (2026-05-05)"
      //   changesets:       "## 3.34.2"
      const inlineTokens = (token as Tokens.Heading).tokens || [];
      let version = '';
      let compareUrl = '';
      let date = '';

      for (const t of inlineTokens) {
        if (t.type === 'link' && !version) {
          // semantic-release: version + compare URL come from the link
          version = t.text;
          compareUrl = t.href;
        } else if (t.type === 'text') {
          const dateMatch = t.raw.match(/\(([^)]+)\)/);
          if (dateMatch) date = dateMatch[1];
          // changesets: no link — the bare "x.y.z" text is the version
          if (!version) {
            const versionMatch = t.raw.match(/^\s*(\d[^\s(]*)/);
            if (versionMatch) version = versionMatch[1];
          }
        }
      }

      currentEntry = { version, compareUrl, date, sections: [] };
      continue;
    }

    // ### Section Title
    if (token.type === 'heading' && token.depth === 3 && currentEntry) {
      if (currentSection) {
        currentEntry.sections.push(currentSection);
      }
      currentSection = { title: token.text, items: [] };
      continue;
    }

    // List items
    if (token.type === 'list' && currentSection) {
      for (const listItem of (token as Tokens.List).items) {
        const inlineTokens = (listItem as Tokens.ListItem).tokens;
        // Flatten: list item may wrap content in a paragraph
        let flatTokens: Token[] = [];
        for (const t of inlineTokens) {
          if (t.type === 'paragraph' || t.type === 'text') {
            flatTokens = flatTokens.concat((t as Tokens.Paragraph).tokens || [t]);
          } else {
            flatTokens.push(t);
          }
        }
        currentSection.items.push(extractItemFromTokens(flatTokens));
      }
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

// Matches both heading formats:
//   semantic-release: "## [3.34.1](url) ..."  → group 1
//   changesets:       "## 3.34.2"             → group 2
const VERSION_HEADING = /^## (?:\[([^\]]+)\]|(\d[^\s]*))/;

export function extractVersions(content: string): string[] {
  const versions: string[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(VERSION_HEADING);
    if (match) {
      versions.push(match[1] ?? match[2]);
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
