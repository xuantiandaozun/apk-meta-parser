# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-04-21

### Changed
- README: add npm version / downloads / bundle size / license / CI badges
- README: update label resolution notes to reflect resources.arsc support

## [0.2.0] - 2026-04-21

### Added
- Resolve `android:label` resource IDs via `resources.arsc` — APKs built with
  uni-app and similar tools now return the real app name instead of falling back
  to `packageName`. `labelIsResourceId` is only `true` when the lookup fails.

### Fixed
- `TYPE_REFERENCE` label attributes (value type `0x01`) were not detected as
  resource IDs; they are now correctly formatted as `@0xXXXXXXXX` before lookup.

## [0.1.0] - 2026-04-21

### Added
- `parseApkMeta(file, options?)` — main API for parsing APK metadata in the browser
- `ApkMeta` result type with `packageName`, `versionName`, `versionCode`, `label`, `labelIsResourceId`, `apkSize`, `apkMd5`
- `ParseOptions`: `skipMd5`, `partial`, `locale` (`"en"` | `"zh"`)
- `ApkParseError` with typed error codes: `NOT_A_ZIP`, `MANIFEST_NOT_FOUND`, `INVALID_AXML`, `INCOMPLETE_MANIFEST`
- Bilingual error messages (English / 中文)
- Android binary XML (AXML) parser — hand-written, zero native dependencies
- UTF-8 and UTF-16 string pool decoding
- `versionCode` large-number safety (reads string pool before `getUint32` fallback)
- `labelIsResourceId` flag for unresolvable resource references
- Heuristic fallback string-pool scan when structured parsing yields incomplete data
- ESM + CJS dual output via tsup
- TypeScript type declarations
- GitHub Actions CI (Node 18 / 20 / 22) and npm publish workflow
- README in English and Chinese

[Unreleased]: https://github.com/xuantiandaozun/apk-meta-parser/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/xuantiandaozun/apk-meta-parser/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/xuantiandaozun/apk-meta-parser/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/xuantiandaozun/apk-meta-parser/releases/tag/v0.1.0
