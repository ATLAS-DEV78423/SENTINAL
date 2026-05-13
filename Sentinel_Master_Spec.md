# Sentinel Master Product Specification

## 1. Product Summary
Sentinel is a local-first, read-only session memory and consistency layer for AI coding tools. It helps users avoid contradictions, reduce re-explaining context, preserve useful decisions, and measure project health over time.

It is designed for everyone using AI coding tools, with the experience optimized first for the least technical user in the room. If a vibe coder can use it without reading docs, the product is on the right track.

## 2. Product Principles
- Local-first by default.
- Read-only on the codebase.
- Passive by default, with deeper interaction only when the user opts in.
- Coach-like in tone, never condescending.
- Visible conflicts over silent assumptions.
- User control over every meaningful decision.
- Simple to start, deep when needed.

## 3. Target Users
- Vibe coders
- Junior developers
- Solo indie developers
- Teams

Sentinel must be usable by non-technical users first. Power users can unlock deeper modes, but the default experience should remain simple and calm.

## 4. Product Goals
- Fewer bugs and contradictions.
- Less time wasted re-explaining context.
- Faster sessions overall.
- Better project memory across sessions.
- Higher codebase health score over time.

## 5. North Star Metric
The primary product metric is the **codebase health score**, a 0-100 score displayed in the sidebar.

### Health Score Dimensions
- Contradiction count: 35%
- Bad practice density: 25%
- Consistency score: 20%
- Decision coverage: 10%
- Session trend: 10%

### Score Interpretation
- 80-100: green
- 50-79: amber
- 0-49: red

### Display
- Large sidebar ring for the primary score
- Delta badge for change since the last session
- Optional component breakdown beneath the ring
- Sparkline for recent session trend when expanded

## 6. Workflow Model
### Session Definition
A session is one continuous working period on one project.

It begins when:
- The user clicks `Start Session`
- VS Code opens a project that already contains `.sentinel`

It ends when:
- The user clicks `End Session`
- VS Code closes

If VS Code closes and reopens, that is a new session.

### Session Naming
- `session-YYYY-MM-DD-NNN.md`

## 7. User Experience Modes
### Passive Mode
- Silent in the UI unless something is genuinely wrong.
- Logs everything to the vault in the background.
- Only critical contradictions and hardcoded secrets surface immediately as a subtle sidebar badge.
- No toasts.
- No popups.
- No interruptions.

### Active Mode
- User-enabled.
- Warnings appear in real time with highlights and alerts.
- Still never blocks save or execution.

### Interventionist Mode
- Advanced toggle only.
- Can pause and suggest rewrites.
- Never the default.

## 8. Contradiction Model
Sentinel tracks contradictions explicitly and never resolves them by assumption.

### Contradiction Types
- Same problem solved two different ways across files
- A function defined one way and used differently elsewhere
- A data structure with different shapes in different files
- A pattern established in one session violated later
- Async vs callback usage for the same operation type

### Severity Levels
- Info: probably fine, but worth knowing
- Warning: likely to cause confusion or bugs
- Critical: will break things or introduces a security risk

### Resolution Rules
A contradiction is resolved only when one of these happens:
- The user clicks `Mark as Resolved`
- Sentinel detects that the offending code changed and the contradiction no longer exists
- The user adds an explicit override note in `.sentinel`

Unresolved contradictions carry into future session reports until addressed.

### Partial Resolution
If only part of the issue is fixed, Sentinel marks it as partially addressed and keeps it open.

## 9. Bad Practice Detection
Sentinel should detect these first:
- God functions
- Deep nesting beyond 3 levels
- Mixed concerns in one file
- Hardcoded secrets or credentials
- Undefined variables used confidently
- Imports that do not exist or are not installed
- Inconsistent naming conventions across files

## 10. Information Sources
Sentinel treats the following as core input:
- File changes
- File watcher events
- Git history
- Git diffs
- Git commit messages
- Session logs
- User-generated config and overrides

### Git Bootstrap Rules
- First scan: last 30 days or last 100 commits, whichever comes first
- After initial bootstrap: only new commits since the last session
- Deeper scans are manual only: 90 days, 6 months, or full history

If git history is unavailable, Sentinel falls back to file-watcher-only mode and communicates that clearly.

## 11. Memory Model
Sentinel uses two memory layers:

### Project-Specific Memory
Lives in `.sentinel/`
- Decisions
- Session reports
- Contradictions
- Overrides
- Project bootstrap prompt

### Global Memory
Lives in `~/.sentinel/global/`
- Personal coding identity
- Stack preferences
- Carry-over rules
- Prompt templates
- Personal anti-patterns
- Promoted cross-project patterns

### Vault Rules
Store:
- Decisions
- Patterns chosen
- Contradictions caught
- Session summaries
- File structure snapshots
- What was built
- What failed and why
- Next steps

Never store:
- Full code content
- API keys
- Passwords
- Personal data
- Notes over ~500 tokens

## 12. Configuration Model
The project config is `.sentinel/config.yml`.

It controls:
- Product description
- Preferred stack and libraries
- Anti-patterns to never use
- Design rules
- Requirements list
- Carry-over rules from previous projects

The config should stay lean in v1.

## 13. Override Model
Project overrides live in `.sentinel/overrides.yml`.

Each override records:
- The rule being overridden
- Why it is overridden in this project
- The date it was added

Project-specific rules always win over global rules, but Sentinel surfaces the conflict visibly.

