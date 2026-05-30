/**
 * Sensitive Data Detector Utility
 *
 * Detects and masks sensitive information (API keys, tokens, passwords, etc.)
 * in workflow JSON files before sharing to Slack.
 *
 * Based on specs/001-slack-workflow-sharing/data-model.md
 */

import { type SensitiveDataFinding, SensitiveDataType } from '../types/slack-integration-types';

/**
 * Detection pattern definition
 */
interface DetectionPattern {
  /** Pattern type */
  type: SensitiveDataType;
  /** Regular expression for detection */
  pattern: RegExp;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Minimum length for valid matches */
  minLength?: number;
}

/**
 * Built-in detection patterns
 *
 * Patterns are based on common secret formats and best practices.
 */
const DETECTION_PATTERNS: DetectionPattern[] = [
  // AWS Access Key (AKIA followed by 16 alphanumeric chars)
  {
    type: SensitiveDataType.AWS_ACCESS_KEY,
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'high',
  },

  // AWS Secret Key (40 chars base64-like string)
  {
    type: SensitiveDataType.AWS_SECRET_KEY,
    pattern: /(?:aws_secret_access_key|aws[_-]?secret)["\s]*[:=]["\s]*([A-Za-z0-9/+=]{40})/gi,
    severity: 'high',
    minLength: 40,
  },

  // Slack Token (xoxb-, xoxp-, xoxa-, xoxo- prefixes)
  {
    type: SensitiveDataType.SLACK_TOKEN,
    pattern: /xox[bpoa]-[A-Za-z0-9-]{10,}/g,
    severity: 'high',
  },

  // GitHub Personal Access Token (ghp_ prefix, 36 chars)
  {
    type: SensitiveDataType.GITHUB_TOKEN,
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    severity: 'high',
  },

  // Generic API Key patterns
  {
    type: SensitiveDataType.API_KEY,
    pattern: /(?:api[_-]?key|apikey)["\s]*[:=]["\s]*["']?([A-Za-z0-9_-]{20,})["']?/gi,
    severity: 'medium',
    minLength: 20,
  },

  // Generic Token patterns
  {
    type: SensitiveDataType.TOKEN,
    pattern:
      /(?:token|auth[_-]?token|access[_-]?token)["\s]*[:=]["\s]*["']?([A-Za-z0-9_\-.]{20,})["']?/gi,
    severity: 'medium',
    minLength: 20,
  },

  // Private Key markers
  {
    type: SensitiveDataType.PRIVATE_KEY,
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/g,
    severity: 'high',
  },

  // Password patterns
  {
    type: SensitiveDataType.PASSWORD,
    pattern: /(?:password|passwd|pwd)["\s]*[:=]["\s]*["']?([^\s"']{8,})["']?/gi,
    severity: 'low',
    minLength: 8,
  },
];

/**
 * Masks a sensitive value
 *
 * Shows only first 4 and last 4 characters.
 * Example: "AKIAIOSFODNN7EXAMPLE" → "AKIA...MPLE"
 *
 * @param value - Original value to mask
 * @returns Masked value
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    // Too short to mask meaningfully, mask completely
    return '****';
  }

  const first4 = value.substring(0, 4);
  const last4 = value.substring(value.length - 4);
  return `${first4}...${last4}`;
}

/**
 * Extracts context around a match
 *
 * @param content - Full content
 * @param position - Match position
 * @param contextLength - Context length (default: 50 chars on each side)
 * @returns Context string
 */
function extractContext(content: string, position: number, contextLength = 50): string {
  const start = Math.max(0, position - contextLength);
  const end = Math.min(content.length, position + contextLength);

  const contextBefore = content.substring(start, position);
  const contextAfter = content.substring(position, end);

  return `...${contextBefore}[REDACTED]${contextAfter}...`;
}

/**
 * Detects sensitive data in content
 *
 * @param content - Content to scan (workflow JSON as string)
 * @returns Array of sensitive data findings
 */
export function detectSensitiveData(content: string): SensitiveDataFinding[] {
  const findings: SensitiveDataFinding[] = [];

  for (const patternDef of DETECTION_PATTERNS) {
    // Reset regex state
    patternDef.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec loop pattern
    while ((match = patternDef.pattern.exec(content)) !== null) {
      const matchedValue = match[1] || match[0]; // Use capture group if available
      const position = match.index;

      // Validate minimum length if specified
      if (patternDef.minLength && matchedValue.length < patternDef.minLength) {
        continue;
      }

      findings.push({
        type: patternDef.type,
        maskedValue: maskValue(matchedValue),
        position,
        context: extractContext(content, position),
        severity: patternDef.severity,
      });
    }
  }

  return findings;
}

/**
 * Checks if workflow content contains sensitive data
 *
 * @param workflowContent - Workflow JSON as string
 * @returns True if sensitive data detected, false otherwise
 */
export function hasSensitiveData(workflowContent: string): boolean {
  return detectSensitiveData(workflowContent).length > 0;
}

/**
 * Gets high severity findings only
 *
 * @param findings - All findings
 * @returns High severity findings
 */
export function getHighSeverityFindings(findings: SensitiveDataFinding[]): SensitiveDataFinding[] {
  return findings.filter((finding) => finding.severity === 'high');
}

/**
 * Groups findings by type
 *
 * @param findings - All findings
 * @returns Findings grouped by type
 */
export function groupFindingsByType(
  findings: SensitiveDataFinding[]
): Map<SensitiveDataType, SensitiveDataFinding[]> {
  const grouped = new Map<SensitiveDataType, SensitiveDataFinding[]>();

  for (const finding of findings) {
    const existing = grouped.get(finding.type) || [];
    existing.push(finding);
    grouped.set(finding.type, existing);
  }

  return grouped;
}
