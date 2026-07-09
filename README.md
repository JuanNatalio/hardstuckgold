# hardstuckgold

A personal League of Legends companion app. Runs locally, auto-detects when League of Legends is running, and shows live champ-select/in-game/post-game data tailored to you — including your own history with summoners you've played with or against before.

Full design and build sequence: see [`docs/spec.md`](docs/spec.md). Workflow and code conventions: see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Requirements

- Node.js 24+
- Windows 10/11 (initial target platform)
- A personal Riot Games API key from [developer.riotgames.com](https://developer.riotgames.com)

## Development

```sh
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the app in development mode with hot reload
- `npm run build` — build for production
- `npm run typecheck` — type-check main/preload and renderer
- `npm run lint` — lint the codebase
- `npm test` — run unit tests
