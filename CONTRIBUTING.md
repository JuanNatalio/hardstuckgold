# Contributing

This is a personal project, but it is run like a professional one. These conventions apply to all changes, whether written by hand or by an AI agent.

## Workflow

- **Never commit directly to `master`.** All changes land through pull requests from feature branches. `master` is branch-protected and requires the CI `build` check to pass.
- **Branch names** describe the change: `feat/lockfile-watcher`, `fix/rate-limiter-backoff`, `docs/spec-update`, `ci/cache-tweak`.
- **Feature branches are kept after merge** — do not delete branches when merging PRs.
- **One PR per feature** from the build sequence in [docs/spec.md](docs/spec.md); keep PRs reviewable (roughly one concern per PR).
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `ci:`, `chore:`, `refactor:`, `test:`.

## Rules for AI agents

- **Never commit, push, or merge without the repository owner's explicit approval — every time.** Staging changes and preparing commits is fine; the commit/push/merge action itself requires a fresh go-ahead each time.
- Follow the naming conventions below; they are enforced by ESLint where practical.

## Code conventions

- **File naming:**
  - React component files (`.tsx`): **PascalCase** matching the component (`ChampSelectView.tsx`)
  - React hooks: **camelCase** matching the hook (`useGamePhase.ts`)
  - Everything else (main process, preload, shared, utils): **kebab-case** (`lockfile-watcher.ts`)
- **Process boundaries:** the renderer never touches Node APIs; all I/O lives in the main process; IPC channel names and payload types are defined only in `src/shared/ipc-contract.ts`.
- **External HTTP:** all Riot API calls go through the shared rate-limited client (`src/main/riot-api/`) — no ad hoc `fetch` calls.
- **Database:** all reads/writes go through repository modules in `src/main/db/repositories/` — no inline SQL elsewhere.
- **Formatting/linting:** Prettier and ESLint (flat config) are the source of truth. Run `npm run format` before committing.

## Verification

Before opening a PR, all of these must pass locally:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same steps on `windows-latest` and must be green before merge. Changes that affect runtime behavior should also be manually verified by running the app (`npm run dev`) — ideally against a real League client session for LCU/live-game features.
