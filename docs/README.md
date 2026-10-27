# Documentation

## Current guides

| Document | Purpose |
| --- | --- |
| [Project README](../README.md) | Features, setup, local/mobile use and deployment |
| [1.7.0 release candidate](RELEASE-1.7.0.md) | Candidate scope, compatibility, validation and publication status |
| [Release checklist](RELEASING.md) | Versioning, branches, upgrade baselines, validation and approved publication |
| [Architecture](ARCHITECTURE.md) | Modules, lifecycle, storage, editing, statistics and CSV |
| [History statistics](HISTORY-STATISTICS.md) | Period and aggregation rules, chart interactions and exports |
| [Testing](TESTING.md) | Automated checks and manual regression checklist |
| [Safari and iPhone](IOS-TESTING.md) | WebKit coverage, setup and physical-device limits |
| [Technical debt](TECHNICAL_DEBT.md) | Remaining risks and completed mitigations |
| [Changelog](../CHANGELOG.md) | Changes by version |

## Historical material

- [1.6.0 release notes](RELEASE-1.6.0.md) retain the original release evidence.
- [Archived October 2026 reviews](archive/README.md) retain dated UI assessments and regression results.

Historical test counts and recommendations apply to their recorded revision.
Generated screenshots under `artifacts/` are local/CI evidence and are not shipped
as documentation assets. The production QR SVG remains a supported README asset.

## Maintenance

Update current guides with behavior changes. Keep release-specific results in the
versioned release document. Archive dated assessments when their findings are
implemented; remove obsolete instructions from current guides. Do not delete
historical evidence merely because its test count is older.

The 1.7.0 preparation corrected stale deployment triggers, missing statistics and
storage documentation, CSV column descriptions and resolved test-coverage debt.
Five dated review documents were archived; no historical release evidence required
deletion. `npm test` checks local Markdown links and release-version consistency.
