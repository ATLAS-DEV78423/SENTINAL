# Sentinel Implementation Plan

## Purpose
Build Sentinel as a VS Code extension and companion open-source service that helps an AI coding workflow stay consistent across a session, detect contradictions, and preserve useful context over time.

This plan is based on the current master spec and fills in practical implementation steps.

## Product Goals
- Prevent the assistant from contradicting itself across turns.
- Preserve decisions, architecture notes, and project memory.
- Detect likely bad practices and cross-file drift early.
- Keep setup simple for local development and reuse.

## Scope
### In scope
- VS Code extension
- Session guardian runtime
- Contradiction detection and reporting
- Persistent project memory via a vault-style store
- `.sentinel` configuration file
- Prompt bootstrap workflow
- MCP integration layer
- Support for multiple LLM backends

### Out of scope for the first release
- Full autonomous code editing
- Heavy IDE customization beyond the extension surface
- Enterprise admin features
- Cloud sync or collaboration features

## Phase 1: Foundation
### Deliverables
- Create the repository structure.
- Define the extension entrypoint and runtime boundaries.
- Add a basic configuration schema for `.sentinel`.
- Implement session start and session end lifecycle hooks.
- Create a minimal memory store for decisions and summaries.

### Acceptance criteria
- Sentinel can start inside VS Code.
- The extension can read a project config file.
- The runtime can persist a session summary to disk.

## Phase 2: Session Guardian
### Deliverables
- Add a session bootstrap prompt generator.
- Track session state, key decisions, and active goals.
- Detect when the assistant repeats or reverses prior decisions.
- Surface warnings in a lightweight report.

### Acceptance criteria
- The extension can compare new actions against stored context.
- Contradictions are flagged with clear references to prior decisions.
- Reports are readable from the extension UI or output channel.

## Phase 3: Core Analysis
### Deliverables
- Implement a contradiction interceptor.
- Implement a bad-practice analyzer with rule-based checks first.
- Add cross-file consistency checks for related changes.
- Add a decision audit trail.

### Acceptance criteria
- The analyzer can identify at least a small set of deterministic issues.
- Findings include a reason, severity, and suggested next step.
- The audit trail records what changed and why.

## Phase 4: Vault Brain
### Deliverables
- Define the persistent knowledge model.
- Store project notes, architectural decisions, and recurring constraints.
- Support retrieval of relevant context by file, feature, or topic.

### Acceptance criteria
- The vault can answer basic "what do we already know?" queries.
- Project memory survives across sessions.
- The memory model is structured enough to search later.

## Phase 5: MCP Hub
### Deliverables
- Build a universal MCP adapter layer.
- Register external tools and normalize their responses.
- Route tool requests through Sentinel's policy and memory layer.

### Acceptance criteria
- At least one MCP-backed tool can be discovered and called.
- Tool calls can be tracked in the session log.
- Sentinel can explain why a tool was suggested or blocked.

## Phase 6: LLM Support
### Deliverables
- Add provider adapters for Gemini, Grok, OpenRouter, and NVIDIA NIM.
- Normalize prompt assembly and response handling.
- Keep provider-specific logic isolated from the core runtime.

### Acceptance criteria
- A provider can be swapped without changing the core session model.
- Prompt bootstrapping works across supported providers.

## Phase 7: Packaging and Release
### Deliverables
- Add install instructions for VS Code Marketplace and GitHub CLI.
- Create a polished README.
- Add sample config and example workflows.
- Add basic tests and smoke checks.

### Acceptance criteria
- A new developer can install, configure, and run the extension.
- The repository includes enough docs to onboard contributors.
- The release path is reproducible.

## Suggested Build Order
1. Repository scaffold and extension shell.
2. Config file and persistent storage.
3. Session bootstrap prompt and guardian state.
4. Contradiction detection and report output.
5. Vault memory and retrieval.
6. MCP hub and provider adapters.
7. Packaging, docs, and tests.

## Key Engineering Decisions
- Prefer deterministic checks before moving to LLM-heavy analysis.
- Keep the core runtime provider-agnostic.
- Store memory in a structured format that can evolve.
- Make all warnings explainable and traceable.

## Risks
- Overfitting the contradiction detector too early.
- Letting the memory format become too unstructured.
- Mixing UI code, extension code, and analysis logic too tightly.
- Depending on provider behavior for essential correctness.

## Definition of Done
- Sentinel can start a session, capture context, flag contradictions, and persist useful memory.
- The extension is documented well enough for another developer to extend.
- The architecture is modular enough to grow without a rewrite.
