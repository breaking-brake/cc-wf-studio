---
name: code-review
description: Analyze PR diffs and generate review comments from code quality, security, and performance perspectives. Use for code reviews, quality checks, and security analysis.
---

# Code Review Skill

## Overview
Analyze PR changes and conduct reviews from the following perspectives:
- Code Quality (readability, maintainability, DRY principle)
- Security (injection, authentication, sensitive data)
- Performance (N+1 queries, memory leaks)
- Testing (coverage, edge cases)

## Input
- PR diff (git diff format)
- Target file paths for review

## Output
- List of review comments (filename, line number, issue description, severity)

## Usage Examples
"Please review this PR" or "Check the code quality"
