# Feature Specification: AI-Assisted Workflow Refinement

**Feature Branch**: `001-ai-workflow-refinement`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "生成後のワークフローを対話的に改善できるチャット機能

## 背景と現状
- 現在「AIで生成」ボタンがあり、自然言語からワークフローを一度生成できる
- しかし生成後に「もっとこうして欲しい」と追加で改善を依頼できない
- ユーザーは手動で編集するか、最初から生成し直すしかない

## 実装する機能
- ツールバーに「AIで修正」ボタンを追加
- ボタンをクリックするとチャットパネルが開く
- チャットパネルで対話的にワークフローを改善できる
- 「もっとエラーハンドリングを追加して」「この部分をわかりやすく」など、繰り返し改善依頼が可能
- チャットパネルの構成:
  - 上部: 会話履歴表示エリア(ユーザーとAIのメッセージ一覧)
  - 下部: メッセージ入力エリア(textarea + 送信ボタン)
- 改善結果は自動的にキャンバスに反映
- 会話履歴は保存され、次回開いた時にも継続できる

## UI/UX要件
- チャット形式のUI(一般的なチャットアプリのイメージ)
- メッセージは「ユーザー」と「AI」で区別表示
- 送信中はプログレスバー表示
- Ctrl/Cmd+Enterで送信
- 反復回数の上限(20回)を表示・管理
- 会話履歴クリアボタン"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Workflow Refinement Request (Priority: P1)

A user has generated a workflow using the "AIで生成" button but wants to improve specific aspects without manually editing nodes or regenerating from scratch. They click the "AIで修正" button to open a chat panel and request refinements like "Add more error handling for network failures" or "Make the user prompt more clear."

**Why this priority**: This is the core value proposition - enabling iterative improvement of AI-generated workflows without starting over. It directly addresses the main user pain point.

**Independent Test**: Can be fully tested by generating a sample workflow, clicking the "AIで修正" button, entering a refinement request (e.g., "Add error handling"), and verifying that the workflow updates automatically on the canvas with the requested changes.

**Acceptance Scenarios**:

1. **Given** a workflow exists on the canvas, **When** the user clicks "AIで修正" button in the toolbar, **Then** a chat panel opens showing an empty conversation history
2. **Given** the chat panel is open, **When** the user types a refinement request and clicks send (or presses Ctrl/Cmd+Enter), **Then** the message appears in the conversation history marked as "User" and a progress indicator is shown
3. **Given** a refinement request is being processed, **When** the AI completes the refinement, **Then** the AI response appears in the conversation history marked as "AI" and the canvas workflow updates automatically to reflect the changes
4. **Given** a refinement has been applied, **When** the user reviews the updated workflow on the canvas, **Then** the changes match the requested refinement

---

### User Story 2 - Iterative Refinement Conversation (Priority: P2)

A user who has already made one refinement request wants to continue improving the workflow through multiple rounds of feedback, such as first adding error handling, then improving prompts, then reorganizing the flow structure.

**Why this priority**: This enables the true power of conversational refinement - users can explore and improve their workflows incrementally through natural dialogue.

**Independent Test**: Can be tested by making an initial refinement, then making 2-3 additional requests in the same chat session, and verifying that each refinement builds on the previous state without losing context.

**Acceptance Scenarios**:

1. **Given** a previous refinement conversation exists in the chat panel, **When** the user enters a new refinement request, **Then** the AI considers the previous conversation context and applies the new change on top of existing modifications
2. **Given** multiple refinements have been requested, **When** the user reviews the chat history, **Then** all previous user requests and AI responses are visible in chronological order
3. **Given** the user is approaching the iteration limit, **When** viewing the chat panel, **Then** a counter displays remaining iterations (e.g., "15/20 iterations remaining")
4. **Given** the iteration limit (20) is reached, **When** the user tries to send another request, **Then** the system prevents sending and displays a message indicating the limit has been reached

---

### User Story 3 - Conversation Persistence (Priority: P2)

A user closes the chat panel or the extension, then later reopens the same workflow and wants to continue refining from where they left off, seeing their previous conversation history.

**Why this priority**: This prevents users from losing their refinement history and enables them to work on workflows across multiple sessions.

**Independent Test**: Can be tested by making several refinement requests, closing the chat panel (or reloading the extension), reopening the workflow, clicking "AIで修正", and verifying the previous conversation history is restored.

**Acceptance Scenarios**:

1. **Given** a workflow has an existing refinement conversation history, **When** the user closes and reopens the chat panel for the same workflow, **Then** the previous conversation history is displayed
2. **Given** a workflow with refinement history is saved and reopened in a new session, **When** the user clicks "AIで修正", **Then** the conversation history is loaded and displayed
3. **Given** a workflow has never been refined, **When** the user clicks "AIで修正" for the first time, **Then** the chat panel shows an empty conversation history

---

