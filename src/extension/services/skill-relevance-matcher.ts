/**
 * Skill Relevance Matcher Service
 *
 * Feature: 001-ai-skill-generation
 * Purpose: Calculate relevance scores between user descriptions and Skills using keyword matching
 *
 * Based on: specs/001-ai-skill-generation/data-model.md (Keyword Matching Algorithm)
 */

import type { SkillReference } from '../../shared/types/messages';

/**
 * Stopwords to exclude from tokenization
 * Common English words that don't contribute to semantic matching
 */
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'with',
  'from',
  'by',
  'about',
  'as',
  'into',
  'through',
  'during',
  'and',
  'or',
  'but',
  'not',
  'so',
  'than',
  'too',
  'very',
]);

/**
 * Configuration constants
 */
export const MAX_SKILLS_IN_PROMPT = 20; // Limit to prevent timeout (plan.md constraint)
export const SKILL_RELEVANCE_THRESHOLD = 0.3; // Minimum score for inclusion (30%)

/**
 * Skill relevance score result
 */
export interface SkillRelevanceScore {
  /** Reference to the Skill */
  skill: SkillReference;
  /** Relevance score (0.0 ~ 1.0) */
  score: number;
  /** Keywords that matched between description and Skill */
  matchedKeywords: string[];
}

/**
 * Filtering options
 */
export interface FilterOptions {
  /** Minimum relevance score (default: 0.6) */
  threshold?: number;
  /** Maximum Skills to return (default: 20) */
  maxResults?: number;
}

/**
 * Tokenize text into lowercase words, excluding stopwords and short words
 *
 * @param text - Raw text string (user description or Skill description)
 * @returns Array of lowercase words (length >= 3, stopwords removed)
 *
 * @example
 * ```typescript
 * tokenize("Create a workflow to analyze PDF documents");
 * // ["create", "workflow", "analyze", "pdf", "documents"]
 * ```
 *
 * Implementation: T008
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/) // Split by whitespace
    .map((word) => word.replace(/[^a-z0-9-]/g, '')) // Remove punctuation
    .filter((word) => word.length > 2) // Min length 3 chars
    .filter((word) => !STOPWORDS.has(word)); // Remove common words
}

/**
 * Calculate relevance score between user description and a Skill
 *
 * Formula: score = |intersection| / sqrt(|userTokens| * |skillTokens|)
 *
 * @param userDescription - User's natural language workflow description
 * @param skill - Skill to compare against
 * @returns Relevance score with matched keywords
 *
 * @example
 * ```typescript
 * const score = calculateSkillRelevance(
 *   "Create a workflow to analyze PDF documents",
 *   { name: "pdf-analyzer", description: "Extracts text from PDF files", ... }
 * );
 * // { skill: {...}, score: 0.72, matchedKeywords: ["pdf"] }
 * ```
 *
 * Implementation: T009
 */
export function calculateSkillRelevance(
  userDescription: string,
  skill: SkillReference
): SkillRelevanceScore {
  const userTokens = tokenize(userDescription);
  const skillTokens = tokenize(skill.description);

  // Calculate intersection (matched keywords)
  const userTokenSet = new Set(userTokens);
  const matchedKeywords = skillTokens.filter((token) => userTokenSet.has(token));

  // Calculate score using formula from data-model.md
  const score =
    userTokens.length === 0 || skillTokens.length === 0
      ? 0.0
      : matchedKeywords.length / Math.sqrt(userTokens.length * skillTokens.length);

  return {
    skill,
    score,
    matchedKeywords,
  };
}

/**
 * Filter and rank Skills by relevance to user description
 *
 * Sorting order:
 * 1. Score (descending)
 * 2. Scope (project > personal)
 * 3. Name (alphabetical)
 *
 * @param userDescription - User's workflow description
 * @param availableSkills - All scanned Skills
 * @param options - Filtering options (threshold, maxResults)
 * @returns Top N Skills sorted by relevance
 *
 * @example
 * ```typescript
 * const filtered = filterSkillsByRelevance(
 *   "Analyze PDF and extract data",
 *   allSkills,
 *   { threshold: 0.6, maxResults: 20 }
 * );
 * // Returns top 20 Skills with score >= 0.6, sorted by relevance
 * ```
 *
 * Implementation: T011-T012
 */
export function filterSkillsByRelevance(
  userDescription: string,
  availableSkills: SkillReference[],
  options?: FilterOptions
): SkillRelevanceScore[] {
  const threshold = options?.threshold ?? SKILL_RELEVANCE_THRESHOLD;
  const maxResults = options?.maxResults ?? MAX_SKILLS_IN_PROMPT;

  // Calculate relevance for all Skills
  const scored = availableSkills.map((skill) => calculateSkillRelevance(userDescription, skill));

  // Filter by threshold
  const filtered = scored.filter((item) => item.score >= threshold);

  // Handle duplicate Skill names: prefer project scope over personal (T012)
  const deduped = deduplicateSkills(filtered);

  // Sort by: score (desc), scope (project first), name (alpha)
  const sorted = deduped.sort((a, b) => {
    // 1. Score (descending)
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // 2. Scope (project > personal)
    if (a.skill.scope !== b.skill.scope) {
      return a.skill.scope === 'project' ? -1 : 1;
    }

    // 3. Name (alphabetical)
    return a.skill.name.localeCompare(b.skill.name);
  });

  // Return top N results
  return sorted.slice(0, maxResults);
}

/**
 * Remove duplicate Skills by name, preferring project scope
 *
 * @param skills - Skills with relevance scores
 * @returns Deduplicated Skills (project scope preferred)
 *
 * Implementation: T012
 */
function deduplicateSkills(skills: SkillRelevanceScore[]): SkillRelevanceScore[] {
  const seen = new Map<string, SkillRelevanceScore>();

  for (const item of skills) {
    const existing = seen.get(item.skill.name);

    if (!existing) {
      // First occurrence
      seen.set(item.skill.name, item);
    } else if (item.skill.scope === 'project' && existing.skill.scope === 'personal') {
      // Prefer project scope over personal (even if score is lower)
      seen.set(item.skill.name, item);
    }
    // Otherwise, keep existing (first occurrence or already project scope)
  }

  return Array.from(seen.values());
}
