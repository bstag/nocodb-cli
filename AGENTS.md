# Repository Guidelines

## Project Structure & Module Organization
This repo is an npm workspace monorepo with two packages under `packages/`:
- `packages/sdk`: TypeScript SDK (`src/` for implementation, `test/` for Vitest suites).
- `packages/cli`: CLI app (`src/commands`, `src/services`, `src/utils`, `src/config`, and `test/`).

Shared assets live at the root: `openapi/` (API specs), `scripts/` (E2E runner/report), and docs such as `README.md` and `CONTRIBUTING.md`.

## Build, Test, and Development Commands
- `npm install`: install all workspace dependencies (Node `>=18`, npm `>=11`).
- `npm run build`: build SDK first, then CLI.
- `npm run test`: run all Vitest suites across SDK and CLI.
- `npm run dev -- <args>`: run CLI entrypoint with `tsx` for local development (example: `npm run dev -- bases list`).
- `npm run e2e`: run end-to-end CLI tests via `scripts/e2e-cli.mjs` against a live NocoDB instance.
- Package-scoped commands: `npm --prefix packages/sdk run test` and `npm --prefix packages/cli run test`.

## Coding Style & Naming Conventions
Use TypeScript + ESM conventions already used in the repo:
- 2-space indentation, semicolons, single quotes.
- Prefer explicit types; avoid `any` unless unavoidable.
- Keep imports ESM-compatible (including `.js` in TypeScript import paths where used).
- File naming: command/service modules are kebab-case (for example, `rows-bulk-upsert.test.ts`).

Lint scripts currently exist but are placeholders (`"no lint yet"`), so rely on tests and type-safe changes.

## Testing Guidelines
- Framework: Vitest in both packages.
- Naming: `*.test.ts`; use `*-e2e.test.ts` for end-to-end tests.
- Add tests with each behavior change, especially for command parsing, service logic, and API interaction paths.
- Before opening a PR, run: `npm run build && npm run test`.

## Commit & Pull Request Guidelines
Commit history follows conventional-style prefixes (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`). Keep messages imperative and scoped.

PRs should include:
- clear summary of what changed and why,
- linked issue(s) when applicable,
- updated tests/docs for user-facing or API changes,
- sample CLI output when behavior/output formatting changes.
