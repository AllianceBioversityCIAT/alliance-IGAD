# Copilot Commit Nomenclature Rule

This rule mirrors the canonical commit message expectations defined in `.amazonq/rules/commit-nomenclature.md` and adapts them for GitHub Copilot generated suggestions. Any Copilot completion that proposes a commit message must comply with the requirements below.

## Mandatory Format
```
<type>: <description>

[optional body]

[optional footer]
```

## Commit Types (REQUIRED)

### Primary Types
- **feat**: New feature or functionality
- **fix**: Bug fix or error correction
- **docs**: Documentation changes only
- **style**: Code formatting, missing semicolons (no logic change)
- **refactor**: Code restructuring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependencies, build process

### Secondary Types
- **perf**: Performance improvements
- **ci**: CI/CD pipeline changes
- **build**: Build system or external dependencies
- **revert**: Reverting previous commits

Copilot must not suggest any other commit prefix unless explicitly requested by the user.

## Description Rules

### Format Requirements
- **Lowercase**: Start with a lowercase letter
- **Imperative mood**: "add feature" not "added feature"
- **No period**: Do not end with a period
- **Max 50 characters**: Keep the description concise
- **Present tense**: "fix bug" not "fixed bug"

### Examples
```bash
✅ GOOD:
feat: add user authentication system
fix: resolve database connection timeout
docs: update API documentation
refactor: simplify payment processing logic
test: add unit tests for user service
chore: update dependencies to latest versions

❌ BAD:
Added new feature
Fixed a bug
Update docs
Refactoring code
Various changes
WIP
```

## Multi-line Format

### With Body
```
feat: add user authentication system

- Implement JWT token validation
- Add login/logout endpoints
- Create user session management
- Update security middleware
```

### With Footer
```
fix: resolve database connection timeout

Closes #123
Fixes #456
```

## Scope (Optional)
```
feat(auth): add JWT token validation
fix(api): resolve timeout issues
docs(readme): update installation guide
```

## Breaking Changes
```
feat!: redesign user authentication API

BREAKING CHANGE: Authentication endpoints now require API key
```

Copilot should append `!` to the type only when the completion clearly communicates a breaking change in the description or body.

## Copilot Enforcement
- When asked for a commit message, Copilot should propose output that already satisfies this rule set.
- Copilot must refuse to suggest multi-line commit bodies that contradict the type or description.
- Copilot should remind the user of these conventions when a provided commit message does not comply.
- Copilot must never propose automatic commits or commands that perform `git commit` without explicit user instruction.

## Security Guardrails
- Mirror the Amazon Q security checks conceptually: Copilot should warn the user if the staged changes appear to introduce secrets, credentials, PII, or insecure code patterns when crafting commit-related suggestions.
- Copilot must not suggest committing known sensitive information.

## Auto-generated Messages Template
When Copilot prepares a commit message for automated work, use:
```
<type>: <component> <action> completed by Copilot

- Sprint X: <specific changes>
- Updated: <files modified>
- Status: <completion status>
```

## Quick Reference
```bash
feat: add new dashboard component
fix: resolve API endpoint error
docs: update deployment guide
refactor: optimize database queries
test: add integration tests
chore: update package dependencies
```