## 14. Onboarding Flow
The onboarding flow must be simple enough for a non-technical user to complete in under three minutes.

### Flow
1. Install Sentinel from the VS Code marketplace.
2. Open a project and let Sentinel auto-detect it.
3. Answer five plain-English wizard questions.
4. Enter one API key for the chosen LLM provider.
5. Start a session.

### Wizard Questions
1. What are you building?
2. What tools and tech are you using?
3. What must this app always do?
4. What should the AI never do in this project?
5. Any rules from past projects you want to carry in?

### Starter Templates
Ship with five starter templates:
- Next.js + Supabase
- React + Firebase
- Flutter + Dart
- Python + FastAPI
- Blank

## 15. Bootstrap Prompt
Sentinel generates a ready-to-paste bootstrap prompt at the start of each session.

### Default Contents
1. Project summary
2. Current stack and preferred libraries
3. Project rules and anti-patterns
4. Current file structure
5. Recent session summary
6. Open issues and unresolved contradictions
7. Suggested next step

The prompt should stay under 800 tokens by default.

### Claude Code Support
For Claude Code, Sentinel also writes `.sentinel/bootstrap.md` in the project root and provides a CLI copy command.

## 16. Report Model
Session reports are generated in both Markdown and sidebar form.

### Report Contents
- Files created or modified
- Decisions logged
- Contradictions caught and whether they were resolved
- Known risks and open issues
- Health score at session end vs session start
- Pre-generated bootstrap prompt

### Report Format
- Markdown source of truth in `.sentinel/reports/`
- Sidebar rendering for in-app review

## 17. Sidebar Navigation
The sidebar contains these panels:
1. Home
2. Session
3. Bootstrap
4. Vault
5. MCP Hub
6. Reports
7. Settings

### Home Panel
- Health score ring
- Session status
- Start / End Session control

### Session Panel
- Live feed
- Active alerts
- Decisions logged so far

### Bootstrap Panel
- Ready-to-paste prompt
- Copy button
- Regenerate button

### Vault Panel
- Browse decisions, sessions, patterns
- Search by keyword or date

### MCP Hub Panel
- Connect and manage MCP servers
- Auto-write IDE configs

### Reports Panel
- Session report history
- Filter by date and health score

### Settings Panel
- API keys
- Provider selection
- Advanced model assignment
- Sync config

## 18. CLI Companion
Sentinel includes a CLI companion script with these commands:
- `sentinel start`
- `sentinel end`
- `sentinel copy-bootstrap`
- `sentinel status`
- `sentinel report`
- `sentinel sync-vault`
- `sentinel export-config`
- `sentinel scan`
- `sentinel init`
- `sentinel reset-session`

## 19. Supported Environments
Launch support priority:
1. Cursor
2. VS Code native
3. Windsurf
4. Claude Code

### Practical Notes
- Cursor, VS Code, and Windsurf use the same extension engine.
- Claude Code uses MCP config and a bootstrap prompt file.

## 20. Tech Stack
- Language: TypeScript
- Runtime: Node.js 20+
- Extension API: VS Code Extension API
- Sidebar UI: React 18 + Tailwind CSS in a webview
- File watching: VS Code FileSystemWatcher
- Git integration: simple-git
- Vault format: Markdown with YAML frontmatter
- Frontmatter parser: gray-matter
- Config format: YAML via js-yaml
- Secret storage: VS Code SecretStorage
- LLM harness: fetch-based provider router
- Providers:
  - Gemini via `@google/generative-ai`
  - Grok via fetch to `api.x.ai`
  - OpenRouter via fetch to `openrouter.ai`
  - NVIDIA NIM via fetch to `integrate.api.nvidia.com`
- Monorepo: npm workspaces
- Packaging: `@vscode/vsce`
- Install scripts: `install.sh` and `install.ps1`

## 21. Storage Layout
### Project Layout
```text
.sentinel/
  config.yml
  overrides.yml
  bootstrap.md
  vault/
    decisions/
    sessions/
  reports/
```

### Global Layout
```text
~/.sentinel/global/
  profile.md
  anti-patterns.md
  templates/
  patterns/
```

## 22. Global Promotion Rule
If an issue appears in three or more separate sessions across two or more projects, Sentinel may promote it to a global personal pattern note.

Promotion behavior:
- Notify the user first
- Activate only after confirmation
- Never silently change the global vault

## 23. Tone and Voice
Sentinel should sound like a senior developer who is also a good teacher.

### Voice Rules
- Coach-like first
- Direct when needed
- Calm in passive mode
- Firm in critical cases
- Never condescending
- Never robotic

### Example Severity Voice
- Info: gentle, observational
- Warning: direct, helpful
- Critical: firm, clear, urgent

## 24. Architecture Principles
- Read-only on code files
- Never modify git history
- Never block saving or execution
- Never store API keys in plaintext
- Never delete vault entries automatically
- Never send code to external services without explicit user consent for that session
- Surface conflicts rather than silently hiding them

## 25. Fallback Behavior
If git is unavailable:
- Switch to file-watcher-only mode
- Keep session memory and reporting working
- Show a subtle notice that Sentinel is learning from the session forward

If the project is new to Sentinel:
- Bootstrap from available file state
- Build forward from current session data

## 26. Definition of Done for v1
Sentinel v1 is successful when:
- It boots quickly
- It shows the previous session clearly
- It generates a useful bootstrap prompt
- It catches a real contradiction during work
- It produces a readable session report
- It improves the codebase health score over time