### User Story 4 - Conversation Management (Priority: P3)

A user wants to start fresh with their workflow refinements, clearing the existing conversation history to begin a new refinement approach without being constrained by previous requests.

**Why this priority**: This provides flexibility for users who want to explore different refinement directions or simply start over with a clean slate.

**Independent Test**: Can be tested by creating a conversation history with multiple refinements, clicking the "Clear conversation" button, and verifying that the history is cleared while the workflow state remains unchanged.

**Acceptance Scenarios**:

1. **Given** a conversation history exists, **When** the user clicks the "会話履歴クリア" button, **Then** a confirmation dialog appears
2. **Given** the clear history confirmation dialog is shown, **When** the user confirms, **Then** the conversation history is cleared, the iteration counter resets to 0/20, and the chat panel shows an empty state
3. **Given** the conversation history is cleared, **When** the user makes a new refinement request, **Then** the AI treats it as a fresh conversation without considering previous context
4. **Given** the clear history confirmation dialog is shown, **When** the user cancels, **Then** the conversation history remains unchanged

---

### Edge Cases

- What happens when the AI refinement request results in an invalid workflow (e.g., creating disconnected nodes, violating workflow schema rules)?
- How does the system handle network failures or timeouts during refinement processing?
- What happens when the user closes the chat panel while a refinement request is still processing?
- How does the system handle very long conversation histories (e.g., approaching 20 iterations with lengthy messages)?
- What happens when a user tries to refine a workflow that hasn't been saved yet?
- How does the system handle simultaneous editing - if a user manually edits the workflow while a refinement request is processing?
- What happens when the user switches to a different workflow while a refinement request is in progress?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a toolbar button labeled "AIで修正" that is visible when a workflow exists on the canvas
- **FR-002**: System MUST open a chat panel when the "AIで修正" button is clicked
- **FR-003**: System MUST display the chat panel with two distinct areas: conversation history (upper) and message input (lower)
- **FR-004**: System MUST display conversation messages with clear visual distinction between "User" and "AI" messages
- **FR-005**: System MUST accept refinement requests via text input in the message input area
- **FR-006**: System MUST allow users to send messages using either a send button or Ctrl/Cmd+Enter keyboard shortcut
- **FR-007**: System MUST display a progress indicator when a refinement request is being processed
- **FR-008**: System MUST automatically update the canvas workflow when a refinement is successfully completed
- **FR-009**: System MUST preserve conversation history for each workflow and restore it when the chat panel is reopened
- **FR-010**: System MUST track and display the number of refinement iterations used out of the maximum allowed (20)
- **FR-011**: System MUST prevent additional refinement requests when the iteration limit (20) is reached
- **FR-012**: System MUST provide a button to clear conversation history with user confirmation
- **FR-013**: System MUST reset the iteration counter to 0 when conversation history is cleared
- **FR-014**: System MUST maintain workflow state on canvas when conversation history is cleared
- **FR-015**: System MUST handle refinement requests contextually based on the current workflow state and previous conversation history
- **FR-016**: System MUST validate AI-generated refinements against workflow schema rules before applying to canvas
- **FR-017**: System MUST display error messages when refinement processing fails (network errors, timeout, invalid results, etc.)
- **FR-018**: System MUST support multi-line text input in the message input area
- **FR-019**: System MUST auto-scroll conversation history to show the latest message when new messages are added
- **FR-020**: System MUST persist conversation history to storage and restore it across extension reload/restart

### Key Entities

- **Refinement Conversation**: Represents the complete conversation history for a workflow, containing an ordered list of messages (user requests and AI responses), iteration count, and associated workflow ID
- **Refinement Message**: Represents a single message in the conversation, containing message content, sender type (user/AI), timestamp, and processing status
- **Workflow State**: The current state of the workflow being refined, including all nodes, connections, and validation status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully refine a workflow through at least 3 consecutive iterations without errors in 90% of test cases
- **SC-002**: Refinement requests complete and update the canvas within 30 seconds in 95% of cases under normal network conditions
- **SC-003**: Conversation history is successfully persisted and restored across extension reloads in 100% of test cases
- **SC-004**: Users can understand and operate the chat interface without documentation (measured by usability testing with 5+ users)
- **SC-005**: The iteration counter accurately reflects the number of refinement requests made and prevents requests beyond the limit in 100% of cases

## Assumptions

- The existing "AIで生成" functionality and workflow generation infrastructure can be extended to support iterative refinement requests
- The AI service used for generation supports conversational context and can process refinement requests based on current workflow state
- Users have sufficient permissions to modify workflows they are refining
- Network connectivity is available for AI service communication
- The extension has storage capabilities to persist conversation history (localStorage, IndexedDB, or similar)
- The existing workflow validation infrastructure can validate AI-generated refinements
- The iteration limit of 20 is sufficient for most user refinement scenarios
- Conversation history size will remain manageable within browser storage constraints
