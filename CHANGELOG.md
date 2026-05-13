# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **LLM Provider Expansion**: Added support for Perplexity, DeepSeek, and Azure OpenAI Service providers
  - Perplexity (Sonar API): Search-augmented LLMs for fact-checking and contradiction detection
  - DeepSeek: High-performance, cost-effective models from China
  - Azure OpenAI Service: Microsoft-hosted OpenAI models for enterprise environments
- Enhanced secret management for all providers in VS Code extension
- Updated provider lists in extension UI to include new providers
- Added comprehensive documentation for all supported providers in README.md
- Extended test suite to verify loading of all provider secrets

### Changed
- Updated `@sentinel/llm` package to support 15 total LLM providers
- Modified provider initialization logic in VS Code extension
- Enhanced error handling for provider-specific authentication patterns
- Improved documentation with detailed provider recommendations and usage guides

### Fixed
- Fixed TypeScript compilation errors in extension related to provider secret status initialization
- Corrected secret mapping for all providers in secrets management system
- Resolved build warnings and ensured clean verification process

## [1.0.0] - 2026-05-13

### Added
- Initial release of Sentinel: local-first memory and consistency layer for AI coding tools
- Core functionality: project configuration, session management, contradiction detection
- LLM provider abstraction layer with initial support for:
  - Gemini (Google AI Studio)
  - Grok (xAI)
  - OpenRouter (aggregator)
  - NVIDIA NIM (optimized inference)
  - Ollama (local-first, no API key)
  - Groq (ultra-fast LPU)
  - OpenAI (GPT series)
  - Anthropic (Claude series)
  - Minimax (Abab series)
  - Cohere (Command series)
  - Mistral (Mistral series)
  - Together AI (open-source hosting)
- VS Code extension with rich sidebar UI
- Command-line interface for automation
- Local vault for storing project knowledge and decisions
- Bootstrap prompt generation and management
- Health scoring system
- Session reporting and analytics

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our release process and how to contribute to the changelog.
