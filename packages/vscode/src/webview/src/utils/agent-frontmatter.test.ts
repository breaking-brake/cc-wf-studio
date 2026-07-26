import { describe, expect, it } from 'vitest';
import { parseAgentFrontmatter } from './agent-frontmatter';

const LF_AGENT = `---
name: code-reviewer
description: Reviews code for correctness
model: opus
tools: Read, Grep, Glob
---
You are a senior code reviewer.

Run git diff first.`;

describe('parseAgentFrontmatter line endings', () => {
  it('parses CRLF agent files identically to LF files', () => {
    const crlfAgent = LF_AGENT.replace(/\n/g, '\r\n');

    expect(parseAgentFrontmatter(crlfAgent)).toEqual(parseAgentFrontmatter(LF_AGENT));
  });

  it('preserves original line endings when there is no frontmatter', () => {
    const crlfBody = 'plain body\r\nsecond line';

    expect(parseAgentFrontmatter(crlfBody)).toEqual({ frontmatter: {}, body: crlfBody });
  });
});
