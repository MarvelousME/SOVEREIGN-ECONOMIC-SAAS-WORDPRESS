# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with monorepo structure
- API service (Node.js/Express)
- Portal UI (Next.js 14)
- PostgreSQL database with migrations
- Redis for caching and sessions
- NATS messaging infrastructure
- Docker Compose development environment

### Changed

### Fixed

### Removed

## [1.0.0] - 2026-04-03

### Added

- User authentication (JWT-based)
- UBI distribution system
- Task marketplace with submission/verification workflow
- Treasury management with deposit/withdraw/yield
- Rewards engine with aggregated earnings
- AI agent marketplace
- Admin control panel
- Demo mode with realistic sample data
- Comprehensive test suite (8 test suites covering all controllers)
- CI/CD pipeline with GitHub Actions

### Changed

### Fixed

### Removed

---

## Version History Format

When adding new versions, use this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description

### Changed
- Change description

### Fixed
- Fix description

### Removed
- Removed feature or deprecated item
```

## Release Types

- **Major** (X.0.0): Breaking changes that require significant updates
- **Minor** (x.Y.z): New functionality in a backwards compatible manner
- **Patch** (x.y.Z): Backwards compatible bug fixes

## Deprecation Policy

Deprecated features will be marked in the changelog with:
- The version they were deprecated in
- The version they will be removed in (if known)
- Alternative functionality to use

## Security Fixes

Security vulnerabilities will be documented separately and may be expedited for release.
