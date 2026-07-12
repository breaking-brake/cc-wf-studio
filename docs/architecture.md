# Architecture Sequence Diagrams

This document describes the main data flows of cc-wf-studio as Mermaid sequence diagrams.

## Architecture overview

```mermaid
flowchart TB
    subgraph VSCode["VSCode Extension"]
        subgraph ExtHost["Extension Host (Node.js)"]
            Commands["Commands<br/>src/extension/commands/"]
            Services["Services<br/>src/extension/services/"]
            Utils["Utilities<br/>src/extension/utils/"]
        end
        subgraph Webview["Webview (React)"]
            Components["Components<br/>src/webview/src/components/"]
            Stores["Zustand Stores<br/>src/webview/src/stores/"]
            WVServices["Services<br/>src/webview/src/services/"]
        end
    end
    subgraph External["External Services"]
        FS["File System<br/>.vscode/workflows/"]
        CLI["Claude Code CLI"]
        Slack["Slack API"]
        MCP["MCP Servers"]
    end

    Webview <-->|postMessage| ExtHost
    ExtHost --> FS
    ExtHost --> CLI
    ExtHost --> Slack
    ExtHost --> MCP
```

## Workflow save flow

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as Toolbar.tsx
    participant Bridge as vscode-bridge.ts
    participant Cmd as save-workflow.ts
    participant FS as file-service.ts
    participant Disk as .vscode/workflows/

    User->>Toolbar: Click Save
    Toolbar->>Bridge: saveWorkflow(workflow)
    Bridge->>Cmd: postMessage(SAVE_WORKFLOW)
    Cmd->>Cmd: validateWorkflow()
    Cmd->>FS: ensureDirectory()
    FS->>Disk: mkdir -p
    Cmd->>FS: writeFile()
    FS->>Disk: write JSON
    Cmd->>Bridge: postMessage(SAVE_SUCCESS)
    Bridge->>Toolbar: resolve Promise
    Toolbar->>User: Show notification
```

## Slack workflow share flow

```mermaid
sequenceDiagram
    actor User
    participant Dialog as SlackShareDialog.tsx
    participant Cmd as slack-share-workflow.ts
    participant Detector as sensitive-data-detector.ts
    participant API as slack-api-service.ts
    participant Slack as Slack API

    User->>Dialog: Select channel
    User->>Dialog: Click Share
    Dialog->>Cmd: postMessage(SHARE_WORKFLOW_TO_SLACK)
    Cmd->>Detector: detectSensitiveData(workflow)
    alt Sensitive data found
        Cmd->>Dialog: postMessage(SENSITIVE_DATA_WARNING)
        Dialog->>User: Show warning dialog
        User->>Dialog: Confirm override
        Dialog->>Cmd: postMessage(SHARE with override flag)
    end
    Cmd->>API: uploadFile(workflow.json)
    API->>Slack: files.upload
    Slack-->>API: file_id
    Cmd->>API: postMessage(channel, blocks)
    API->>Slack: chat.postMessage
    Slack-->>API: permalink
    Cmd->>Dialog: postMessage(SHARE_SUCCESS)
    Dialog->>User: Show permalink
```

## Slack workflow import flow (deep link)

```mermaid
sequenceDiagram
    actor User
    participant SlackMsg as Slack Message
    participant URI as VSCode URI Handler
    participant Ext as extension.ts
    participant Cmd as slack-import-workflow.ts
    participant API as slack-api-service.ts
    participant Store as workflow-store.ts

    User->>SlackMsg: Click "Import to VS Code"
    SlackMsg->>URI: vscode://cc-wf-studio/import?fileId=...
    URI->>Ext: handleUri(uri)
    Ext->>Cmd: postMessage(IMPORT_WORKFLOW_FROM_SLACK)
    Cmd->>API: downloadFile(fileId)
    API->>SlackMsg: files.info + download
    SlackMsg-->>API: workflow JSON
    Cmd->>Cmd: validateWorkflow()
    Cmd->>Store: postMessage(IMPORT_SUCCESS)
    Store->>Store: deserializeWorkflow()
    Store->>User: Display on canvas
```

## MCP server/tool discovery flow

```mermaid
sequenceDiagram
    actor User
    participant Dialog as McpNodeDialog.tsx
    participant Cmd as mcp-handlers.ts
    participant Cache as mcp-cache-service.ts
    participant SDK as mcp-sdk-client.ts
    participant MCP as MCP Server

    User->>Dialog: Open MCP Node config
    Dialog->>Cmd: postMessage(LIST_MCP_SERVERS)
    Cmd->>Cache: getCachedServers()
    alt Cache miss
        Cmd->>SDK: listServers()
        SDK->>MCP: Initialize connection
        MCP-->>SDK: Server list
        SDK-->>Cmd: servers[]
        Cmd->>Cache: cacheServers()
    end
    Cmd->>Dialog: postMessage(MCP_SERVERS_LIST)

    User->>Dialog: Select server
    Dialog->>Cmd: postMessage(GET_MCP_TOOLS)
    Cmd->>SDK: getTools(serverId)
    SDK->>MCP: tools/list
    MCP-->>SDK: tools[]
    Cmd->>Dialog: postMessage(MCP_TOOLS_LIST)
    Dialog->>User: Show available tools
```

## AI editing flow (MCP server-based)

```mermaid
sequenceDiagram
    actor User
    participant VSCode as CC Workflow Studio
    participant MCP as MCP Server
    participant Agent as AI Agent

    User->>VSCode: Click agent button
    VSCode->>MCP: Auto start server
    VSCode->>Agent: Launch with editing skill

    loop AI edits workflow
        Agent->>MCP: get_workflow
        MCP-->>Agent: workflow JSON
        Agent->>MCP: apply_workflow
        MCP->>VSCode: Update canvas
    end
```
