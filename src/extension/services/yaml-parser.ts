/**
 * SKILL.md YAML Frontmatter Parser
 *
 * Feature: 001-skill-node
 * Purpose: Parse YAML frontmatter from SKILL.md files without adding new dependencies
 *
 * Based on: specs/001-skill-node/research.md Section 1
 */

/**
 * Skill metadata extracted from YAML frontmatter
 */
export interface SkillMetadata {
  /** Skill name (required field in YAML frontmatter) */
  name: string;
  /** Skill description (required field in YAML frontmatter) */
  description: string;
  /** Optional: Allowed tools (optional field in YAML frontmatter) */
  allowedTools?: string;
}

/**
 * Parse SKILL.md YAML frontmatter and extract metadata
 *
 * @param content - Full content of SKILL.md file
 * @returns Parsed metadata or null if invalid
 *
 * @example
 * ```typescript
 * const content = `---
 * name: my-skill
 * description: Does something useful
 * allowed-tools: Read, Write
 * ---
 *
 * # Instructions
 * ...`;
 *
 * const metadata = parseSkillFrontmatter(content);
 * // { name: 'my-skill', description: 'Does something useful', allowedTools: 'Read, Write' }
 * ```
 */
export function parseSkillFrontmatter(content: string): SkillMetadata | null {
  // Extract frontmatter block (delimited by ---)
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null; // No frontmatter found
  }

  const yaml = match[1];

  // Extract required fields using simple regex
  const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim();

  // Extract optional field
  const allowedTools = yaml.match(/^allowed-tools:\s*(.+)$/m)?.[1]?.trim();

  // Validate required fields
  if (!name || !description) {
    return null; // Required fields missing
  }

  return {
    name,
    description,
    allowedTools,
  };
}
