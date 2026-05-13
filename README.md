# Sentinel

[![CI](https://img.shields.io/github/actions/workflow/status/simplemanslab/sentinel/ci.yml?branch=main&label=CI)](https://github.com/simplemanslab/sentinel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/simplemanslab/sentinel/release.yml?label=Release)](https://github.com/simplemanslab/sentinel/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/simplemanslab/sentinel)](./LICENSE)
[![Version](https://img.shields.io/github/v/release/simplemanslab/sentinel)](https://github.com/simplemanslab/sentinel/releases)
[![VS Code](https://img.shields.io/visual-studio-marketplace/v/simplemanslab.sentinel?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=simplemanslab.sentinel)

<p align="center">
  <img src="packages/cli/assets/avatar-square.png" alt="Sentinel avatar" width="180" />
</p>

<p align="center">
  <img src="packages/cli/assets/sentinal-wordmark.svg" alt="SENTINAL wordmark" width="760" />
</p>

<p align="center">
  Sentinel is a local-first memory and consistency layer for AI coding tools.
</p>

## Overview

Sentinel is a developer tool that helps maintain code consistency and detect contradictions in your projects by acting as a local-first memory layer for AI coding assistants. It works by:

- Tracking your project's context, decisions, and contradictions
- Providing consistent bootstrap prompts to AI assistants
- Detecting when AI suggestions contradict established project patterns
- Maintaining a local vault of project knowledge and decisions
- Supporting multiple LLM providers for flexibility

## Key Features

### 🧠 Local-First Memory
- Stores project context, decisions, and patterns locally
- No data leaves your machine unless explicitly synced
- Persistent vault of project knowledge

### ⚠️ Contradiction Detection
- Flags when AI suggestions contradict established project patterns
- Tracks open contradictions until resolved
- Helps maintain architectural consistency

### 🤖 Multi-LLM Provider Support
Sentinel supports 15+ LLM providers for maximum flexibility:

**Frontier Model Labs:**
- Gemini (Google AI Studio)
- OpenAI (GPT series)
- Anthropic (Claude family)
- xAI (Grok)

**High-Speed Inference:**
- Groq (LPU technology)
- Together AI (open-source models)
- Mistral AI
- DeepSeek
- Perplexity (search-augmented)

**Enterprise Cloud:**
- Azure OpenAI Service
- NVIDIA NIM (optimized inference)
- OpenRouter (aggregator - 200+ models)

**Local-First:**
- Ollama (zero-cost, private, local)

**Specialized:**
- Cohere (Command series)
- Minimax (Abab series)

### 🔧 Developer Experience
- VS Code extension with rich sidebar UI
- CLI for automation and scripting
- Machine-readable output for integration
- Shared branding system across all interfaces

## Architecture

Sentinel consists of several core packages:

- `@sentinel/core` - Shared data models, config, scoring
- `@sentinel/analyzer` - Contradiction detection and bad practice analysis
- `@sentinel/vault` - Local storage for project knowledge and decisions
- `@sentinel/guardian` - Session management and orchestration
- `@sentinel/llm` - Unified LLM provider abstraction layer
- `@sentinel/cli` - Command-line interface
- `@sentinel/webview` - React-based VS Code webview UI
- `@sentinel/extension` - VS Code extension host

## Brand System

Sentinel uses one shared visual system across the CLI, docs, and VS Code extension:

- The robot avatar is the core mascot and splash mark.
- The SENTINAL wordmark is used for the CLI about reveal and editorial branding.
- Green and gold are the canonical accent colors across product surfaces.
- Machine-readable output stays text-only so scripts, JSON, and automation remain stable.

## Quick Start

### Option 1: Install from VS Code Marketplace
1. Search for "Sentinel" in the VS Code Extensions marketplace
2. Install the extension by simplemanslab
3. Open a workspace folder in VS Code
4. Click the Sentinel icon in the activity bar to open the sidebar

### Option 2: Build from Source
```bash
# 1. Clone the repository
git clone https://github.com/simplemanslab/sentinel.git
cd sentinel

# 2. Install dependencies
npm install

# 3. Build all packages
npm run build

# 4. Create the VSIX package
npm run package -w sentinel-vscode

# 5. Install the extension
code --install-extension packages/extension/sentinel-vscode-1.0.0.vsix
```

### Option 3: Use Install Scripts
```bash
# Linux/macOS
./scripts/install.sh

# Windows PowerShell
.\scripts\install.ps1
```

## Provider Setup

### Getting API Keys

Sentinel supports multiple LLM providers. Get API keys from:

- [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)
- [OpenAI API keys](https://platform.openai.com/api-keys)
- [Anthropic API keys](https://console.anthropic.com/settings/keys)
- [xAI / Grok API keys](https://docs.x.ai/overview)
- [OpenRouter API keys](https://openrouter.ai/docs/api-keys)
- [NVIDIA NGC / NIM API keys](https://docs.nvidia.com/ngc/latest/ngc-user-guide.html)
- [DeepSeek API keys](https://platform.deepseek.com/api_keys)
- [Perplexity API keys](https://www.perplexity.ai/settings/api)
- [Azure OpenAI](https://portal.azure.com/) (Azure AI Services)
- [Together AI](https://api.together.xyz/settings/api-keys)
- [Groq](https://console.groq.com/keys)
- [Mistral AI](https://console.mistral.ai/api-keys/)
- [Cohere](https://dashboard.cohere.com/api-keys)
- [Minimax](https://www.minimaxi.com/site/openapi)
- [Ollama](https://ollama.com/download) (no API key needed - runs locally)

### Configuring in Sentinel

1. Open the Sentinel sidebar in VS Code
2. Navigate to Settings → Provider Settings
3. Select your preferred provider from the dropdown
4. Enter your API key in the corresponding field
5. (Optional) Set model assignments for different task types
6. Test the connection using the "Test Connection" button

## Usage Workflow

### Initializing a Project
1. Open your project folder in VS Code
2. Click the Sentinel icon in the activity bar
3. In the sidebar, go to Settings → Initialize Project
4. Choose a template or select "Blank"
5. Fill in project description, tech stack, requirements, and anti-patterns
6. Sentinel will create a `.sentinel/` folder with your project config

### Starting a Session
1. With your project open, click the Sentinel icon
2. In the Home tab, click "Start Session"
3. Sentinel will analyze your project context
4. Copy the bootstrap prompt from the sidebar
5. Paste the bootstrap prompt into your AI coding assistant (GitHub Copilot, Cursor, etc.)

### During Development
- Sentinel automatically tracks file changes and git activity
- Contradictions and bad practices are detected in real-time
- View findings in the Session or Reports tabs
- Log important decisions using the Decision Log feature
- Resolve contradictions as they arise

### Ending a Session
1. Click "End Session" in the Home tab
2. Sentinel generates a report summarizing the session
3. Reports are stored locally in `.sentinel/reports/`
4. You can export or share reports as needed

## Advanced Features

### Decision Logging
Log important architectural decisions to maintain project history:
- Click "Log Decision" in the Session tab
- Provide title, summary, reasoning, and related files
- Decisions are stored in your project's vault

### Contradiction Resolution
When Sentinel detects a contradiction:
1. View it in the Session tab under "Open Contradictions"
2. Click "Resolve Contradiction" 
3. Select the contradiction to resolve
4. Provide a resolution note
5. Mark as resolved

### Global Vault Sync
Sync your learnings across projects:
1. Go to Settings → Vault → Sync Global Vault
2. Enter a folder path for the global vault
3. Sentinel will sync anonymized patterns and learnings
4. Helps improve bootstrap prompts across your projects

### Override Rules
Intentionally override detected patterns:
1. Click "Add Override" in Settings
2. Specify which rule to override
3. Provide reasoning for why the override is intentional
4. Sentinel will remember this override for future sessions

## Configuration

Sentinel uses a `.sentinel/config.yml` file in your project root:

```yaml
productDescription: "My awesome web application"
stack:
  - TypeScript
  - React
  - Node.js
  - PostgreSQL
requirements:
  - No telemetry collection
  - All data must be encrypted at rest
  - Response times under 200ms
antiPatterns:
  - Direct database access in UI components
  - Hardcoded API keys
  - Synchronous file operations in request handlers
designRules:
  - Use React hooks for state management
  - Follow atomic design principles
  - Implement proper error boundaries
carryOverRules:
  - Always validate user input
  - Use prepared statements for SQL queries
defaultMode: passive
allowGitBootstrap: true
allowFileWatcherFallback: true
healthScore:
  contradictionWeight: 0.35
  badPracticeWeight: 0.25
  consistencyWeight: 0.2
  decisionCoverageWeight: 0.1
  sessionTrendWeight: 0.1
```

## LLM Provider Details

### Gemini (Google AI Studio)
- **Best for**: General purpose, long context (2M+ tokens)
- **Recommended models**: `gemini-2.0-flash`, `gemini-2.0-pro`
- **API key source**: [AI Studio](https://aistudio.google.com/apikey)
- **Notes**: Excellent for processing large codebases

### OpenAI
- **Best for**: General purpose, wide model availability
- **Recommended models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **API key source**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Notes**: Industry standard with good balance of capability and cost

### Anthropic (Claude)
- **Best for**: Reasoning, coding, safety
- **Recommended models**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- **API key source**: [Anthropic Console](https://console.anthropic.com/)
- **Notes**: Particularly strong at code generation and analysis

### Groq
- **Best for**: Ultra-fast inference
- **Recommended models**: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- **API key source**: [Groq Console](https://console.groq.com/keys)
- **Notes**: LPU technology provides extremely low latency

### Perplexity (Sonar)
- **Best for**: Search-augmented generation, fact-checking
- **Recommended models**: `sonar`, `sonar-pro`
- **API key source**: [Perplexity Settings](https://www.perplexity.ai/settings/api)
- **Notes**: Excellent for contradiction detection with web grounding

### DeepSeek
- **Best for**: Cost-effective, high-performance models
- **Recommended models**: `deepseek-chat`, `deepseek-coder`
- **API key source**: [DeepSeek Platform](https://platform.deepseek.com/api_keys)
- **Notes**: Excellent price/performance ratio, strong coding abilities

### Azure OpenAI Service
- **Best for**: Enterprise environments requiring Azure compliance
- **Endpoint format**: `https://{resource}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions`
- **API key source**: Azure Portal → Azure AI Services
- **Notes**: Uses `api-key` header instead of Authorization Bearer

### Ollama (Local)
- **Best for**: Privacy, zero cost, offline use
- **Setup**: Install from [ollama.com](https://ollama.com/download)
- **API key**: Not required
- **Endpoint**: `http://localhost:11434`
- **Notes**: Completely private, runs entirely on your machine

## Extending Sentinel

### Adding New LLM Providers
Sentinel's LLM abstraction layer makes it easy to add new providers:

1. Add provider to `LlmProviderName` union in `packages/llm/src/router.ts`
2. Extend `ProviderSecrets` interface with the new provider secret
3. Add to `PROVIDER_SECRET_ENV_KEYS` mapping
4. Update `loadProviderSecrets()` to handle the new env var
5. Add generation method following existing patterns
6. Add case to main `generate()` switch statement
7. Update extension provider lists in `provider-state.ts` and `secrets.ts`

### Custom Analyzers
To add custom contradiction or bad practice detectors:
1. Implement analysis logic in `packages/analyzer/src/`
2. Export functions that return `FindingRecord[]` or `ContradictionRecord[]`
3. Register with the analyzer pipeline in `packages/analyzer/src/index.ts`

## Data Storage & Privacy

### Local Storage
All data is stored locally in the `.sentinel/` folder:
- `.sentinel/config.yml` - Project configuration
- `.sentinel/vault/` - Encrypted storage for decisions, patterns, sessions
- `.sentinel/reports/` - Session reports (markdown format)
- `.sentinel/bootstrap.md` - Current bootstrap prompt
- `.sentinel-home/` - Global settings and cross-project learnings

### Privacy Controls
- No data is sent to external servers by default
- API keys are stored in VS Code's SecretStorage (system keychain)
- Project analysis happens entirely on your machine
- Optional global vault sync is anonymized and opt-in
- You can inspect, export, or delete all local data at any time

## Troubleshooting

### Common Issues

**Provider Connection Failed**
- Verify API key is correctly entered
- Check internet connectivity
- Ensure provider service is operational
- Try testing connection in Settings panel

**Extension Not Showing Data**
- Ensure you have opened a folder workspace (not just a file)
- Verify `.sentinel/` folder exists in project root
- Check that a session is started (Home tab shows status)
- Try restarting the VS Code window

**High CPU Usage**
- File watchers can be intensive on large projects
- Disable `allowFileWatcherFallback` in settings if needed
- Consider increasing debounce intervals for large monorepos

**Bootstrap Prompt Not Generating**
- Ensure project config exists (`config.yml`)
- Verify LLM provider is properly configured
- Check that temperature and model settings are valid
- Try regenerating from the Bootstrap tab

### Getting Help
- Check the [CHANGELOG](./CHANGELOG.md) for recent updates
- Review test output with `npm test`
- Examine logs in the Developer Console (View → Toggle Developer Tools)
- File issues on the GitHub repository

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for:

- Development setup instructions
- Coding conventions and standards
- Pull request process
- Release workflow
- How to report issues

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/your-username/sentinel.git
cd sentinel

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run full verification
npm run verify
```

## License

Sentinel is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Inspired by the need for better AI-assisted development consistency
- Built with TypeScript, React, and VS Code Extension APIs
- Thanks to all open-source projects that make this possible
- Special thanks to early adopters and contributors

---
*Last updated: May 2026*