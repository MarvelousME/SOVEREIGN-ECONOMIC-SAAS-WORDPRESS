# Contributing to UBI CMS

Thank you for your interest in contributing to UBI CMS. This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Review Requirements](#code-review-requirements)
- [Testing Requirements](#testing-requirements)
- [Coding Standards](#coding-standards)
- [Security Reporting Policy](#security-reporting-policy)
- [Documentation](#documentation)

---

## Getting Started

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/SOVEREIGN-ECONOMIC-SAAS-WORDPRESS.git
cd SOVEREIGN-ECONOMIC-SAAS-WORDPRESS
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/<original-owner>/SOVEREIGN-ECONOMIC-SAAS-WORDPRESS.git
```

4. Create your working branch:

```bash
git checkout -b feature/my-feature
```

### Repository Structure

```
SOVEREIGN-ECONOMIC-SAAS-WORDPRESS/
├── api/                    # Node.js/Express backend
├── frontend/               # Next.js portal UI
├── services/               # Microservices
├── migrations/             # Database migrations
├── shared/                 # Shared libraries
├── docs/                   # Documentation
├── tests/                  # E2E and integration tests
└── infrastructure/        # Docker and infrastructure configs
```

---

## Development Setup

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| Docker Desktop | 4.x |
| Docker Compose | 2.x |
| Git | 2.x |

### Initial Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start infrastructure services
docker compose -f docker-compose.local.yml up -d postgres redis

# Start development servers
npm run local:up
```

For detailed setup instructions, see [docs/developer-guide.md](./docs/developer-guide.md).

---

## Branch Naming Convention

Use the following prefixes for branch names:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/user-dashboard` |
| `fix/` | Bug fixes | `fix/task-assignment-error` |
| `hotfix/` | Urgent production fixes | `hotfix/security-patch` |
| `docs/` | Documentation only | `docs/api-reference-update` |
| `refactor/` | Code refactoring | `refactor/auth-module` |
| `test/` | Test additions/changes | `test/ubi-claim-workflow` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

Branches should be short-lived and focused on a single change.

---

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code changes that neither fix bugs nor add features |
| `test` | Adding or correcting tests |
| `chore` | Changes to build process, dependencies, tools |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

### Scope

Optional scope indicates the affected module:

- `api` - API layer changes
- `auth` - Authentication changes
- `ui` - Frontend/UI changes
- `db` - Database changes
- `infra` - Infrastructure changes
- `ubi` - UBI engine changes
- `treasury` - Treasury service changes
- `tasks` - Task marketplace changes

### Examples

```
feat(api): add task submission endpoint
fix(treasury): correct withdrawal calculation
docs: update API reference with new endpoints
test(auth): add integration tests for JWT refresh
chore(deps): update express to 4.19.0
refactor(ui): extract reusable dashboard components
```

### Commit Message Rules

1. Subject line should be 72 characters or less
2. Use imperative mood ("add feature" not "added feature")
3. Do not end subject line with a period
4. Separate subject from body with a blank line
5. Reference issues in footer: `Closes #123`

---

## Pull Request Process

### Before Submitting

1. **Sync with upstream**: Ensure your branch is up to date with the latest changes

```bash
git fetch upstream
git rebase upstream/main
```

2. **Run tests locally**: All tests must pass before submission

```bash
npm test
cd frontend/portal-ui && npm run lint && npx tsc --noEmit
```

3. **Check coverage**: Ensure test coverage meets the 80% threshold

```bash
npm run test:coverage
```

### Creating a Pull Request

1. Push your branch to your fork:

```bash
git push origin feature/my-feature
```

2. Open a Pull Request on GitHub
3. Fill in the PR template completely
4. Link related issues using keywords (`Closes #`, `Fixes #`, etc.)

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed and results

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback promptly
3. Once approved, a maintainer will merge your PR
4. Delete the branch after merge (or let GitHub do it)

---

## Code Review Requirements

### For Contributors

- Respond to all comments within 48 hours
- Make requested changes in a new commit
- Use `Review Changes` to indicate completion
- Be respectful and professional

### For Reviewers

- Review within 48 hours of assignment
- Check code quality, test coverage, and documentation
- Provide constructive feedback
- Approve or request changes clearly

### Review Checklist

- [ ] Code follows existing patterns and conventions
- [ ] Tests cover happy path and edge cases
- [ ] No security vulnerabilities introduced
- [ ] No performance regressions
- [ ] Documentation updated where needed
- [ ] TypeScript types are correct (frontend)
- [ ] No hardcoded secrets or credentials
- [ ] No `TODO` or `FIXME` comments left unresolved

---

## Testing Requirements

### Coverage Thresholds

| Metric | Minimum |
|--------|---------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

### Test Types

#### Unit Tests

```bash
npm run test:unit
cd services/ledger-service && npm test
```

#### Integration Tests

```bash
npm run test:integration
```

#### E2E Tests

```bash
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

#### All Tests with Coverage

```bash
npm test -- --coverage
```

### Writing Tests

- Follow the AAA pattern (Arrange, Act, Assert)
- Use factories for consistent test data
- Mock external dependencies
- Test error conditions explicitly
- Keep tests isolated and independent

See [TESTING_QUICK_START.md](./TESTING_QUICK_START.md) for detailed testing instructions.

---

## Coding Standards

### API (Node.js/Express)

- Use `'use strict'` in all files
- Async/await with proper error handling
- Parameterized queries only (no SQL interpolation)
- Use `db.transaction()` for multi-step writes
- Follow existing model/controller patterns

See [docs/developer-guide.md](./docs/developer-guide.md#code-standards).

### Frontend (TypeScript/Next.js)

- `'use client'` directive on all client components
- Define all types (no `any`)
- Use `isDemoUser()` check for demo mode
- Import icons from `lucide-react` only
- Follow existing component patterns

### General

- ESLint rules must pass
- TypeScript strict mode for frontend
- No console.log in production code
- No commented-out code

---

## Security Reporting Policy

### Reporting Vulnerabilities

If you discover a security vulnerability, **do not** open a public issue. Instead:

1. Email the maintainers privately with details
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. Allow 48 hours for initial response
4. Once verified, a fix will be released

### Security-Sensitive Areas

When working with these areas, extra scrutiny is required:

- Authentication and authorization
- Payment and treasury operations
- User data handling
- Session management
- API rate limiting

### Security Best Practices

- Never commit secrets or credentials
- Use environment variables for sensitive config
- Validate all user input
- Sanitize data before rendering
- Follow OWASP Top 10 guidelines

See [docs/SECURITY-HARDENING.md](./docs/SECURITY-HARDENING.md) for detailed security guidelines.

---

## Documentation

### Updating Documentation

- Update relevant docs when changing functionality
- Document new API endpoints in [docs/api-reference.md](./docs/api-reference.md)
- Update architecture diagrams when needed
- Add migration notes for database changes

### Documentation Style

- Use clear, concise language
- Include code examples where appropriate
- Link to related documentation
- Keep docs in sync with code

---

## Related Documents

- [Developer Guide](./docs/developer-guide.md) - Full development setup and practices
- [Testing Quick Start](./TESTING_QUICK_START.md) - Testing guide
- [API Reference](./docs/api-reference.md) - API documentation
- [Architecture](./docs/architecture.md) - System design
- [Security Hardening](./docs/SECURITY-HARDENING.md) - Security guidelines

---

## Questions?

If you have questions, please open a discussion on GitHub or contact the maintainers.

We appreciate all contributions, from bug reports to documentation improvements!
