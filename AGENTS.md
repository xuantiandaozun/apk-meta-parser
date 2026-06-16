# Repository Guidelines

## Project Structure & Module Organization

This package is a browser-oriented TypeScript library for parsing APK metadata. Source code lives
in `src/`; the public entry point is `src/index.ts`, with the main parser in
`src/parseApkMeta.ts`. Android binary XML helpers are grouped under `src/axml/`, while shared
types and errors are in `src/types.ts` and `src/errors.ts`.

Tests live in `test/` and mirror parser concerns, for example `parseApkMeta.test.ts` and
`stringPool.test.ts`. Build output is generated in `dist/`; do not edit it manually.

## Build, Test, and Development Commands

- `npm run build`: bundles the library with `tsup` into ESM, CommonJS, and declaration outputs.
- `npm run test`: runs the Vitest suite once.
- `npm run test:watch`: runs Vitest in watch mode during development.
- `npm run coverage`: runs Vitest with V8 coverage for `src/**`.
- `npm run lint`: checks `src` and `test` with ESLint.
- `npm run typecheck`: runs `tsc --noEmit`.
- `npm run prepublishOnly`: full release gate: build, typecheck, and tests.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, semicolons, double quotes, ES5 trailing commas, and a
100-character print width. These rules are captured in `.prettierrc`.

Prefer named exports for library APIs. Use `camelCase` for functions and variables, `PascalCase`
for types and interfaces, and descriptive filenames such as `stringPool.ts` and
`stringPool.test.ts`.

## Testing Guidelines

Vitest is configured with the `happy-dom` environment. Add tests under `test/` with the
`*.test.ts` suffix. For parser changes, cover normal APK metadata extraction and edge/error
behavior. Run `npm run test` and `npm run typecheck` before handing off a change; use
`npm run coverage` for shared parsing logic.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits, such as `feat: initial release v0.1.0` and
`fix: rename eslint.config.js to .mjs for ESM compatibility on Node 18`. Keep commit subjects
short, imperative, and scoped by type (`feat`, `fix`, `chore`, `docs`, etc.).

Pull requests should include a brief description, rationale, and verification commands. Link
related issues when available. Include screenshots only for documentation or browser-facing
examples where visuals changed.

## Security & Configuration Tips

`jszip` and `spark-md5` are peer dependencies; do not bundle alternate ZIP or hashing libraries
without a clear compatibility reason. Avoid committing real APK samples or large binaries. When
adding fixtures, prefer minimal generated data that exercises the parser behavior.
