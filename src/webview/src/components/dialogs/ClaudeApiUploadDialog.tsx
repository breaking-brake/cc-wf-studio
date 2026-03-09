/**
 * ClaudeApiUploadDialog Component
 *
 * Dialog for deploying and managing skills on Claude API.
 * Main entry point: skill list view with upload and test capabilities.
 * Supports streaming test execution.
 */

import * as Dialog from '@radix-ui/react-dialog';
import type { Workflow } from '@shared/types/messages';
import type { McpNode } from '@shared/types/workflow-definition';
import { Check, Copy, ExternalLink, Send } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  checkAnthropicApiKey,
  clearAnthropicApiKey,
  deleteCustomSkill,
  executeUploadedSkill,
  getResponseLanguage,
  getSavedMcpServerUrls,
  getSkillVersionDetails,
  listCustomSkills,
  lookupMcpRegistry,
  openExternalUrl,
  saveMcpServerUrls,
  saveResponseLanguage,
  storeAnthropicApiKey,
  uploadDependentSkill,
  uploadToClaudeApi,
} from '../../services/vscode-bridge';
import { serializeWorkflow, validateWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { CodeBlock } from '../common/CodeBlock';
import { SelectTagInput } from '../common/SelectTagInput';
import { ConfirmDialog } from './ConfirmDialog';

type DialogState =
  | 'check-api-key'
  | 'enter-api-key'
  | 'skill-list-loading'
  | 'skill-list'
  | 'confirm-upload'
  | 'uploading'
  | 'success'
  | 'error'
  | 'sample-code';

type SampleCodeLang = 'curl' | 'python' | 'typescript';

interface CustomSkillInfo {
  id: string;
  displayTitle: string;
  latestVersion: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  stopReason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

function localeToLanguageName(locale: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(locale);
    return name || locale;
  } catch {
    return locale;
  }
}

function generateSampleCode(
  skillId: string,
  lang: SampleCodeLang,
  skillName?: string,
  mcpServers?: Array<{ id: string; url: string; authorization_token?: string }>,
  model?: string,
  system?: string
): string {
  const modelId = model || 'claude-haiku-4-5-20251001';
  const promptContent = skillName ? `/${skillName}` : `/${skillId}`;
  const hasMcpServers = mcpServers && mcpServers.length > 0;

  switch (lang) {
    case 'curl': {
      const toolsArray = ['{"type": "code_execution_20250825", "name": "code_execution"}'];
      const mcpServersSection =
        hasMcpServers && mcpServers
          ? `,
    "mcp_servers": [
${mcpServers.map((s) => `      {"type": "url", "url": "${s.url || ''}", "name": "${s.id}"${s.authorization_token ? `, "authorization_token": "${s.authorization_token}"` : ''}}`).join(',\n')}
    ]`
          : '';

      if (hasMcpServers && mcpServers) {
        mcpServers.forEach((s) => {
          toolsArray.push(`{"type": "mcp_toolset", "mcp_server_name": "${s.id}"}`);
        });
      }

      const betaHeader = hasMcpServers
        ? 'code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20'
        : 'code-execution-2025-08-25,skills-2025-10-02';

      const systemSection = system
        ? `,
    "system": "${system.replace(/"/g, '\\"')}"`
        : '';

      return `curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "anthropic-beta: ${betaHeader}" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "${modelId}",
    "max_tokens": 4096,
    "container": {
      "skills": [{"type": "custom", "skill_id": "${skillId}", "version": "latest"}]
    }${mcpServersSection},
    "tools": [${toolsArray.join(', ')}],
    "messages": [{"role": "user", "content": "${promptContent}"}]${systemSection}
  }'`;
    }

    case 'python': {
      const toolsList = '{"type": "code_execution_20250825", "name": "code_execution"}';
      const toolsArray = `[${toolsList}${hasMcpServers && mcpServers ? `, ${mcpServers.map((s) => `{"type": "mcp_toolset", "mcp_server_name": "${s.id}"}`).join(', ')}` : ''}]`;

      const extraBody = hasMcpServers
        ? `,
    extra_body={
        "mcp_servers": [
${mcpServers?.map((s) => `            {"type": "url", "url": "${s.url || ''}", "name": "${s.id}"${s.authorization_token ? `, "authorization_token": "${s.authorization_token}"` : ''}}`).join(',\n')}
        ]
    }`
        : '';

      const extraHeaders = hasMcpServers
        ? `,
    extra_headers={"anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20"}`
        : '';

      const systemParam = system
        ? `,
    system="${system.replace(/"/g, '\\"')}"`
        : '';

      return `import anthropic

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

response = client.messages.create(
    model="${modelId}",
    max_tokens=4096,
    container={"skills": [{"type": "custom", "skill_id": "${skillId}", "version": "latest"}]},
    tools=${toolsArray},
    messages=[{"role": "user", "content": "${promptContent}"}]${systemParam}${extraHeaders}${extraBody},
)
print(response.content[0].text)`;
    }

    case 'typescript': {
      const toolsList = '{ type: "code_execution_20250825", name: "code_execution" }';
      const toolsArray = `[${toolsList}${hasMcpServers && mcpServers ? `, ${mcpServers.map((s) => `{ type: "mcp_toolset", mcp_server_name: "${s.id}" }`).join(', ')}` : ''}]`;

      const mcpServersField = hasMcpServers
        ? `
  mcp_servers: [
${mcpServers?.map((s) => `    { type: "url", url: "${s.url || ''}", name: "${s.id}"${s.authorization_token ? `, authorization_token: "${s.authorization_token}"` : ''} }`).join(',\n')}
  ],`
        : '';

      const requestOptions = hasMcpServers
        ? `, {
  headers: { "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20" },
}`
        : '';

      const systemField = system
        ? `
  system: "${system.replace(/"/g, '\\"')}",`
        : '';

      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

const response = await client.messages.create({
  model: "${modelId}",
  max_tokens: 4096,${systemField}
  container: { skills: [{ type: "custom", skill_id: "${skillId}", version: "latest" }] },
  tools: ${toolsArray},${mcpServersField}
  messages: [{ role: "user", content: "${promptContent}" }],
}${requestOptions});
console.log(response.content[0].text);`;
    }
  }
}

function generateAuthSampleCode(
  lang: SampleCodeLang,
  mcpServers: Array<{ id: string; url: string }>
): string {
  // Extract base URL for OAuth discovery (remove /mcp path)
  const firstServer = mcpServers[0];
  const baseUrl = firstServer ? firstServer.url.replace(/\/mcp$/, '') : 'https://mcp.example.com';

  if (lang === 'curl') {
    return `# ===== Option A: Bearer Token (PAT / API Key) =====
# Set the token directly in mcp_servers.authorization_token:
"mcp_servers": [
${mcpServers.map((s) => `  {"type": "url", "url": "${s.url}", "name": "${s.id}", "authorization_token": "YOUR_TOKEN"}`).join(',\n')}
]

# ===== Option B: OAuth Flow =====
# Step 1: OAuth Discovery
curl ${baseUrl}/.well-known/oauth-authorization-server

# Step 2: Dynamic Client Registration
curl -X POST ${baseUrl}/register \\
  -H "content-type: application/json" \\
  -d '{"client_name": "my-app", "redirect_uris": ["http://localhost:3000/callback"], "grant_types": ["authorization_code"], "token_endpoint_auth_method": "none"}'

# Step 3: Open browser for authorization (use client_id from Step 2)
# ${baseUrl}/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=http://localhost:3000/callback&code_challenge=CHALLENGE&code_challenge_method=S256

# Step 4: Exchange code for token
curl -X POST ${baseUrl}/token \\
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=http://localhost:3000/callback&client_id=CLIENT_ID&code_verifier=VERIFIER"

# Step 5: Use the access_token in your API call
"mcp_servers": [
${mcpServers.map((s) => `  {"type": "url", "url": "${s.url}", "name": "${s.id}", "authorization_token": "ACCESS_TOKEN"}`).join(',\n')}
]`;
  }

  if (lang === 'python') {
    return `# ===== Option A: Bearer Token (PAT / API Key) =====
# Simply pass the token to call_with_mcp:
# response = call_with_mcp(access_token="YOUR_TOKEN", prompt="your prompt")

# ===== Option B: OAuth Flow =====
# MCP OAuth Authentication + Claude API Integration
import anthropic
import requests
import secrets
import hashlib
import base64

# --- Step 1: OAuth Discovery ---
def discover_oauth(mcp_base_url: str) -> dict:
    resp = requests.get(f"{mcp_base_url}/.well-known/oauth-authorization-server")
    resp.raise_for_status()
    return resp.json()

# --- Step 2: Dynamic Client Registration ---
def register_client(registration_endpoint: str, redirect_uri: str) -> dict:
    resp = requests.post(registration_endpoint, json={
        "client_name": "my-app",
        "redirect_uris": [redirect_uri],
        "grant_types": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_method": "none",
    })
    resp.raise_for_status()
    return resp.json()

# --- Step 3: PKCE helpers ---
def generate_pkce():
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge

# --- Step 4: Token Exchange ---
def exchange_token(token_endpoint: str, client_id: str, code: str,
                   redirect_uri: str, code_verifier: str) -> dict:
    resp = requests.post(token_endpoint, data={
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "code_verifier": code_verifier,
    })
    resp.raise_for_status()
    return resp.json()

# --- Step 5: Call Claude API with OAuth token ---
def call_with_mcp(access_token: str, prompt: str):
    client = anthropic.Anthropic()
    return client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        tools=[{"type": "code_execution_20250825", "name": "code_execution"}, ${mcpServers.map((s) => `{"type": "mcp_toolset", "mcp_server_name": "${s.id}"}`).join(', ')}],
        messages=[{"role": "user", "content": prompt}],
        extra_headers={"anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20"},
        extra_body={
            "mcp_servers": [
${mcpServers
  .map(
    (s) =>
      `                {"type": "url", "url": "${s.url}", "name": "${s.id}", "authorization_token": access_token}`
  )
  .join(',\n')}
            ]
        },
    )

# --- Usage ---
# metadata = discover_oauth("${baseUrl}")
# client_info = register_client(metadata["registration_endpoint"], "http://localhost:3000/callback")
# verifier, challenge = generate_pkce()
# # Redirect user to: metadata["authorization_endpoint"]?client_id=...&code_challenge=...
# # After callback, exchange the code:
# token_data = exchange_token(metadata["token_endpoint"], client_info["client_id"], code, redirect_uri, verifier)
# response = call_with_mcp(token_data["access_token"], "your prompt")`;
  }

  return `// ===== Option A: Bearer Token (PAT / API Key) =====
// Simply pass the token to callWithMcp:
// const response = await callWithMcp("YOUR_TOKEN", "your prompt");

// ===== Option B: OAuth Flow =====
// MCP OAuth Authentication + Claude API Integration
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

// --- Step 1: OAuth Discovery ---
async function discoverOAuth(mcpBaseUrl: string) {
  const resp = await fetch(\`\${mcpBaseUrl}/.well-known/oauth-authorization-server\`);
  return resp.json();
}

// --- Step 2: Dynamic Client Registration ---
async function registerClient(registrationEndpoint: string, redirectUri: string) {
  const resp = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "my-app",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "none",
    }),
  });
  return resp.json();
}

// --- Step 3: PKCE helpers ---
function generatePkce() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// --- Step 4: Token Exchange ---
async function exchangeToken(tokenEndpoint: string, clientId: string, code: string,
                             redirectUri: string, codeVerifier: string) {
  const resp = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: redirectUri,
      client_id: clientId, code_verifier: codeVerifier,
    }),
  });
  return resp.json();
}

// --- Step 5: Call Claude API with OAuth token ---
async function callWithMcp(accessToken: string, prompt: string) {
  const client = new Anthropic();
  return client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [{ type: "code_execution_20250825", name: "code_execution" }, ${mcpServers.map((s) => `{ type: "mcp_toolset", mcp_server_name: "${s.id}" }`).join(', ')}],
    mcp_servers: [
${mcpServers
  .map(
    (s) =>
      `      { type: "url", url: "${s.url}", name: "${s.id}", authorization_token: accessToken }`
  )
  .join(',\n')}
    ],
    messages: [{ role: "user", content: prompt }],
  } as any, {
    headers: { "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20" },
  });
}

// --- Usage ---
// const metadata = await discoverOAuth("${baseUrl}");
// const clientInfo = await registerClient(metadata.registration_endpoint, "http://localhost:3000/callback");
// const { verifier, challenge } = generatePkce();
// // Redirect user to: metadata.authorization_endpoint?client_id=...&code_challenge=...
// // After callback, exchange the code:
// const tokenData = await exchangeToken(metadata.token_endpoint, clientInfo.client_id, code, redirectUri, verifier);
// const response = await callWithMcp(tokenData.access_token, "your prompt");`;
}

const AuthCodeSnippet: React.FC<{
  mcpServers: Array<{ id: string; url: string }>;
  lang: SampleCodeLang;
}> = ({ mcpServers, lang }) => {
  const [open, setOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const code = generateAuthSampleCode(lang, mcpServers);

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          padding: '6px 0',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--vscode-foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          userSelect: 'none',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.15s',
            fontSize: '9px',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
        Need authentication?
      </button>
      {open && (
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              marginBottom: '8px',
              lineHeight: '1.5',
            }}
          >
            For MCP servers requiring OAuth, obtain an access_token via{' '}
            <span
              role="button"
              tabIndex={0}
              onClick={() =>
                openExternalUrl('https://modelcontextprotocol.io/docs/tools/inspector')
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openExternalUrl('https://modelcontextprotocol.io/docs/tools/inspector');
                }
              }}
              style={{
                cursor: 'pointer',
                color: 'var(--vscode-textLink-foreground)',
                textDecoration: 'underline',
              }}
            >
              MCP Inspector <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
            </span>
            :
          </div>
          <ol
            style={{
              margin: '0 0 8px 16px',
              padding: 0,
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              lineHeight: '1.6',
            }}
          >
            <li style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              Run: <code style={{ fontSize: '10px' }}>npx @modelcontextprotocol/inspector</code>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  navigator.clipboard.writeText('npx @modelcontextprotocol/inspector');
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigator.clipboard.writeText('npx @modelcontextprotocol/inspector');
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2000);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  color: copiedCmd
                    ? 'var(--vscode-testing-iconPassed, #73c991)'
                    : 'var(--vscode-descriptionForeground)',
                  display: 'inline-flex',
                }}
                title={copiedCmd ? 'Copied!' : 'Copy to clipboard'}
              >
                {copiedCmd ? <Check size={10} /> : <Copy size={10} />}
              </span>
            </li>
            <li>
              In the sidebar: select transport type, enter the server URL, and click "Connect"
            </li>
            <li>In the main area: click "Open Auth Settings" → "Quick OAuth Flow"</li>
            <li>
              Complete authorization, expand "Access Token" at the bottom of OAuth Flow Progress,
              and copy the <code style={{ fontSize: '10px' }}>access_token</code> value from the
              JSON
            </li>
          </ol>
          <CodeBlock
            onCopy={() => navigator.clipboard.writeText(code)}
            style={{
              backgroundColor: 'var(--vscode-textCodeBlock-background)',
              border: '1px solid var(--vscode-panel-border)',
              maxHeight: '40vh',
            }}
          >
            {code}
          </CodeBlock>
        </div>
      )}
    </div>
  );
};

