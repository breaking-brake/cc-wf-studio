---
name: daily-task-workflow
description: Created with Workflow Studio
---

# daily-task-workflow

## Workflow Diagram

```mermaid
flowchart TD
    start_node_default([Start])
    end_node_default([End])
    question_1762065541316{AskUserQuestion:<br/>Ask user Task}
    agent_1762065720556[Sub-Agent: news_briefing_agent-1762065720556]
    prompt_1762065918375[Enter your prompt template ...]
    prompt_1762065934779[Readout News Report]

    start_node_default --> question_1762065541316
    question_1762065541316 -->|news| agent_1762065720556
    question_1762065541316 -->|daily report| prompt_1762065918375
    prompt_1762065918375 --> end_node_default
    agent_1762065720556 --> prompt_1762065934779
    prompt_1762065934779 --> end_node_default
```

## Execution Instructions

Follow the Mermaid flowchart above to execute the workflow step by step.
Start from the "Start" node and follow the arrows to each subsequent node.
For decision nodes (diamonds), evaluate the condition and follow the appropriate branch.
Continue until you reach the "End" node.