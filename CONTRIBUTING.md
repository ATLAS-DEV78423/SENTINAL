# Contributing to Sentinel

Thank you for your interest in contributing to Sentinel! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Style Guides](#style-guides)
- [Community](#community)

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Getting Started

### Understanding the Project

Sentinel is a monorepo with the following structure:

```
sentinel/
├── packages/
│   ├── core            # Shared data models, config, scoring
│   ├── analyzer        # Contradiction detection and analysis
│   ├── vault           # Local storage for project knowledge
│   ├── guardian        # Session management and orchestration
│   ├── llm             # Unified LLM provider abstraction
│   ├── cli             # Command-line interface
│   ├── webview         # React-based VS Code webview UI
│   └── extension       # VS Code extension host
├── scripts/            # Installation and utility scripts
└── ...                 # Configuration files
```

### Finding Something to Work On

- Look at [open issues](https://github.com/simplemanslab/sentinel/issues)
- Check the [project roadmap](#project-roadmap) for upcoming features
- Consider improving documentation or adding tests
- Look for "good first issue" labeled issues

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) (for extension development)
- [Python](https://www.python.org/) (optional, for some scripts)

### Setup Steps

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/sentinel.git
   cd sentinel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build all packages**
   ```bash
   npm run build
   ```

4. **Run tests to verify setup**
   ```bash
   npm test
   ```

5. **Run full verification (build, lint, test)**
   ```bash
   npm run verify
   ```

### Development Workflow

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. Make your changes

3. Test your changes:
   ```bash
   # Run tests for specific package
   npm test -w @sentinel/llm
   
   # Or run all tests
   npm test
   ```

4. Build your changes:
   ```bash
   npm run build
   ```

5. Run linting:
   ```bash
   npm run lint
   ```

6. Commit your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```

7. Push to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

8. Open a pull request

## Making Changes

### Adding New LLM Providers

Sentinel's LLM abstraction layer is designed to be extensible. To add a new provider:

1. **Update `packages/llm/src/router.ts`**:
   - Add provider to `LlmProviderName` union type
   - Extend `ProviderSecrets` interface
   - Add to `PROVIDER_SECRET_ENV_KEYS` mapping
   - Update `loadProviderSecrets()` function
   - Add generation method
   - Add case to main `generate()` switch

2. **Update extension files**:
   - `packages/extension/src/provider-state.ts`: Update `PROVIDERS` array and `createEmptySecretStatus()`
   - `packages/extension/src/secrets.ts`: Update `SECRET_PROPERTY_BY_PROVIDER` mapping
   - `packages/extension/src/extension.ts`: Initialize secret status for new provider

3. **Add tests**:
   - Update `packages/llm/test/router.test.js` to test secret loading

### UI/UX Changes

For changes to the VS Code extension UI:

1. Modify components in `packages/webview/src/`
2. Update styles in `packages/webview/src/styles.css`
3. Test changes by running:
   ```bash
   npm run build -w sentinel-vscode
   code --install-extension packages/extension/sentinel-vscode-*.vsix
   ```

### Backend Logic Changes

For changes to core logic (analysis, scoring, etc.):

1. Make changes in the appropriate package (`core`, `analyzer`, `vault`, `guardian`)
2. Add or update tests in the package's `test/` directory
3. Ensure all related tests pass

## Pull Request Process

### Before Submitting

1. Ensure your code follows the [style guides](#style-guides)
2. Make sure all tests pass: `npm test`
3. Run full verification: `npm run verify`
4. Update documentation if needed
5. Squash commits if you have multiple small commits
6. Write a clear, descriptive PR title

### PR Template

Please use the following format for your pull request:

```
## Summary
Brief description of what this PR does

## Changes
- List of specific changes made
- Any breaking changes or migrations needed

## Testing
- How you tested the changes
- Any relevant test output or screenshots

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated (if needed)
- [ ] No sensitive data committed (API keys, etc.)
```

### Review Process

1. A maintainer will review your PR
2. You may be asked to make changes or clarifications
3. Once approved, a maintainer will merge your PR
4. Your branch will be deleted automatically after merging

## Reporting Issues

### Bug Reports

When reporting a bug, please include:
- Sentinel version (from `sentinel --version` or extension version)
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots or screen recordings if applicable
- Relevant logs (from Developer Console: View → Toggle Developer Tools)
- Your environment (OS, VS Code version, etc.)

### Feature Requests

When requesting a feature, please include:
- Clear description of the feature and its benefits
- Use cases or examples
- Any related issues or discussions
- Whether you're willing to help implement it

## Style Guides

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations (run `npm run lint` to check)
- Use descriptive variable and function names
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect meaning (whitespace, formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing ones
- `chore`: Changes to build process or auxiliary tools

Examples:
- `feat(llm): add perplexity provider support`
- `fix(core): correct health score calculation edge case`
- `docs(extension): update provider setup instructions`
- `refactor(analyzer): extract contradiction detection logic`

### Documentation

- Keep README.md up to date with significant changes
- Add JSDoc comments to public APIs and complex logic
- Update inline comments when logic changes
- Use clear, concise language
- Include code examples when helpful

## Project Roadmap

### Near Term (0-3 months)
- [ ] Add more LLM providers (AWS Bedrock, Google Vertex AI)
- [ ] Improve contradiction detection accuracy
- [ ] Add more sophisticated analysis rules
- [ ] Enhance session reporting and analytics
- [ ] Improve global vault sync functionality

### Medium Term (3-6 months)
- [ ] Add support for multi-modal models (image understanding)
- [ ] Implement custom model fine-tuning integration
- [ ] Add team collaboration features
- [ ] Improve CLI scripting capabilities
- [ ] Add IDE integrations beyond VS Code

### Long Term (6+ months)
- [ ] Implement local model training capabilities
- [ ] Add predictive suggestions based on project history
- [ ] Integrate with more development tools (IDEs, CI/CD)
- [ ] Add advanced security and compliance features
- [ ] Explore offline-first mobile companions

## Community

### Getting Help
- Check existing issues before asking questions
- Use GitHub Discussions for general questions
- Reach out to maintainers for complex issues

### Contributor Recognition
All contributors are acknowledged in:
- Release notes
- The CONTRIBUTORS section of README.md
- GitHub contributor graph

### Maintainers
- Current maintainers are listed in the repository
- Maintainers have final say on merging PRs
- Maintainer responsibilities include code review, triaging issues, and guiding project direction

## License

By contributing to Sentinel, you agree that your contributions will be licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Questions?

If you have any questions about contributing, please:
1. Check the documentation
2. Look at existing issues and PRs
3. Ask in GitHub Discussions
4. Reach out to a maintainer

Happy coding! 🚀