const McpServerUrlForm: React.FC<{
  serverIds: string[];
  urls: Record<string, string>;
  onUrlChange: (id: string, url: string) => void;
  tokens?: Record<string, string>;
  onTokenChange?: (id: string, token: string) => void;
  serverOwners?: Record<string, string[]>;
}> = ({ serverIds, urls, onUrlChange, tokens, onTokenChange, serverOwners }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const hasAnyToken = tokens && Object.values(tokens).some((t) => t.trim());

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--vscode-foreground)',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        MCP Server URLs
        <span
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            borderRadius: '3px',
            backgroundColor: 'var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.1))',
            color: 'var(--vscode-errorForeground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder, rgba(255,0,0,0.3))',
            fontWeight: 400,
          }}
        >
          required
        </span>
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          marginBottom: '8px',
          lineHeight: '1.4',
        }}
      >
        Claude API supports remote HTTP MCP servers only (type: url).
        <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
          ・Don't know the URL?{' '}
          <span
            role="button"
            tabIndex={0}
            onClick={() => openExternalUrl('https://www.pulsemcp.com/servers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                openExternalUrl('https://www.pulsemcp.com/servers');
              }
            }}
            style={{
              cursor: 'pointer',
              color: 'var(--vscode-textLink-foreground)',
              textDecoration: 'underline',
            }}
            title="Search MCP server URLs on PulseMCP"
          >
            Search on PulseMCP <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
          </span>
        </div>
      </div>
      {serverIds.map((id) => {
        const owners = serverOwners?.[id];
        return (
          <div
            key={id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: id !== serverIds[serverIds.length - 1] ? '8px' : 0,
            }}
          >
            <div>
              <label
                htmlFor={`mcp-url-${id}`}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--vscode-descriptionForeground)',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={id}
              >
                {id}
              </label>
              {owners && owners.length > 0 && (
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    opacity: 0.8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={owners.join(', ')}
                >
                  ← {owners.join(', ')}
                </div>
              )}
            </div>
            <input
              id={`mcp-url-${id}`}
              type="text"
              placeholder="https://..."
              value={urls[id] || ''}
              onChange={(e) => onUrlChange(id, e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '2px',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>
        );
      })}

      {/* Authentication accordion */}
      {onTokenChange && (
        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => setAuthOpen((v) => !v)}
            style={{
              width: '100%',
              padding: '4px 0',
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              userSelect: 'none',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 0.15s',
                fontSize: '9px',
                transform: authOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              ▶
            </span>
            Need authentication?
            {hasAnyToken && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '0 4px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--vscode-badge-background)',
                  color: 'var(--vscode-badge-foreground)',
                }}
              >
                ✓
              </span>
            )}
          </button>
          {authOpen && (
            <div
              style={{
                padding: '8px 0 0 0',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.5',
              }}
            >
              {/* Section 1: Bearer Token */}
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--vscode-textCodeBlock-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '4px',
                  }}
                >
                  Enter Bearer Token
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginBottom: '8px',
                  }}
                >
                  Paste a PAT or API key.
                </div>
                {serverIds.map((id) => (
                  <div key={`bearer-${id}`} style={{ marginBottom: '6px' }}>
                    <label
                      htmlFor={`mcp-bearer-${id}`}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: 'var(--vscode-descriptionForeground)',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      {id}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          color: 'var(--vscode-descriptionForeground)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Bearer
                      </span>
                      <input
                        id={`mcp-bearer-${id}`}
                        type="password"
                        placeholder="Paste token here"
                        value={tokens?.[id] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^Bearer\s+/i, '');
                          onTokenChange(id, val);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          backgroundColor: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* "or" divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '10px 0',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                  }}
                />
              </div>

              {/* Section 2: OAuth via MCP Inspector */}
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--vscode-textCodeBlock-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '4px',
                  }}
                >
                  Obtain Token via OAuth
                </div>
                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  Use{' '}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openExternalUrl('https://modelcontextprotocol.io/docs/tools/inspector')
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        openExternalUrl('https://modelcontextprotocol.io/docs/tools/inspector');
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      color: 'var(--vscode-textLink-foreground)',
                      textDecoration: 'underline',
                    }}
                  >
                    MCP Inspector <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
                  </span>{' '}
                  to complete OAuth flow:
                </div>
                <ol
                  style={{
                    margin: '0 0 8px 16px',
                    padding: 0,
                    fontSize: '10px',
                    lineHeight: '1.6',
                  }}
                >
                  <li
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}
                  >
                    Run:{' '}
                    <code style={{ fontSize: '10px' }}>npx @modelcontextprotocol/inspector</code>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        navigator.clipboard.writeText('npx @modelcontextprotocol/inspector');
                        setCopiedCmd(true);
                        setTimeout(() => setCopiedCmd(false), 2000);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigator.clipboard.writeText('npx @modelcontextprotocol/inspector');
                          setCopiedCmd(true);
                          setTimeout(() => setCopiedCmd(false), 2000);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        color: copiedCmd
                          ? 'var(--vscode-testing-iconPassed, #73c991)'
                          : 'var(--vscode-descriptionForeground)',
                        display: 'inline-flex',
                      }}
                      title={copiedCmd ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {copiedCmd ? <Check size={10} /> : <Copy size={10} />}
                    </span>
                  </li>
                  <li>
                    In the sidebar: select transport type, enter the server URL, and click "Connect"
                  </li>
                  <li>In the main area: click "Open Auth Settings" → "Quick OAuth Flow"</li>
                  <li>
                    Complete authorization, expand "Access Token" at the bottom of OAuth Flow
                    Progress, and copy the <code style={{ fontSize: '10px' }}>access_token</code>{' '}
                    value from the JSON
                  </li>
                </ol>
                {serverIds.map((id) => (
                  <div key={`oauth-${id}`} style={{ marginBottom: '6px' }}>
                    <label
                      htmlFor={`mcp-token-${id}`}
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: 'var(--vscode-descriptionForeground)',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      {id}
                    </label>
                    <input
                      id={`mcp-token-${id}`}
                      type="password"
                      placeholder="Paste access_token here"
                      value={tokens?.[id] || ''}
                      onChange={(e) => onTokenChange(id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TabBar: React.FC<{
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      setIndicator({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        position: 'relative',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-tab-id={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '4px 12px 8px',
            backgroundColor: 'transparent',
            color:
              activeTab === tab.id
                ? 'var(--vscode-tab-activeForeground)'
                : 'var(--vscode-tab-inactiveForeground)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: activeTab === tab.id ? 500 : 400,
            transition: 'color 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: '-1px',
          height: '2px',
          backgroundColor: 'var(--vscode-tab-activeBorder)',
          borderRadius: '1px',
          transition: 'left 0.2s ease, width 0.2s ease',
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
        }}
      />
    </div>
  );
};

const Spinner: React.FC = () => (
  <>
    <span
      style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid var(--vscode-descriptionForeground)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </>
);

const TypingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <span
      style={{
        color: 'var(--vscode-descriptionForeground)',
        fontStyle: 'italic',
        fontFamily: 'monospace',
        width: '3ch',
        display: 'inline-block',
      }}
    >
      {'.'.repeat(dotCount)}
    </span>
  );
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 16px',
  backgroundColor: 'var(--vscode-button-secondaryBackground)',
  color: 'var(--vscode-button-secondaryForeground)',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer',
  fontSize: '13px',
};

const btnPrimary: React.CSSProperties = {
  ...btnSecondary,
  backgroundColor: 'var(--vscode-button-background)',
  color: 'var(--vscode-button-foreground)',
  fontWeight: 500,
};

const PANEL_MIN_WIDTH = 180;
const PANEL_MAX_WIDTH = 400;
const PANEL_DEFAULT_WIDTH = 240;

const ResizeDivider: React.FC<{
  onResize: (deltaX: number) => void;
}> = ({ onResize }) => {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onResize(e.movementX);
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, onResize]);

  return (
    <div
      onMouseDown={() => setDragging(true)}
      style={{
        width: '5px',
        cursor: 'col-resize',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '1px',
          height: '40px',
          backgroundColor: dragging ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)',
          borderRadius: '1px',
          transition: dragging ? 'none' : 'background-color 0.15s',
        }}
      />
    </div>
  );
};

interface ClaudeApiUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClaudeApiUploadDialog: React.FC<ClaudeApiUploadDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<DialogState>('check-api-key');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    skillId: string;
    version: string;
    isNewVersion: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample code state
  const [sampleCodeLang, setSampleCodeLang] = useState<SampleCodeLang>('curl');
  const [sampleCodeTab, setSampleCodeTab] = useState<'code' | 'test'>('test');

  // Skill list state
  const [skills, setSkills] = useState<CustomSkillInfo[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedSkillDisplayTitle, setSelectedSkillDisplayTitle] = useState<string | null>(null);
  const [skillListError, setSkillListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Response language state
  const [responseLanguage, setResponseLanguage] = useState(localeToLanguageName(locale));

  // Test chat state
  const [testModel, setTestModel] = useState('claude-haiku-4-5-20251001');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);

  // Additional skills state
  const [additionalSkillIds, setAdditionalSkillIds] = useState<string[]>([]);
  const [additionalSkillsOpen, setAdditionalSkillsOpen] = useState(false);
  // MCP server IDs per additional skill: { skillId: ["server1", "server2"] }
  const [additionalSkillMcpMap, setAdditionalSkillMcpMap] = useState<Record<string, string[]>>({});

  // Dependent skills state
  const [dependentSkillNames, setDependentSkillNames] = useState<string[]>([]);
  const [showSkillValidation, setShowSkillValidation] = useState(false);

  // Dependent skill upload state
  const [uploadingSkills, setUploadingSkills] = useState<
    Record<string, 'uploading' | 'success' | 'error'>
  >({});
  const [uploadSkillErrors, setUploadSkillErrors] = useState<Record<string, string>>({});

  // MCP server URLs and tokens state
  const [mcpServerUrls, setMcpServerUrls] = useState<Record<string, string>>({});
  const [mcpServerTokens, setMcpServerTokens] = useState<Record<string, string>>({});
  const [showMcpValidation, setShowMcpValidation] = useState(false);

  // Skill version details state (for list-selected skills)
  const [skillMcpServerIds, setSkillMcpServerIds] = useState<string[] | null>(null);
  const [isLoadingSkillDetails, setIsLoadingSkillDetails] = useState(false);
  const [isFromStudio, setIsFromStudio] = useState(false);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Left panel width for resizable splitter
  const [leftPanelWidth, setLeftPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const handlePanelResize = useCallback((deltaX: number) => {
    setLeftPanelWidth((w) => Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, w + deltaX)));
  }, []);

  // Auto-scroll ref for chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { nodes, edges, workflowName, workflowDescription } = useWorkflowStore();

  const canvasMcpServerIds = nodes
    .filter((n) => n.type === 'mcp')
    .map((n) => (n as McpNode).data.serverId)
    .filter(Boolean);

  const canvasDependentSkills = nodes
    .filter((n) => n.type === 'skill')
    .map((n) => {
      const data = n.data as { name?: string; skillPath?: string };
      return { name: data.name, skillPath: data.skillPath };
    })
    .filter((s): s is { name: string; skillPath: string } => Boolean(s.name && s.skillPath));

  const canvasDependentSkillNames = canvasDependentSkills.map((s) => s.name);

  // Use canvas MCP server IDs after upload, or API-fetched IDs when viewing from list
  // Also include MCP servers required by additional skills
  const effectiveMcpServerIds = useMemo(() => {
    const base = result ? canvasMcpServerIds : (skillMcpServerIds ?? []);
    const additionalMcpIds = Object.values(additionalSkillMcpMap).flat();
    return [...new Set([...base, ...additionalMcpIds])];
  }, [result, canvasMcpServerIds, skillMcpServerIds, additionalSkillMcpMap]);

  // Map: MCP server ID → skill names that require it
  const mcpServerOwners = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [skillId, serverIds] of Object.entries(additionalSkillMcpMap)) {
      const skillName = skills.find((s) => s.id === skillId)?.displayTitle ?? skillId;
      for (const sid of serverIds) {
        if (!map[sid]) map[sid] = [];
        map[sid].push(skillName);
      }
    }
    return map;
  }, [additionalSkillMcpMap, skills]);

  // Required skill IDs (uploaded skills matching dependent skill names)
  const requiredSkillIds = useMemo(() => {
    const targetId = selectedSkillId || result?.skillId;
    return skills
      .filter((s) => dependentSkillNames.includes(s.displayTitle) && s.id !== targetId)
      .map((s) => s.id);
  }, [skills, dependentSkillNames, selectedSkillId, result]);

  // Dependent skill names that are not yet uploaded
  const missingDependentSkillNames = useMemo(() => {
    const targetId = selectedSkillId || result?.skillId;
    const uploadedTitles = skills.filter((s) => s.id !== targetId).map((s) => s.displayTitle);
    return dependentSkillNames.filter((name) => !uploadedTitles.includes(name));
  }, [dependentSkillNames, skills, selectedSkillId, result]);

  // Required skills missing (not uploaded or not selected)
  const isRequiredSkillsMissing =
    missingDependentSkillNames.length > 0 ||
    requiredSkillIds.some((id) => !additionalSkillIds.includes(id));

  // Debug logging for Additional Skills / lockedValues
  console.log('[AdditionalSkills Debug]', {
    state,
    dependentSkillNames,
    requiredSkillIds,
    missingDependentSkillNames,
    additionalSkillIds,
    isRequiredSkillsMissing,
    selectedSkillId,
    resultSkillId: result?.skillId ?? null,
    skillsList: skills.map((s) => ({ id: s.id, displayTitle: s.displayTitle })),
    canvasDependentSkillNames,
  });

  const reset = useCallback(() => {
    setState('check-api-key');
    setApiKeyInput('');
    setApiKeyError(null);
    setUploadError(null);
    setResult(null);
    setCopied(false);
    setSampleCodeLang('curl');
    setSampleCodeTab('test');
    setSkills([]);
    setSelectedSkillId(null);
    setSelectedSkillDisplayTitle(null);
    setSkillListError(null);
    setTestModel('claude-haiku-4-5-20251001');
    setChatMessages([]);
    setChatInput('');
    setIsExecuting(false);
    setActiveContainerId(null);
    setAdditionalSkillIds([]);
    setAdditionalSkillsOpen(false);
    setAdditionalSkillMcpMap({});
    setDependentSkillNames([]);
    setShowSkillValidation(false);
    setUploadingSkills({});
    setUploadSkillErrors({});
    setSkillMcpServerIds(null);
    setIsLoadingSkillDetails(false);
  }, []);

  const loadSkillList = useCallback(async () => {
    setState('skill-list-loading');
    setSkillListError(null);
    try {
      const result = await listCustomSkills();
      setSkills(result.skills);
      setState('skill-list');
    } catch (err) {
      setSkillListError(err instanceof Error ? err.message : 'Failed to load skills');
      setState('skill-list');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    // Check if API key exists when dialog opens
    checkAnthropicApiKey()
      .then(({ hasApiKey }) => {
        if (hasApiKey) {
          loadSkillList();
        } else {
          setState('enter-api-key');
        }
      })
      .catch(() => {
        setState('enter-api-key');
      });
  }, [isOpen, reset, loadSkillList]);

  // Load saved response language when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    getResponseLanguage()
      .then((saved) => {
        if (saved) {
          setResponseLanguage(saved);
        }
      })
      .catch(() => {
        // Use default locale-based value
      });
  }, [isOpen]);

  // Auto-scroll chat when new messages or streaming updates arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: chatMessages triggers scroll on each update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Restore saved MCP server URLs and lookup missing ones from registry
  const effectiveMcpServerIdsKey = effectiveMcpServerIds.join(',');
  useEffect(() => {
    const serverIds = effectiveMcpServerIdsKey.split(',').filter(Boolean);
    if (state !== 'sample-code' || serverIds.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const saved = await getSavedMcpServerUrls();
        if (cancelled) return;

        setMcpServerUrls((prev) => {
          const merged = { ...prev };
          const missingIds: string[] = [];
          for (const id of serverIds) {
            if (id in prev) continue;
            if (saved.urls[id]) {
              merged[id] = saved.urls[id];
            } else {
              missingIds.push(id);
            }
          }

          if (missingIds.length > 0 && !cancelled) {
            lookupMcpRegistry(missingIds)
              .then((registryResult) => {
                if (cancelled) return;
                if (Object.keys(registryResult.urls).length > 0) {
                  setMcpServerUrls((p) => {
                    const m = { ...p };
                    for (const [rid, rurl] of Object.entries(registryResult.urls)) {
                      if (!(rid in p)) m[rid] = rurl;
                    }
                    return m;
                  });
                  saveMcpServerUrls(registryResult.urls).catch(() => {});
                }
              })
              .catch(() => {});
          }

          return merged;
        });
      } catch {
        // getSavedMcpServerUrls failed — not critical
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state, effectiveMcpServerIdsKey]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.startsWith('sk-ant-')) {
      setApiKeyError('API key must start with "sk-ant-"');
      return;
    }
    try {
      await storeAnthropicApiKey(apiKeyInput);
      setApiKeyInput('');
      setApiKeyError(null);
      loadSkillList();
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  const handleUploadDependentSkill = async (skillName: string, skillPath: string) => {
    setUploadingSkills((prev) => ({ ...prev, [skillName]: 'uploading' }));
    setUploadSkillErrors((prev) => {
      const next = { ...prev };
      delete next[skillName];
      return next;
    });
    try {
      await uploadDependentSkill(skillName, skillPath);
      setUploadingSkills((prev) => ({ ...prev, [skillName]: 'success' }));
      // Refresh skills list to update ✅/❌ status
      const result = await listCustomSkills();
      setSkills(result.skills);
    } catch (err) {
      setUploadingSkills((prev) => ({ ...prev, [skillName]: 'error' }));
      setUploadSkillErrors((prev) => ({
        ...prev,
        [skillName]: err instanceof Error ? err.message : 'Upload failed',
      }));
    }
  };

  const handleUploadAllMissing = async () => {
    const missing = canvasDependentSkills.filter(
      (s) => !skills.some((sk) => sk.displayTitle === s.name)
    );
    for (const skill of missing) {
      await handleUploadDependentSkill(skill.name, skill.skillPath);
    }
  };

  const handleUpload = async () => {
    setState('uploading');
    setUploadError(null);

    try {
      const workflow = serializeWorkflow(nodes, edges, workflowName, workflowDescription);
      validateWorkflow(workflow as Workflow);

      const uploadResult = await uploadToClaudeApi(workflow as Workflow);
      setResult({
        skillId: uploadResult.skillId,
        version: uploadResult.version,
        isNewVersion: uploadResult.isNewVersion,
      });
      setSelectedSkillId(uploadResult.skillId);

      // Set dependent skill names from canvas so Additional Skills works
      // without closing and reopening the dialog
      if (canvasDependentSkillNames.length > 0) {
        setDependentSkillNames(canvasDependentSkillNames);
        // Auto-select matching uploaded skills as additional skills
        const matchedIds = skills
          .filter(
            (s) =>
              canvasDependentSkillNames.includes(s.displayTitle) && s.id !== uploadResult.skillId
          )
          .map((s) => s.id);
        if (matchedIds.length > 0) {
          setAdditionalSkillIds(matchedIds);
          setAdditionalSkillsOpen(true);
        }
      }

      setState('success');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  };

  const handleCopySkillId = () => {
    if (result?.skillId) {
      navigator.clipboard.writeText(result.skillId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeApiKey = () => {
    setState('enter-api-key');
  };

  const handleDeleteApiKey = () => {
    setConfirmAction({
      title: 'Delete API Key',
      message: 'Delete API key? You will need to enter a new key to continue.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await clearAnthropicApiKey();
        setApiKeyInput('');
        setSkills([]);
        setApiKeyError('API key has been deleted.');
        setConfirmAction(null);
      },
    });
  };

  const handleShowSampleCode = async (
    skillId?: string,
    displayTitle?: string,
    latestVersion?: string
  ) => {
    const targetId = skillId || selectedSkillId || result?.skillId;
    const skillChanged = targetId && targetId !== selectedSkillId;
    if (targetId) {
      setSelectedSkillId(targetId);
    }
    const title = displayTitle || selectedSkillDisplayTitle;
    if (displayTitle) {
      setSelectedSkillDisplayTitle(displayTitle);
    }
    if (skillChanged) {
      setChatMessages([]);
      setActiveContainerId(null);
    }
    setChatInput(title ? `/${title}` : 'Please execute the workflow.');
    setState('sample-code');

    // After upload, skill is always from studio
    if (result) {
      setIsFromStudio(true);
    }

    // Fetch skill version details for list-selected skills (not after upload)
    if (!result && targetId && latestVersion) {
      setIsLoadingSkillDetails(true);
      try {
        const details = await getSkillVersionDetails(targetId, latestVersion);
        setSkillMcpServerIds(details.mcpServerIds);
        setIsFromStudio(details.isFromStudio);
        // Auto-select additional skills based on dependent skill names
        setDependentSkillNames(details.dependentSkillNames);
        if (details.dependentSkillNames.length > 0) {
          const matchedIds = skills
            .filter(
              (s) => details.dependentSkillNames.includes(s.displayTitle) && s.id !== targetId
            )
            .map((s) => s.id);
          setAdditionalSkillIds(matchedIds);
          setAdditionalSkillsOpen(true);
        } else {
          setAdditionalSkillIds([]);
          setAdditionalSkillsOpen(false);
        }
      } catch {
        setSkillMcpServerIds([]);
        setIsFromStudio(false);
      } finally {
        setIsLoadingSkillDetails(false);
      }
    }
  };

  const mcpServersForCode = useMemo(
    () =>
      effectiveMcpServerIds.map((id) => ({
        id,
        url: mcpServerUrls[id] || '',
        authorization_token: mcpServerTokens[id] || undefined,
      })),
    [effectiveMcpServerIds, mcpServerUrls, mcpServerTokens]
  );

  const isMcpUrlsMissing =
    effectiveMcpServerIds.length > 0 &&
    effectiveMcpServerIds.some((id) => !mcpServerUrls[id]?.trim() && !mcpServerTokens[id]?.trim());

  const handleStartTest = async (
    skillId?: string,
    displayTitle?: string,
    latestVersion?: string
  ) => {
    const targetId = skillId || selectedSkillId || result?.skillId;
    if (targetId) {
      setSelectedSkillId(targetId);
    }
    const title = displayTitle || selectedSkillDisplayTitle;
    setChatMessages([]);
    setActiveContainerId(null);
    setChatInput(title ? `/${title}` : 'Please execute the workflow.');
    setIsExecuting(false);
    setState('sample-code');
    setSampleCodeTab('test');
    if (displayTitle) setSelectedSkillDisplayTitle(displayTitle);

    // Fetch skill version details for list-selected skills (not after upload)
    if (!result && targetId && latestVersion) {
      setIsLoadingSkillDetails(true);
      try {
        const details = await getSkillVersionDetails(targetId, latestVersion);
        setSkillMcpServerIds(details.mcpServerIds);
        setIsFromStudio(details.isFromStudio);
        // Auto-select additional skills based on dependent skill names
        setDependentSkillNames(details.dependentSkillNames);
        if (details.dependentSkillNames.length > 0) {
          const matchedIds = skills
            .filter(
              (s) => details.dependentSkillNames.includes(s.displayTitle) && s.id !== targetId
            )
            .map((s) => s.id);
          setAdditionalSkillIds(matchedIds);
          setAdditionalSkillsOpen(true);
        } else {
          setAdditionalSkillIds([]);
          setAdditionalSkillsOpen(false);
        }
      } catch {
        setSkillMcpServerIds([]);
        setIsFromStudio(false);
      } finally {
        setIsLoadingSkillDetails(false);
      }
    }
  };

  const handleAdditionalSkillsChange = useCallback(
    async (newIds: string[]) => {
      setAdditionalSkillIds(newIds);

      // Clear skill validation if all required skills are now selected
      if (
        requiredSkillIds.every((id) => newIds.includes(id)) &&
        missingDependentSkillNames.length === 0
      ) {
        setShowSkillValidation(false);
      }

      // Remove entries for deselected skills
      setAdditionalSkillMcpMap((prev) => {
        const next: Record<string, string[]> = {};
        for (const id of newIds) {
          if (prev[id]) next[id] = prev[id];
        }
        return next;
      });

      // Fetch MCP server IDs for newly added skills
      for (const id of newIds) {
        if (additionalSkillMcpMap[id] !== undefined) continue; // Already fetched
        const skill = skills.find((s) => s.id === id);
        if (!skill) continue;
        try {
          const details = await getSkillVersionDetails(id, skill.latestVersion);
          setAdditionalSkillMcpMap((prev) => ({ ...prev, [id]: details.mcpServerIds }));
        } catch {
          setAdditionalSkillMcpMap((prev) => ({ ...prev, [id]: [] }));
        }
      }
    },
    [skills, additionalSkillMcpMap, requiredSkillIds, missingDependentSkillNames]
  );

  const totalUsage = useMemo(() => {
    let lastInput = 0;
    let totalOutput = 0;
    for (const msg of chatMessages) {
      if (msg.usage) {
        lastInput = msg.usage.input_tokens;
        totalOutput += msg.usage.output_tokens;
      }
    }
    return lastInput + totalOutput > 0
      ? { input_tokens: lastInput, output_tokens: totalOutput }
      : null;
  }, [chatMessages]);

  const handleNewConversation = () => {
    setChatMessages([]);
    setActiveContainerId(null);
    const title = selectedSkillDisplayTitle;
    setChatInput(title ? `/${title}` : 'Please execute the workflow.');
  };

  const handleSendMessage = async () => {
    const targetSkillId = selectedSkillId || result?.skillId;
    if (!targetSkillId || !chatInput.trim() || isExecuting) return;

    if (isRequiredSkillsMissing) {
      setShowSkillValidation(true);
      setAdditionalSkillsOpen(true);
      return;
    }

    if (isMcpUrlsMissing) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    const assistantMessage: ChatMessage = { role: 'assistant', content: '', isStreaming: true };

    setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
    setChatInput('');
    setIsExecuting(true);

    try {
      // 送信前の chatMessages を history として使用（エラーメッセージとstreaming中を除外）
      const historyForApi = chatMessages
        .filter((m) => !m.isError && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const activeMcpServers = mcpServersForCode.filter((s) => s.url.trim());
      const systemPrompt = responseLanguage ? `Respond in ${responseLanguage}.` : undefined;
      const execResult = await executeUploadedSkill(
        targetSkillId,
        userMessage.content,
        testModel,
        ({ accumulatedText }) => {
          setChatMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = { ...updated[lastIdx], content: accumulatedText };
            return updated;
          });
        },
        historyForApi,
        activeContainerId ?? undefined,
        activeMcpServers.length > 0 ? activeMcpServers : undefined,
        additionalSkillIds.length > 0 ? additionalSkillIds : undefined,
        systemPrompt
      );
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: execResult.responseText,
          isStreaming: false,
          stopReason: execResult.stopReason,
          usage: execResult.usage,
        };
        return updated;
      });

      // レスポンスから containerId を保存（初回実行時のみ）
      if (execResult.containerId && !activeContainerId) {
        setActiveContainerId(execResult.containerId);
      }
    } catch (err) {
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Execution failed',
          isStreaming: false,
          isError: true,
        };
        return updated;
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleBackToList = () => {
    loadSkillList();
  };

  const handleClose = () => {
    onClose();
  };

  const getTitle = (): string => {
    if (state === 'sample-code') return 'API Test';
    if (state === 'skill-list' || state === 'skill-list-loading') return 'Claude API';
    if (state === 'confirm-upload' || state === 'uploading') return 'Claude API';
    if (state === 'success') return 'Claude API';
    if (state === 'error') return 'Claude API';
    if (state === 'enter-api-key') return 'API Key Required';
    return 'Claude API';
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <Dialog.Content
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                padding: '24px',
                width: state === 'sample-code' ? '90vw' : undefined,
                minWidth: state === 'sample-code' ? '90vw' : '540px',
                maxWidth: state === 'sample-code' ? '90vw' : '720px',
                height: state === 'sample-code' ? '90vh' : undefined,
                maxHeight: '90vh',
                transition: 'min-width 0.2s, max-width 0.2s',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                outline: 'none',
              }}
            >
              <Dialog.Title
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '16px',
                  flexShrink: 0,
                }}
              >
                {getTitle()}
              </Dialog.Title>
              <div style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
                {/* Loading state */}
                {state === 'check-api-key' && (
                  <div
                    style={{
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Spinner />
                    Checking API key...
                  </div>
                )}

                {/* API Key Input */}
                {state === 'enter-api-key' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Dialog.Description
                      style={{
                        fontSize: '13px',
                        color: 'var(--vscode-descriptionForeground)',
                        lineHeight: '1.5',
                        margin: 0,
                      }}
                    >
                      Enter your Anthropic API key to deploy and manage skills. The key will be
                      stored securely in VS Code's secret storage. You can create an API key{' '}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => openExternalUrl('https://platform.claude.com/settings/keys')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            openExternalUrl('https://platform.claude.com/settings/keys');
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          color: 'var(--vscode-textLink-foreground)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        here <ExternalLink size={11} />
                      </span>
                      .
                    </Dialog.Description>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label
                        htmlFor="anthropic-api-key"
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-foreground)',
                          fontWeight: 500,
                        }}
                      >
                        API Key
                      </label>
                      <input
                        id="anthropic-api-key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={apiKeyInput}
                        onChange={(e) => {
                          setApiKeyInput(e.target.value);
                          setApiKeyError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          border: `1px solid ${apiKeyError ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                          borderRadius: '2px',
                          fontSize: '13px',
                          outline: 'none',
                          fontFamily: 'monospace',
                        }}
                      />
                      {apiKeyError && (
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--vscode-errorForeground)',
                          }}
                        >
                          {apiKeyError}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {skills.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeleteApiKey}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: 'transparent',
                            color: 'var(--vscode-errorForeground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginRight: 'auto',
                          }}
                        >
                          Delete API Key
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={skills.length > 0 ? handleBackToList : handleClose}
                        style={btnSecondary}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveApiKey}
                        disabled={!apiKeyInput}
                        style={{
                          ...btnPrimary,
                          ...(apiKeyInput
                            ? {}
                            : {
                                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                cursor: 'default',
                              }),
                        }}
                      >
                        Save & Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Skill List Loading */}
                {state === 'skill-list-loading' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: '13px',
                      padding: '16px 0',
                    }}
                  >
                    <Spinner />
                    Loading skills...
                  </div>
                )}

                {/* Skill List */}
                {state === 'skill-list' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-descriptionForeground)',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-line',
                        padding: '8px 12px',
                        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                      }}
                    >
                      {t('claudeApi.description')}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        Uploaded Skills
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openExternalUrl('https://platform.claude.com/workspaces/default/skills')
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            openExternalUrl(
                              'https://platform.claude.com/workspaces/default/skills'
                            );
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: 'var(--vscode-textLink-foreground)',
                          fontSize: '11px',
                        }}
                        title="Open in Claude Platform"
                      >
                        platform.claude.com
                        <ExternalLink size={11} />
                      </span>
                    </div>

                    {skillListError && (
                      <div
                        style={{
                          padding: '8px 12px',
                          backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                          border: '1px solid var(--vscode-inputValidation-errorBorder)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'var(--vscode-errorForeground)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {skillListError}
                      </div>
                    )}

                    {skills.length === 0 && !skillListError && (
                      <div
                        style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: 'var(--vscode-descriptionForeground)',
                          fontSize: '13px',
                        }}
                      >
                        No custom skills found. Upload your first workflow!
                      </div>
                    )}

                    {skills.length > 0 && (
                      <div
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          border: '1px solid var(--vscode-panel-border)',
                          borderRadius: '4px',
                        }}
                      >
                        {skills.map((skill) => (
                          <div
                            key={skill.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--vscode-panel-border)',
                              gap: '8px',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--vscode-foreground)',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {skill.displayTitle}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--vscode-descriptionForeground)',
                                  fontFamily: 'monospace',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {skill.id} &middot; v{skill.latestVersion}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleShowSampleCode(
                                  skill.id,
                                  skill.displayTitle,
                                  skill.latestVersion
                                )
                              }
                              style={{
                                padding: '4px 12px',
                                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              API Test
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  id: skill.id,
                                  title: skill.displayTitle,
                                })
                              }
                              style={{
                                padding: '4px 12px',
                                backgroundColor: 'transparent',
                                color: 'var(--vscode-errorForeground)',
                                border: '1px solid var(--vscode-errorForeground)',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleChangeApiKey}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: 'transparent',
                          color: 'var(--vscode-textLink-foreground)',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginRight: 'auto',
                        }}
                      >
                        Change API Key
                      </button>
                      <button type="button" onClick={handleClose} style={btnSecondary}>
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => setState('confirm-upload')}
                        style={btnPrimary}
                      >
                        Upload New
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Upload */}
                {state === 'confirm-upload' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          marginBottom: '8px',
                        }}
                      >
                        Workflow to upload:
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: 'var(--vscode-foreground)',
                          fontWeight: 500,
                          marginBottom: '4px',
                        }}
                      >
                        {workflowName || 'Untitled'}
                      </div>
                      {workflowDescription && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--vscode-descriptionForeground)',
                            lineHeight: '1.4',
                          }}
                        >
                          {workflowDescription.length > 200
                            ? `${workflowDescription.substring(0, 200)}...`
                            : workflowDescription}
                        </div>
                      )}
                    </div>

                    {canvasMcpServerIds.length > 0 && (
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--vscode-inputValidation-warningBackground)',
                          border: '1px solid var(--vscode-inputValidation-warningBorder)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          This workflow contains MCP Tool nodes
                        </div>
                        <div style={{ marginBottom: '4px' }}>{canvasMcpServerIds.join(', ')}</div>
                        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          Claude API only supports remote HTTP MCP servers (type: url). Local stdio
                          servers cannot be used. You will need to set the server URLs in the Sample
                          Code / Test screen after uploading.
                        </div>
                      </div>
                    )}

                    {canvasDependentSkillNames.length > 0 && (
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: canvasDependentSkillNames.some(
                            (name) => !skills.some((s) => s.displayTitle === name)
                          )
                            ? 'var(--vscode-inputValidation-warningBackground)'
                            : 'var(--vscode-editor-inactiveSelectionBackground)',
                          border: `1px solid ${
                            canvasDependentSkillNames.some(
                              (name) => !skills.some((s) => s.displayTitle === name)
                            )
                              ? 'var(--vscode-inputValidation-warningBorder)'
                              : 'var(--vscode-panel-border)'
                          }`,
                          borderRadius: '4px',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          This workflow depends on other skills
                        </div>
                        {canvasDependentSkills.map((skill) => {
                          const isUploaded = skills.some((s) => s.displayTitle === skill.name);
                          const uploadState = uploadingSkills[skill.name];
                          const uploadErr = uploadSkillErrors[skill.name];
                          return (
                            <div
                              key={skill.name}
                              style={{
                                paddingLeft: '4px',
                                lineHeight: '1.6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    isUploaded || uploadState === 'success'
                                      ? 'var(--vscode-foreground)'
                                      : 'var(--vscode-errorForeground)',
                                }}
                              >
                                {isUploaded || uploadState === 'success' ? '\u2705' : '\u274C'}{' '}
                                {skill.name}
                              </span>
                              {!isUploaded &&
                                uploadState !== 'success' &&
                                uploadState !== 'uploading' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUploadDependentSkill(skill.name, skill.skillPath)
                                    }
                                    style={{
                                      padding: '1px 8px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                      color: 'var(--vscode-button-secondaryForeground)',
                                      border:
                                        '1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent))',
                                      borderRadius: '2px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {uploadState === 'error' ? 'Retry' : 'Upload'}
                                  </button>
                                )}
                              {uploadState === 'uploading' && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '12px',
                                    height: '12px',
                                    border: '2px solid var(--vscode-descriptionForeground)',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                  }}
                                />
                              )}
                              {uploadState === 'error' && uploadErr && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--vscode-errorForeground)',
                                  }}
                                >
                                  {uploadErr}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {canvasDependentSkills.filter(
                          (s) =>
                            !skills.some((sk) => sk.displayTitle === s.name) &&
                            uploadingSkills[s.name] !== 'success'
                        ).length >= 2 && (
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={handleUploadAllMissing}
                              disabled={Object.values(uploadingSkills).some(
                                (s) => s === 'uploading'
                              )}
                              style={{
                                padding: '3px 12px',
                                fontSize: '11px',
                                backgroundColor: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border:
                                  '1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent))',
                                borderRadius: '2px',
                                cursor: Object.values(uploadingSkills).some(
                                  (s) => s === 'uploading'
                                )
                                  ? 'not-allowed'
                                  : 'pointer',
                                opacity: Object.values(uploadingSkills).some(
                                  (s) => s === 'uploading'
                                )
                                  ? 0.6
                                  : 1,
                              }}
                            >
                              Upload All Missing
                            </button>
                          </div>
                        )}
                        {canvasDependentSkillNames.some(
                          (name) => !skills.some((s) => s.displayTitle === name)
                        ) &&
                          !Object.values(uploadingSkills).some((s) => s === 'uploading') && (
                            <div
                              style={{
                                marginTop: '6px',
                                color: 'var(--vscode-descriptionForeground)',
                              }}
                            >
                              Dependent skills must be uploaded before this skill can work
                              correctly. You can still upload now and add dependencies later.
                            </div>
                          )}
                      </div>
                    )}

                    <Dialog.Description
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-descriptionForeground)',
                        lineHeight: '1.4',
                        margin: 0,
                      }}
                    >
                      If a skill with the same name already exists, a new version will be created.
                    </Dialog.Description>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleBackToList} style={btnSecondary}>
                        Back
                      </button>
                      <button type="button" onClick={handleUpload} style={btnPrimary}>
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {/* Uploading */}
                {state === 'uploading' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: '13px',
                      padding: '16px 0',
                    }}
                  >
                    <Spinner />
                    Uploading to Claude API...
                  </div>
                )}

                {/* Success */}
                {state === 'success' && result && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}>
                        {result.isNewVersion
                          ? 'New version created successfully!'
                          : 'Skill uploaded successfully!'}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div
                          style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}
                        >
                          Skill ID:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code
                            style={{
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: 'var(--vscode-foreground)',
                              backgroundColor: 'var(--vscode-textCodeBlock-background)',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              wordBreak: 'break-all',
                            }}
                          >
                            {result.skillId}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopySkillId}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: 'var(--vscode-button-secondaryBackground)',
                              color: 'var(--vscode-button-secondaryForeground)',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div
                        style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}
                      >
                        Version: {result.version}
                      </div>

                      {canvasDependentSkillNames.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--vscode-descriptionForeground)',
                              marginBottom: '4px',
                            }}
                          >
                            Dependent Skills:
                          </div>
                          {canvasDependentSkillNames.map((name) => {
                            const isUploaded = skills.some((s) => s.displayTitle === name);
                            return (
                              <div
                                key={name}
                                style={{
                                  fontSize: '12px',
                                  color: isUploaded
                                    ? 'var(--vscode-foreground)'
                                    : 'var(--vscode-errorForeground)',
                                  paddingLeft: '4px',
                                  lineHeight: '1.6',
                                }}
                              >
                                {isUploaded ? '\u2705' : '\u274C'} {name}
                                {!isUploaded && ' (not uploaded)'}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleBackToList} style={btnSecondary}>
                        Back to List
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShowSampleCode(result?.skillId, workflowName)}
                        style={btnSecondary}
                      >
                        API Test
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartTest(undefined, workflowName)}
                        style={btnPrimary}
                      >
                        Test
                      </button>
                    </div>
                  </div>
                )}

                {/* Sample Code */}
                {state === 'sample-code' && (selectedSkillId || result?.skillId) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'var(--vscode-descriptionForeground)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Skill: {selectedSkillId || result?.skillId}
                      {isFromStudio && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--vscode-descriptionForeground)',
                            fontFamily: 'sans-serif',
                            opacity: 0.7,
                          }}
                        >
                          (uploaded by cc-wf-studio)
                        </span>
                      )}
                    </div>

                    {isLoadingSkillDetails && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="codicon codicon-loading codicon-modifier-spin" />
                        Loading skill details...
                      </div>
                    )}

                    {/* Tabs: Test / Code */}
                    <TabBar
                      tabs={[
                        { id: 'test', label: 'Test' },
                        { id: 'code', label: 'Code' },
                      ]}
                      activeTab={sampleCodeTab}
                      onTabChange={(tab) => setSampleCodeTab(tab as 'test' | 'code')}
                    />

                    {/* Code Tab */}
                    {sampleCodeTab === 'code' && (
                      <div style={{ display: 'flex', minHeight: '300px' }}>
                        {/* Left: Language & MCP settings */}
                        <div
                          style={{
                            width: `${leftPanelWidth}px`,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            overflowY: 'auto',
                            maxHeight: '55vh',
                          }}
                        >
                          {/* Model selector */}
                          <div
                            style={{
                              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '4px',
                              padding: '8px 10px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                marginBottom: '6px',
                              }}
                            >
                              Model
                            </div>
                            <select
                              value={testModel}
                              onChange={(e) => setTestModel(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '2px',
                                fontSize: '11px',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                              <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                              <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                              <option value="claude-opus-4-5-20251101">Opus 4.5</option>
                              <option value="claude-opus-4-6">Opus 4.6</option>
                            </select>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                marginTop: '8px',
                                marginBottom: '4px',
                              }}
                            >
                              Language
                            </div>
                            <input
                              type="text"
                              value={responseLanguage}
                              onChange={(e) => setResponseLanguage(e.target.value)}
                              onBlur={(e) => saveResponseLanguage(e.target.value)}
                              placeholder="e.g. Japanese, English"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '2px',
                                fontSize: '11px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          {/* Additional Skills (Code tab) */}
                          <div
                            style={{
                              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '4px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setAdditionalSkillsOpen((v) => !v)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'none',
                                border: 'none',
                                userSelect: 'none',
                                textAlign: 'left',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  transition: 'transform 0.15s',
                                  fontSize: '10px',
                                  transform: additionalSkillsOpen
                                    ? 'rotate(90deg)'
                                    : 'rotate(0deg)',
                                }}
                              >
                                ▶
                              </span>
                              Additional Skills
                              {additionalSkillIds.length > 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 5px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--vscode-badge-background)',
                                    color: 'var(--vscode-badge-foreground)',
                                    fontWeight: 400,
                                  }}
                                >
                                  {additionalSkillIds.length}
                                </span>
                              )}
                              {dependentSkillNames.length > 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor:
                                      'var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.1))',
                                    color: 'var(--vscode-errorForeground)',
                                    border:
                                      '1px solid var(--vscode-inputValidation-errorBorder, rgba(255,0,0,0.3))',
                                    fontWeight: 400,
                                  }}
                                >
                                  required
                                </span>
                              )}
                            </button>
                            {additionalSkillsOpen && (
                              <div style={{ padding: '0 10px 8px' }}>
                                <SelectTagInput
                                  options={skills
                                    .filter(
                                      (s) => s.id !== selectedSkillId && s.id !== result?.skillId
                                    )
                                    .map((s) => ({ value: s.id, label: s.displayTitle }))}
                                  selectedValues={additionalSkillIds}
                                  onChange={handleAdditionalSkillsChange}
                                  placeholder="Select uploaded skills..."
                                  lockedValues={requiredSkillIds}
                                />
                                {missingDependentSkillNames.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      padding: '6px 8px',
                                      fontSize: '11px',
                                      lineHeight: '1.4',
                                      backgroundColor: '#fffbea',
                                      border: '1px solid #ffda6a',
                                      borderRadius: '3px',
                                      color: '#3d3d00',
                                    }}
                                  >
                                    ⚠ Not yet uploaded: {missingDependentSkillNames.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {effectiveMcpServerIds.length > 0 && (
                            <McpServerUrlForm
                              serverIds={effectiveMcpServerIds}
                              urls={mcpServerUrls}
                              onUrlChange={(id, url) => {
                                setMcpServerUrls((prev) => ({ ...prev, [id]: url }));
                                if (url.trim()) {
                                  saveMcpServerUrls({ [id]: url }).catch(() => {});
                                }
                              }}
                            />
                          )}
                        </div>

                        <ResizeDivider onResize={handlePanelResize} />

                        {/* Right: Code preview */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Language tabs */}
                          <div
                            style={{
                              display: 'flex',
                              gap: '4px',
                              marginBottom: '6px',
                            }}
                          >
                            {(['curl', 'python', 'typescript'] as const).map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => setSampleCodeLang(lang)}
                                style={{
                                  padding: '3px 10px',
                                  backgroundColor:
                                    sampleCodeLang === lang
                                      ? 'var(--vscode-button-background)'
                                      : 'var(--vscode-button-secondaryBackground)',
                                  color:
                                    sampleCodeLang === lang
                                      ? 'var(--vscode-button-foreground)'
                                      : 'var(--vscode-button-secondaryForeground)',
                                  border: 'none',
                                  borderRadius: '2px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                }}
                              >
                                {lang === 'curl'
                                  ? 'curl'
                                  : lang === 'python'
                                    ? 'Python'
                                    : 'TypeScript'}
                              </button>
                            ))}
                          </div>
                          <CodeBlock
                            onCopy={() => {
                              const targetId = selectedSkillId || result?.skillId;
                              if (targetId) {
                                const systemPrompt = responseLanguage
                                  ? `Respond in ${responseLanguage}.`
                                  : undefined;
                                navigator.clipboard.writeText(
                                  generateSampleCode(
                                    targetId,
                                    sampleCodeLang,
                                    selectedSkillDisplayTitle || undefined,
                                    mcpServersForCode,
                                    testModel,
                                    systemPrompt
                                  )
                                );
                              }
                            }}
                            style={{
                              backgroundColor: 'var(--vscode-textCodeBlock-background)',
                              border: '1px solid var(--vscode-panel-border)',
                              maxHeight: '55vh',
                            }}
                          >
                            {generateSampleCode(
                              selectedSkillId || result?.skillId || '',
                              sampleCodeLang,
                              selectedSkillDisplayTitle || undefined,
                              mcpServersForCode,
                              testModel,
                              responseLanguage ? `Respond in ${responseLanguage}.` : undefined
                            )}
                          </CodeBlock>

                          {/* Auth code snippet */}
                          {effectiveMcpServerIds.length > 0 && (
                            <AuthCodeSnippet mcpServers={mcpServersForCode} lang={sampleCodeLang} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Test Tab */}
                    {sampleCodeTab === 'test' && (
                      <div style={{ display: 'flex', minHeight: '300px' }}>
                        {/* Left: Settings panel */}
                        <div
                          style={{
                            width: `${leftPanelWidth}px`,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            overflowY: 'auto',
                            maxHeight: '55vh',
                          }}
                        >
                          {/* Model selector */}
                          <div
                            style={{
                              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '4px',
                              padding: '8px 10px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                marginBottom: '6px',
                              }}
                            >
                              Model
                            </div>
                            <select
                              value={testModel}
                              onChange={(e) => setTestModel(e.target.value)}
                              disabled={isExecuting}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '2px',
                                fontSize: '11px',
                                outline: 'none',
                                cursor: isExecuting ? 'default' : 'pointer',
                                opacity: isExecuting ? 0.6 : 1,
                              }}
                            >
                              <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                              <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                              <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                              <option value="claude-opus-4-5-20251101">Opus 4.5</option>
                              <option value="claude-opus-4-6">Opus 4.6</option>
                            </select>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                marginTop: '8px',
                                marginBottom: '4px',
                              }}
                            >
                              Language
                            </div>
                            <input
                              type="text"
                              value={responseLanguage}
                              onChange={(e) => setResponseLanguage(e.target.value)}
                              onBlur={(e) => saveResponseLanguage(e.target.value)}
                              disabled={isExecuting}
                              placeholder="e.g. Japanese, English"
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '2px',
                                fontSize: '11px',
                                boxSizing: 'border-box',
                                opacity: isExecuting ? 0.6 : 1,
                              }}
                            />
                          </div>

                          {/* Additional Skills (collapsible) */}
                          <div
                            style={{
                              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '4px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setAdditionalSkillsOpen((v) => !v)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--vscode-foreground)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'none',
                                border: 'none',
                                userSelect: 'none',
                                textAlign: 'left',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  transition: 'transform 0.15s',
                                  fontSize: '10px',
                                  transform: additionalSkillsOpen
                                    ? 'rotate(90deg)'
                                    : 'rotate(0deg)',
                                }}
                              >
                                ▶
                              </span>
                              Additional Skills
                              {additionalSkillIds.length > 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 5px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--vscode-badge-background)',
                                    color: 'var(--vscode-badge-foreground)',
                                    fontWeight: 400,
                                  }}
                                >
                                  {additionalSkillIds.length}
                                </span>
                              )}
                              {dependentSkillNames.length > 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor:
                                      'var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.1))',
                                    color: 'var(--vscode-errorForeground)',
                                    border:
                                      '1px solid var(--vscode-inputValidation-errorBorder, rgba(255,0,0,0.3))',
                                    fontWeight: 400,
                                  }}
                                >
                                  required
                                </span>
                              )}
                            </button>
                            {additionalSkillsOpen && (
                              <div style={{ padding: '0 10px 8px' }}>
                                <SelectTagInput
                                  options={skills
                                    .filter(
                                      (s) => s.id !== selectedSkillId && s.id !== result?.skillId
                                    )
                                    .map((s) => ({ value: s.id, label: s.displayTitle }))}
                                  selectedValues={additionalSkillIds}
                                  onChange={handleAdditionalSkillsChange}
                                  placeholder="Select uploaded skills..."
                                  lockedValues={requiredSkillIds}
                                />
                                {missingDependentSkillNames.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      padding: '6px 8px',
                                      fontSize: '11px',
                                      lineHeight: '1.4',
                                      backgroundColor: '#fffbea',
                                      border: '1px solid #ffda6a',
                                      borderRadius: '3px',
                                      color: '#3d3d00',
                                    }}
                                  >
                                    ⚠ Not yet uploaded: {missingDependentSkillNames.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {effectiveMcpServerIds.length > 0 && (
                            <McpServerUrlForm
                              serverIds={effectiveMcpServerIds}
                              urls={mcpServerUrls}
                              onUrlChange={(id, url) => {
                                const next = { ...mcpServerUrls, [id]: url };
                                setMcpServerUrls(next);
                                const stillMissing = effectiveMcpServerIds.some(
                                  (sid) => !next[sid]?.trim()
                                );
                                if (!stillMissing) setShowMcpValidation(false);
                                if (url.trim()) {
                                  saveMcpServerUrls({ [id]: url }).catch(() => {});
                                }
                              }}
                              tokens={mcpServerTokens}
                              onTokenChange={(id, token) =>
                                setMcpServerTokens((prev) => ({ ...prev, [id]: token }))
                              }
                              serverOwners={mcpServerOwners}
                            />
                          )}
                        </div>

                        <ResizeDivider onResize={handlePanelResize} />

                        {/* Right: Chat panel */}
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            minWidth: 0,
                            maxWidth: '100%',
                            maxHeight: '55vh',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Chat messages area */}
                          <div
                            style={{
                              flex: 1,
                              minHeight: 0,
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              padding: '8px',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '4px',
                            }}
                          >
                            {chatMessages.length === 0 && (
                              <div
                                style={{
                                  textAlign: 'center',
                                  color: 'var(--vscode-descriptionForeground)',
                                  fontSize: '12px',
                                  padding: '24px 0',
                                }}
                              >
                                Send a message to test the skill.
                              </div>
                            )}

                            {chatMessages.map((msg, idx) => (
                              <div
                                key={`chat-${idx}-${msg.role}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                              >
                                <div
                                  style={{
                                    maxWidth: '85%',
                                    padding: '8px 12px',
                                    borderRadius:
                                      msg.role === 'user'
                                        ? '12px 12px 2px 12px'
                                        : '12px 12px 12px 2px',
                                    backgroundColor: msg.isError
                                      ? 'var(--vscode-inputValidation-errorBackground)'
                                      : msg.role === 'user'
                                        ? 'var(--vscode-button-background)'
                                        : 'var(--vscode-editor-inactiveSelectionBackground)',
                                    color: msg.isError
                                      ? 'var(--vscode-errorForeground)'
                                      : msg.role === 'user'
                                        ? 'var(--vscode-button-foreground)'
                                        : 'var(--vscode-foreground)',
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    border: msg.isError
                                      ? '1px solid var(--vscode-inputValidation-errorBorder)'
                                      : 'none',
                                  }}
                                >
                                  {msg.content || (msg.isStreaming ? '' : '')}
                                  {msg.isStreaming && !msg.content && <TypingDots />}
                                  {msg.isStreaming && msg.content && <TypingDots />}
                                  {!msg.isStreaming && msg.stopReason && (
                                    <div
                                      style={{
                                        fontSize: '10px',
                                        color: 'var(--vscode-descriptionForeground)',
                                        marginTop: '4px',
                                        borderTop: '1px solid var(--vscode-panel-border)',
                                        paddingTop: '4px',
                                      }}
                                    >
                                      stop_reason: {msg.stopReason}
                                      {msg.usage && (
                                        <>
                                          {' · '}
                                          {msg.usage.input_tokens.toLocaleString()} in /{' '}
                                          {msg.usage.output_tokens.toLocaleString()} out
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Skill validation error */}
                          {showSkillValidation && isRequiredSkillsMissing && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--vscode-errorForeground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {missingDependentSkillNames.length > 0
                                ? `⚠ Upload the following skills first: ${missingDependentSkillNames.join(', ')}`
                                : '⚠ Required additional skills are not selected'}
                            </div>
                          )}

                          {/* MCP Validation error */}
                          {showMcpValidation && isMcpUrlsMissing && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--vscode-errorForeground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              ⚠ MCP Server の URL または Token が未入力です:{' '}
                              {effectiveMcpServerIds
                                .filter(
                                  (id) => !mcpServerUrls[id]?.trim() && !mcpServerTokens[id]?.trim()
                                )
                                .join(', ')}
                            </div>
                          )}

                          {/* Input area */}
                          <div
                            style={{
                              border: '1px solid var(--vscode-input-border)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--vscode-input-background)',
                              overflow: 'hidden',
                            }}
                          >
                            <textarea
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (isRequiredSkillsMissing) {
                                    setShowSkillValidation(true);
                                    setAdditionalSkillsOpen(true);
                                  } else if (isMcpUrlsMissing) {
                                    setShowMcpValidation(true);
                                  } else {
                                    handleSendMessage();
                                  }
                                }
                              }}
                              placeholder="Enter your test prompt..."
                              rows={2}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                color: 'var(--vscode-input-foreground)',
                                border: 'none',
                                outline: 'none',
                                fontSize: '12px',
                                resize: 'none',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                              }}
                            >
                              <div>
                                {chatMessages.length > 0 && !isExecuting && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmAction({
                                        title: 'Reset Conversation',
                                        message: 'Chat history will be cleared. Continue?',
                                        confirmLabel: 'Reset',
                                        onConfirm: () => {
                                          handleNewConversation();
                                          setConfirmAction(null);
                                        },
                                      });
                                    }}
                                    style={{
                                      padding: '2px 8px',
                                      backgroundColor: 'transparent',
                                      color: 'var(--vscode-descriptionForeground)',
                                      border: '1px solid var(--vscode-panel-border)',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Reset conversation"
                                  >
                                    Reset Conversation
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {totalUsage && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--vscode-descriptionForeground)',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={`Total: ${(totalUsage.input_tokens + totalUsage.output_tokens).toLocaleString()} tokens`}
                                  >
                                    Total Usage: {totalUsage.input_tokens.toLocaleString()} in /{' '}
                                    {totalUsage.output_tokens.toLocaleString()} out
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isRequiredSkillsMissing) {
                                      setShowSkillValidation(true);
                                      setAdditionalSkillsOpen(true);
                                      return;
                                    }
                                    if (isMcpUrlsMissing) {
                                      setShowMcpValidation(true);
                                      return;
                                    }
                                    handleSendMessage();
                                  }}
                                  title={
                                    isRequiredSkillsMissing
                                      ? 'Required additional skills are missing'
                                      : isMcpUrlsMissing
                                        ? 'Enter MCP server URLs first'
                                        : 'Send message'
                                  }
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px 8px',
                                    backgroundColor:
                                      isExecuting ||
                                      !chatInput.trim() ||
                                      isMcpUrlsMissing ||
                                      isRequiredSkillsMissing
                                        ? 'var(--vscode-button-secondaryBackground)'
                                        : 'var(--vscode-button-background)',
                                    color:
                                      isExecuting ||
                                      !chatInput.trim() ||
                                      isMcpUrlsMissing ||
                                      isRequiredSkillsMissing
                                        ? 'var(--vscode-button-secondaryForeground)'
                                        : 'var(--vscode-button-foreground)',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor:
                                      isExecuting ||
                                      !chatInput.trim() ||
                                      isMcpUrlsMissing ||
                                      isRequiredSkillsMissing
                                        ? 'not-allowed'
                                        : 'pointer',
                                  }}
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleBackToList} style={btnSecondary}>
                        Back to List
                      </button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {state === 'error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                        border: '1px solid var(--vscode-inputValidation-errorBorder)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--vscode-errorForeground)',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}
                    >
                      {uploadError}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleBackToList} style={btnSecondary}>
                        Back to List
                      </button>
                      <button
                        type="button"
                        onClick={() => setState('confirm-upload')}
                        style={btnPrimary}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'OK'}
        cancelLabel="Cancel"
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Skill"
        message={`Are you sure you want to delete "${deleteTarget?.title ?? ''}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (!deleteTarget || isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteCustomSkill(deleteTarget.id);
            setDeleteTarget(null);
            loadSkillList();
          } catch (err) {
            setSkillListError(err instanceof Error ? err.message : 'Failed to delete skill');
            setDeleteTarget(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};
