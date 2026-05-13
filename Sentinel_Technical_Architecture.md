# Sentinel Technical Architecture

## Overview
Sentinel is a VS Code extension backed by a local session guardian runtime. Its job is to maintain continuity across AI-assisted coding sessions, detect contradictions or risky changes, and preserve durable project memory.

The architecture should stay lightweight, local-first, and provider-agnostic.

## Architectural Goals
- Maintain session continuity across prompts and turns.
- Detect contradictions between new output and existing project context.
- Preserve project decisions in a durable memory layer.
- Integrate with multiple AI providers and MCP tools.
- Keep the design modular so pieces can evolve independently.

## Non-Goals
- Replacing the AI coding tool entirely.
- Acting as a full IDE.
- Building a centralized cloud knowledge base in v1.

## High-Level Components
### 1. VS Code Extension
- Presents the user-facing UI.
- Handles activation, commands, and status updates.
- Reads `.sentinel` configuration.
- Displays warnings, summaries, and reports.

### 2. Session Guardian
- Maintains live session state.
- Tracks the current goal, decisions made, and constraints discovered.
- Receives events from the extension and analysis layers.

### 3. Contradiction Interceptor
- Compares incoming actions or responses with stored session memory.
- Flags reversals, inconsistent assumptions, and conflicting recommendations.
- Emits findings with supporting evidence.

### 4. Bad Practice Analyzer
- Runs rule-based checks over proposed changes, prompts, or outputs.
- Looks for unsafe, brittle, or low-quality patterns.
- Produces actionable warnings rather than vague feedback.

### 5. Vault Brain
- Stores persistent project knowledge.
- Keeps decisions, summaries, constraints, and notable patterns.
- Provides retrieval by path, topic, session, or tag.

### 6. MCP Hub
- Acts as the integration boundary for external tools.
- Normalizes tool registration, discovery, and execution.
- Passes tool calls through Sentinel's policy and memory checks.

### 7. LLM Harness
- Abstracts provider differences.
- Assembles prompts for supported models.
- Normalizes outputs into Sentinel's internal event format.

## Core Data Objects
### Session
- Session id
- Project path
- Start time
- Active goal
- Status

### Decision
- Decision id
- Summary
- Reason
- Timestamp
- Source evidence
- Related files or features

### Finding
- Finding id
- Type
- Severity
- Description
- Evidence
- Suggested remediation

### Memory Entry
- Entry id
- Topic
- Content
- Tags
- Created at
- Updated at

### Tool Event
- Tool name
- Request payload
- Response payload
- Outcome
- Timestamp

## Runtime Flow
1. User opens a project in VS Code.
2. Sentinel loads `.sentinel` and initializes session state.
3. The bootstrap prompt is generated from project memory and config.
4. The AI assistant produces output or a tool request.
5. Sentinel evaluates the new information against existing memory.
6. Contradictions, drift, or bad practices are recorded as findings.
7. Relevant updates are written back to the vault brain.
8. The extension surfaces a concise report to the user.

## Suggested Repository Layout
```text
sentinel/
  extensions/
    vscode/
  packages/
    core/
    guardian/
    analyzer/
    vault/
    mcp/
    llm/
  configs/
  docs/
  tests/
```

## Configuration Surface
The `.sentinel` file should define:
- Project name
- Default AI provider
- MCP tools allowed for the project
- Memory paths
- Analysis strictness
- Prompt bootstrap options

## Analysis Strategy
### First pass: deterministic rules
- Duplicate recommendations
- Reversed decisions
- Inconsistent terminology
- Missing references to known constraints
- Obvious unsafe or brittle patterns

### Second pass: contextual analysis
- Compare proposed changes against stored project decisions.
- Check whether new claims conflict with earlier summaries.
- Use the LLM harness only when the rule engine needs help classifying context.

## MCP Integration
The MCP hub should:
- Discover available tools
- Normalize schemas and metadata
- Enforce allow/deny rules from config
- Record every tool call in the session log

## Prompting Model
Sentinel should own prompt assembly centrally so that:
- The bootstrap prompt is consistent.
- Context injection follows a predictable order.
- Memory and tool metadata are not mixed ad hoc in each feature.

Recommended prompt order:
1. Project identity and role
2. Recent session state
3. Durable project memory
4. Relevant constraints
5. Open tasks
6. Tool availability

## Storage Model
Use separate stores for different concerns:
- Session state store for live session data
- Vault store for durable project memory
- Log store for findings and tool events

This keeps session data short-lived while preserving decisions independently.

## UI Surfaces
The extension can expose:
- Status indicator
- Session summary panel
- Findings panel
- Memory browser
- Command palette actions

## Security and Trust
- Keep local project data local by default.
- Make every external tool call visible and auditable.
- Require explicit allowlisting for sensitive integrations.
- Avoid silently mutating memory without traceability.

## Observability
Sentinel should log:
- Session starts and stops
- Prompt bootstrap contents at a summary level
- Contradiction findings
- Tool calls
- Provider errors

Logs should be structured enough to support debugging without exposing unnecessary sensitive content.

## Implementation Principle
Keep the system explainable:
- If Sentinel warns about something, it should say why.
- If Sentinel stores something, it should say where and under what rule.
- If Sentinel calls a tool, it should say who requested it and what it returned.

## Recommended Build Milestones
1. Extension shell and config loading
2. Session state and persistent storage
3. Rule-based contradiction detection
4. Vault brain retrieval
5. MCP hub integration
6. LLM harness abstraction
7. Reporting, docs, and tests
