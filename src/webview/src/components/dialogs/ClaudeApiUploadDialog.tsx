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
import { ExternalLink, Send } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n-context';
import { CodeBlock } from '../common/CodeBlock';
import { SelectTagInput } from '../common/SelectTagInput';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  checkAnthropicApiKey,
  clearAnthropicApiKey,
  executeUploadedSkill,
  getSavedMcpServerUrls,
  getSkillVersionDetails,
  listCustomSkills,
  lookupMcpRegistry,
  saveMcpServerUrls,
  storeAnthropicApiKey,
  openExternalUrl,
  uploadToClaudeApi,
} from '../../services/vscode-bridge';
import { serializeWorkflow, validateWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';

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

function generateSampleCode(
  skillId: string,
  lang: SampleCodeLang,
  skillName?: string,
  mcpServers?: Array<{ id: string; url: string }>,
  model?: string
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
${mcpServers.map((s) => `      {"type": "url", "url": "${s.url || ''}", "name": "${s.id}"}`).join(',\n')}
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
    "messages": [{"role": "user", "content": "${promptContent}"}]
  }'`;
    }

    case 'python': {
      const toolsList = '{"type": "code_execution_20250825", "name": "code_execution"}';
      const mcpServersSection =
        hasMcpServers && mcpServers
          ? `,
    mcp_servers=[
${mcpServers.map((s) => `        {"type": "url", "url": "${s.url || ''}", "name": "${s.id}"}`).join(',\n')}
    ]`
          : '';
      const toolsArray = `[${toolsList}${hasMcpServers && mcpServers ? `, ${mcpServers.map((s) => `{"type": "mcp_toolset", "mcp_server_name": "${s.id}"}`).join(', ')}` : ''}]`;

      const extraHeaders = hasMcpServers
        ? ', extra_headers={"anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20"}'
        : '';

      return `import anthropic

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

response = client.messages.create(
    model="${modelId}",
    max_tokens=4096,
    container={"skills": [{"type": "custom", "skill_id": "${skillId}", "version": "latest"}]}${mcpServersSection},
    tools=${toolsArray},
    messages=[{"role": "user", "content": "${promptContent}"}]${extraHeaders},
)
print(response.content[0].text)`;
    }

    case 'typescript': {
      const toolsList = '{ type: "code_execution_20250825", name: "code_execution" }';
      const mcpServersSection =
        hasMcpServers && mcpServers
          ? `,
    mcp_servers: [
${mcpServers.map((s) => `      { type: "url", url: "${s.url || ''}", name: "${s.id}" }`).join(',\n')}
    ]`
          : '';
      const toolsArray = `[${toolsList}${hasMcpServers && mcpServers ? `, ${mcpServers.map((s) => `{ type: "mcp_toolset", mcp_server_name: "${s.id}" }`).join(', ')}` : ''}]`;

      const extraHeaders = hasMcpServers
        ? `,
  headers: { "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20" }`
        : '';

      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

const response = await client.messages.create({
  model: "${modelId}",
  max_tokens: 4096,
  container: { skills: [{ type: "custom", skill_id: "${skillId}", version: "latest" }] }${mcpServersSection},
  tools: ${toolsArray}${extraHeaders},
  messages: [{ role: "user", content: "${promptContent}" }],
});
console.log(response.content[0].text);`;
    }
  }
}

const McpServerUrlForm: React.FC<{
  serverIds: string[];
  urls: Record<string, string>;
  onUrlChange: (id: string, url: string) => void;
  serverOwners?: Record<string, string[]>;
}> = ({ serverIds, urls, onUrlChange, serverOwners }) => (
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
  </div>
);

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
  const { t } = useTranslation();
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

  // MCP server URLs state
  const [mcpServerUrls, setMcpServerUrls] = useState<Record<string, string>>({});
  const [showMcpValidation, setShowMcpValidation] = useState(false);

  // Skill version details state (for list-selected skills)
  const [skillMcpServerIds, setSkillMcpServerIds] = useState<string[] | null>(null);
  const [isLoadingSkillDetails, setIsLoadingSkillDetails] = useState(false);

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

  const handleChangeApiKey = async () => {
    await clearAnthropicApiKey();
    setState('enter-api-key');
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

    // Fetch skill version details for list-selected skills (not after upload)
    if (!result && targetId && latestVersion) {
      setIsLoadingSkillDetails(true);
      try {
        const details = await getSkillVersionDetails(targetId, latestVersion);
        setSkillMcpServerIds(details.mcpServerIds);
        // Auto-select additional skills based on dependent skill names
        if (details.dependentSkillNames.length > 0) {
          const matchedIds = skills
            .filter(
              (s) => details.dependentSkillNames.includes(s.displayTitle) && s.id !== targetId
            )
            .map((s) => s.id);
          setAdditionalSkillIds(matchedIds);
          if (matchedIds.length > 0) setAdditionalSkillsOpen(true);
        }
      } catch {
        setSkillMcpServerIds([]);
      } finally {
        setIsLoadingSkillDetails(false);
      }
    }
  };

  const mcpServersForCode = useMemo(
    () => effectiveMcpServerIds.map((id) => ({ id, url: mcpServerUrls[id] || '' })),
    [effectiveMcpServerIds, mcpServerUrls]
  );

  const isMcpUrlsMissing =
    effectiveMcpServerIds.length > 0 &&
    effectiveMcpServerIds.some((id) => !mcpServerUrls[id]?.trim());

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
        // Auto-select additional skills based on dependent skill names
        if (details.dependentSkillNames.length > 0) {
          const matchedIds = skills
            .filter(
              (s) => details.dependentSkillNames.includes(s.displayTitle) && s.id !== targetId
            )
            .map((s) => s.id);
          setAdditionalSkillIds(matchedIds);
          if (matchedIds.length > 0) setAdditionalSkillsOpen(true);
        }
      } catch {
        setSkillMcpServerIds([]);
      } finally {
        setIsLoadingSkillDetails(false);
      }
    }
  };

  const handleAdditionalSkillsChange = useCallback(
    async (newIds: string[]) => {
      setAdditionalSkillIds(newIds);

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
    [skills, additionalSkillMcpMap]
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
    if (!targetSkillId || !chatInput.trim() || isExecuting || isMcpUrlsMissing) return;

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
        additionalSkillIds.length > 0 ? additionalSkillIds : undefined
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
              minWidth: state === 'sample-code' ? '800px' : '540px',
              maxWidth: state === 'sample-code' ? '960px' : '720px',
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
                    Enter your Anthropic API key to deploy and manage skills. The key will be stored
                    securely in VS Code's secret storage.
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
                    <button type="button" onClick={handleClose} style={btnSecondary}>
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
                          openExternalUrl('https://platform.claude.com/workspaces/default/skills');
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

                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                      Version: {result.version}
                    </div>
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
                    }}
                  >
                    Skill: {selectedSkillId || result?.skillId}
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
                        </div>

                        {/* Language selector */}
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
                            Language
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                        <CodeBlock
                          onCopy={() => {
                            const targetId = selectedSkillId || result?.skillId;
                            if (targetId) {
                              navigator.clipboard.writeText(
                                generateSampleCode(
                                  targetId,
                                  sampleCodeLang,
                                  undefined,
                                  mcpServersForCode,
                                  testModel
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
                            testModel
                          )}
                        </CodeBlock>
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
                                transform: additionalSkillsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
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
                              />
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

                        {/* Validation error */}
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
                            ⚠ MCP Server URL が未入力です:{' '}
                            {effectiveMcpServerIds
                              .filter((id) => !mcpServerUrls[id]?.trim())
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
                                if (isMcpUrlsMissing) {
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
                                    if (
                                      window.confirm(
                                        'Reset conversation? Chat history will be cleared.'
                                      )
                                    ) {
                                      handleNewConversation();
                                    }
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
                                  if (isMcpUrlsMissing) {
                                    setShowMcpValidation(true);
                                    return;
                                  }
                                  handleSendMessage();
                                }}
                                title={
                                  isMcpUrlsMissing ? 'Enter MCP server URLs first' : 'Send message'
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '4px 8px',
                                  backgroundColor:
                                    isExecuting || !chatInput.trim() || isMcpUrlsMissing
                                      ? 'var(--vscode-button-secondaryBackground)'
                                      : 'var(--vscode-button-background)',
                                  color:
                                    isExecuting || !chatInput.trim() || isMcpUrlsMissing
                                      ? 'var(--vscode-button-secondaryForeground)'
                                      : 'var(--vscode-button-foreground)',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor:
                                    isExecuting || !chatInput.trim() || isMcpUrlsMissing
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
  );
};
