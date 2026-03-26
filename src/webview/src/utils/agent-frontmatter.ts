/**
 * Parse YAML frontmatter from agent .md file content.
 * Returns extracted fields and the body text (after frontmatter).
 */
export function parseAgentFrontmatter(content: string): {
  frontmatter: Record<string, string | undefined>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = (match[2] || '').trim();
  const frontmatter: Record<string, string | undefined> = {};

  // Parse simple key: value lines (skip complex nested structures like hooks/mcpServers)
  for (const line of yamlBlock.split('\n')) {
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      frontmatter[kvMatch[1]] = kvMatch[2].trim();
    }
  }

  return { frontmatter, body };
}
