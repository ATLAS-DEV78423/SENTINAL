# Sentinel Codex Build Prompt

You are building Sentinel, a local-first, read-only session memory and consistency layer for AI coding tools.

## Product Intent
Sentinel helps users avoid contradictions, preserve context, reduce re-explaining, and improve project health over time. It is designed for vibe coders, junior developers, solo developers, and teams, but the experience must work for the least technical user first.

## Core Product Rules
- Never modify code files.
- Never block saving or execution.
- Never modify git history.
- Never store API keys in plaintext.
- Never send code to external servers without explicit user consent for that session.
- Local-first by default.
- Passive by default, active only when the user opts in.
- Coach-like tone, never condescending.
- Surface conflicts clearly instead of silently resolving them.

## What Sentinel Must Do
Build a VS Code extension with:
- A sidebar UI
- Session start and end controls
- A health score ring
- Live session feed
- Bootstrap prompt generation
- Vault browsing
- Reports
- Settings
- MCP Hub management

## Health Score
Implement a 0-100 codebase health score using:
- Contradiction count: 35%
- Bad practice density: 25%
- Consistency score: 20%
- Decision coverage: 10%
- Session trend: 10%

Display:
- Large color-coded ring
- Delta badge
- Optional component breakdown
- Optional sparkline

## Contradictions
Track contradictions explicitly.

Severity levels:
- Info
- Warning
- Critical

Resolution rules:
- User marks resolved
- Sentinel detects the offending code changed and the contradiction disappears
- User adds an explicit project override in `.sentinel/overrides.yml`

Unresolved contradictions must carry forward into future session reports.

## Bad Practices To Detect First
- God functions
- Deep nesting
- Mixed concerns
- Hardcoded secrets
- Undefined variables used confidently
- Missing imports or packages
- Inconsistent naming across files

## Session Model
- One session = one continuous working period on one project
- New session on VS Code reopen
- Sessions can be started manually or auto-started when `.sentinel` exists

## Bootstrap Model
Generate a bootstrap prompt containing:
1. Project summary
2. Current stack and preferred libraries
3. Project rules and anti-patterns
4. Current file structure
5. Recent session summary
6. Open issues and unresolved contradictions
7. Suggested next step

Keep the prompt under 800 tokens by default.

For Claude Code, also write `.sentinel/bootstrap.md` and support `sentinel copy-bootstrap`.

## Onboarding
Implement a plain-English 5-step wizard:
1. What are you building?
2. What tools and tech are you using?
3. What must this app always do?
4. What should the AI never do in this project?
5. Any rules from past projects you want to carry in?

After the wizard, generate `.sentinel/config.yml`, show a preview, and ask for one API key.

## Config
`config.yml` should control:
- Product description
- Preferred stack and libraries
- Anti-patterns to never use
- Design rules
- Requirements list
- Carry-over rules from previous projects

`overrides.yml` should hold:
- Rule overridden
- Reason
- Date added

## Memory Model
Project-specific:
- Decisions
- Session reports
- Contradictions
- Overrides
- Bootstrap prompt

Global:
- Personal coding identity
- Stack preferences
- Carry-over rules
- Prompt templates
- Personal anti-patterns
- Promoted cross-project patterns

## Git Bootstrap
Use git history as core input.

Default scan:
- Last 30 days, or
- Last 100 commits, whichever comes first

After bootstrap:
- Only new commits since the last session

If git is unavailable:
- Fall back to file-watcher-only mode
- Keep the rest of Sentinel working

## Global Vault Rules
The global vault lives at `~/.sentinel/global/`.

It is:
- Per machine by default
- Optionally synced by the user to a folder or service they control
- Never backed by Sentinel cloud infrastructure

If an issue appears in three or more sessions across two or more projects, notify the user and ask whether to promote it to a global pattern note.

## UI Modes
### Passive Mode
- Silent unless something is genuinely wrong
- Background logging only
- Critical contradictions and hardcoded secrets surface as a subtle sidebar badge

### Active Mode
- Real-time warnings
- Highlights and alerts

### Interventionist Mode
- Advanced toggle only
- Can pause and suggest rewrites
- Never default

## Sidebar Panels
Build these panels in this order:
- Home
- Session
- Bootstrap
- Vault
- MCP Hub
- Reports
- Settings

## CLI Companion
Implement:
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

## Supported Environments
Priority:
1. Cursor
2. VS Code native
3. Windsurf
4. Claude Code

Claude Code requires:
- MCP config generation
- Bootstrap prompt file output

## Tech Stack
- TypeScript
- Node.js 20+
- VS Code Extension API
- React 18 + Tailwind CSS webview
- FileSystemWatcher
- simple-git
- Markdown vault files with YAML frontmatter
- gray-matter
- YAML config via js-yaml
- VS Code SecretStorage
- fetch-based LLM router
- npm workspaces
- `@vscode/vsce`

## File Layout
Create the minimal project structure:
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

## Implementation Priorities
1. Extension shell and config loading
2. Session state and persistent storage
3. Git bootstrap and file-watcher fallback
4. Contradiction detection and severity handling
5. Health score computation and display
6. Bootstrap prompt generation
7. Vault browsing and session reports
8. MCP Hub and provider adapters
9. Settings, onboarding wizard, and CLI companion

## Output Quality Expectations
- Calm, readable UI
- Clear explanations
- No hidden state changes
- No automatic edits to code
- No noisy interruptions in passive mode

## Definition of Done
The first prototype is successful when:
- A project opens and Sentinel boots quickly
- It shows what was built last session
- It generates a ready-to-paste bootstrap prompt
- It catches at least one real contradiction
- It writes a useful session report
- The codebase health score moves in a meaningful way

