# hardstuckgold — Specification

A personal League of Legends companion app. Runs locally on the player's own machine, detects when the League client is running, and automatically surfaces the right information for each phase of a match — champ select, live game, and post-game — including the player's own history with every summoner they've ever been matched with or against.

## 1. Overview & Goals

### Goals

- **Zero-interaction lifecycle.** The app lives in the system tray. It detects the League client starting and closing on its own, and shows/hides/focuses its window as the game phase changes. The player never has to open or refresh anything mid-session.
- **Personal encounter history.** Every finished match is persisted locally. When a familiar summoner shows up in champ select, the app surfaces it: how many games with/against them, and the win-loss record. This is data no mainstream tool offers, because it is derived from _your_ match history from _your_ perspective.
- **Lean, ad-free UI.** Exactly the information the player wants, and nothing else.

### Non-goals

- **No in-game overlay/HUD.** This is a separate desktop window (like Porofessor's companion window), not something drawn over the game. No game-process injection of any kind.
- **No cloud component.** Single-user, local-only. The database is a local file; nothing is uploaded anywhere.
- **No aggregate meta statistics.** "This build wins 54% at Gold" requires mining millions of matches. Out of scope; per-player real data (rank, history, mastery) instead.
- **No manual notes on players** (may be revisited later; see §7).
- **No automation of gameplay or client actions.** The app only reads data. It never issues commands to the game or client on the player's behalf.

## 2. Data Sources

| Source               | Auth                                        | Availability                    | Used for                                              |
| -------------------- | ------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| Riot Games API       | Personal dev API key (expires every 24h)    | Always (internet)               | Rank, match history, mastery, match details           |
| Live Client Data API | None (localhost only)                       | Only while a match is running   | Real-time in-game stats                               |
| LCU API              | Token+port from `lockfile` (localhost only) | While the League client is open | Game phase, champ select lobby, local player identity |

### 2.1 Riot Games API (official)

- Base: regional/platform hosts, e.g. `https://na1.api.riotgames.com` / `https://americas.api.riotgames.com`.
- **Routing caveat:** League-V4 and champion-mastery-v4 use _platform_ routing (`na1`, `euw1`, …); Match-V5 uses _regional_ routing (`americas`, `europe`, `asia`). Mixing these up produces silent 404s.
- Endpoints used: League-V4 (ranked entries), Match-V5 (match ids + match detail), champion-mastery-v4 (per-champion mastery).
- **Key expiry:** personal development keys expire every 24 hours and must be re-pasted by the user. The app must detect 401/403 responses and surface a prominent "API key expired" state rather than failing silently (see §4.6).
- **Rate limits:** ~20 requests/s and 100 requests/2 min app-wide, plus separate per-method limits. All requests must go through a shared rate limiter + concurrency-capped queue (see §6).

### 2.2 Live Client Data API (official, local)

- Base: `https://127.0.0.1:2999/liveclientdata/` — served by the game process itself, only while a match is actively running.
- Self-signed certificate; TLS verification is disabled _for this client only_.
- Primary endpoint: `/allgamedata` (players, scores, items, levels, gold, events).
- Data is available for **all 10 players**, not just the local player.
- Right at game start and end the endpoint can return partial payloads or connection errors; the poller must tolerate this without crashing or flashing errors in the UI.

### 2.3 LCU API (unofficial, local)

- The League client hosts a local HTTPS API. Port and auth password are read from a single-line `lockfile` in the League install directory, format `process:pid:port:password:protocol`, HTTP Basic auth as `riot:<password>`.
- Self-signed certificate; TLS verification is disabled _for this client only_.
- Used for: gameflow phase (`/lol-gameflow/v1/gameflow-phase`), champ select session (participant puuids), and the local player's own identity.
- Unofficial but stable and widely used by community tools for years. If Riot ever changes it, only `src/main/lcu/` should need to change.

## 3. Architecture

Electron app with strict process separation (`contextIsolation: true`, `nodeIntegration: false`):

- **Main process** (`src/main/`) owns all I/O: lockfile watching, the three API clients, the SQLite database, config storage, and window/tray lifecycle.
- **Preload** (`src/preload/`) exposes a minimal typed bridge via `contextBridge`.
- **Renderer** (`src/renderer/`) is a React UI with one view per phase. It never touches Node APIs; it only talks over the IPC bridge.
- **Shared** (`src/shared/`) holds the IPC contract — the single source of truth for channel names and payload types, imported by both sides so main/preload/renderer cannot drift out of type sync.

Data flow: `phase change (LCU) → orchestrator → fetch (Riot API / Live Client / DB) → IPC push → renderer view` — and the orchestrator also decides window visibility. All phase-reaction logic lives in `src/main/orchestrator.ts`; pollers do not directly control windows or views.

```
lockfile watcher ──> LCU client ──> phase machine ──┐
                                                    v
Riot API client <────────────── orchestrator ──> window show/hide
Live Client poller <───────────────┤                │
SQLite (repositories) <────────────┘                v
                                              IPC ──> renderer views
```

## 4. Feature Specs

### 4.1 Phase detection & window lifecycle

- Watch for the `lockfile` appearing/disappearing at the configured League install path (default `C:\Riot Games\League of Legends\lockfile`), debounced, with retry on transient read failures (Windows can briefly lock the file mid-write).
- Poll the LCU gameflow phase and reduce it to app phases: `None → Lobby → ChampSelect → InProgress → EndOfGame`.
- Tray icon reflects state (League closed / idle / in phase). Window auto-shows and focuses on entering ChampSelect, InProgress, and EndOfGame; hides to tray when League closes. Closing the window hides it to the tray instead of quitting; quit is a tray menu action.
- Single instance enforced via `app.requestSingleInstanceLock()`.

### 4.2 Champ select view

- On entering ChampSelect, read the 10 participants' puuids from the LCU session.
- For each participant, fetch in parallel (through the rate-limited queue): ranked entries (League-V4), recent match history (Match-V5, last ~10 games), champion mastery for their hovered/locked champion (champion-mastery-v4), and encounter stats from the local DB.
- **Per-summoner error isolation:** one participant's failed lookups render as "no data" for that row only; they never block the other nine.
- View: one row per participant per team — rank, recent form (W/L of recent games), mastery on picked champion, encounter badge ("3 games with, 2–1" / "1 game against, 0–1" / nothing if never met).

### 4.3 Live game view

- On entering InProgress, poll the Live Client Data API (~2s interval).
- View: both teams' players with level, items, gold, KDA, CS; game events feed (kills, objectives) as available.
- Missing/partial fields render as placeholders; the poller backs off and retries while the endpoint is not yet up (game loading) and stops cleanly when the game ends.

### 4.4 Post-game persistence & review

- On EndOfGame, fetch the finished match from Match-V5. The match may not be queryable immediately — retry with backoff (a few attempts, seconds apart).
- Persist idempotently (re-processing the same match must not duplicate rows): one `matches` row + ten `match_participants` rows (see §5).
- View: personal summary of the match (result, KDA, damage, vision), plus trends over recent games from the local DB (winrate, KDA, CS trends).

### 4.5 Encounter history

- Derived entirely from persisted matches via the `encounter_stats` SQL view (§5): games with / against each puuid, wins together, last-played timestamp.
- Surfaces in the champ select view (§4.2). Empty DB simply means no badges — no errors.
- Fills organically as matches are played and persisted; backfilling older history from Match-V5 is a possible later enhancement (§7).

### 4.6 Config

- Settings screen for: Riot API key (stored encrypted via Electron `safeStorage`, never in SQLite or plaintext), League install path (with folder picker), platform/region (e.g. `na1`, defaulting sensibly).
- **Key expiry UX:** on any 401/403 from the Riot API, show a persistent banner ("Your API key has expired — paste a fresh one") that links to the settings screen and to developer.riotgames.com. Local-only features (LCU phase detection, live game view) keep working with an expired key; only Riot API-backed panels degrade.
- Optional proactive warning once the stored key is older than ~20 hours (keys have no queryable expiry timestamp).

## 5. Data Model

SQLite database in Electron's `userData` directory, accessed only from the main process through repository modules (`src/main/db/repositories/`). Migrations are plain SQL files applied in filename order and recorded in `schema_migrations`.

```sql
CREATE TABLE matches (
  match_id TEXT PRIMARY KEY,                 -- e.g. "NA1_1234567890"
  platform_id TEXT NOT NULL,
  game_creation INTEGER NOT NULL,            -- epoch ms
  game_duration INTEGER NOT NULL,            -- seconds
  queue_id INTEGER NOT NULL,
  game_version TEXT NOT NULL,
  my_puuid TEXT NOT NULL,
  my_champion_id INTEGER NOT NULL,
  my_win INTEGER NOT NULL,                   -- 0/1
  raw_json TEXT NOT NULL,                    -- full Match-V5 DTO for future re-parsing
  persisted_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE match_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  riot_id_game_name TEXT,
  riot_id_tagline TEXT,
  team_id INTEGER NOT NULL,                  -- 100/200
  champion_id INTEGER NOT NULL,
  win INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  team_position TEXT,
  is_me INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT,
  UNIQUE(match_id, puuid)
);
CREATE INDEX idx_participants_puuid ON match_participants(puuid);
CREATE INDEX idx_participants_match ON match_participants(match_id);

CREATE VIEW encounter_stats AS
SELECT
  other.puuid AS other_puuid,
  COUNT(*) AS games_total,
  SUM(CASE WHEN other.team_id = me.team_id THEN 1 ELSE 0 END) AS games_with,
  SUM(CASE WHEN other.team_id != me.team_id THEN 1 ELSE 0 END) AS games_against,
  SUM(CASE WHEN other.team_id = me.team_id AND me.win = 1 THEN 1 ELSE 0 END) AS wins_with,
  MAX(m.game_creation) AS last_played
FROM match_participants me
JOIN match_participants other
  ON other.match_id = me.match_id AND other.puuid != me.puuid
JOIN matches m ON m.match_id = me.match_id
WHERE me.is_me = 1
GROUP BY other.puuid;

CREATE TABLE schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

Encounter counts are **computed on read via the view**, not maintained as a separate table — at personal scale (thousands of matches) an indexed self-join is fast, and a view cannot drift out of sync.

The Riot API key is deliberately **not** in this database; it lives encrypted in the config store (§4.6).

## 6. Non-functional Requirements

- **Rate limiting:** every Riot API request goes through a token-bucket limiter honoring app-wide and per-method limits, plus `Retry-After` on 429. Champ select fans out ~30 calls; a concurrency-capped queue sits in front of the limiter.
- **TLS:** `rejectUnauthorized: false` is scoped to dedicated agents for the LCU and Live Client clients only. Riot API requests use normal TLS verification. Never process-wide.
- **Resilience:** partial/missing live data never crashes a view; per-summoner lookups fail independently; DB writes are idempotent.
- **Platform:** Windows 10/11 only for the initial releases.
- **Privacy:** stores other players' public match data (puuids, riot ids, match stats — the same data any match-history site shows) locally only. Nothing leaves the machine except requests to Riot's own APIs.
- **Testing:** business logic (lockfile parsing, rate limiter, phase machine, DTO→row mapping, encounter view) is unit-tested against fixtures; CI (lint, typecheck, test, build) must pass before merge.

## 7. Out of Scope / Future Ideas

- Auto-updater (electron-updater + GitHub Releases)
- Backfilling encounter history from older Match-V5 history
- Manual notes on players
- Richer trend charts; multi-account support; other OSes; overlay mode
- Configurable polling intervals

## 8. Glossary

| Term                             | Meaning                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **LCU**                          | "League Client Update" — the League client and its local API                                |
| **lockfile**                     | File the client writes with the LCU port + auth password                                    |
| **Live Client Data API**         | Local API served by the _game_ process during a match (port 2999)                           |
| **puuid**                        | Riot's globally unique, persistent player id                                                |
| **Riot ID**                      | Player-facing name: `gameName#tagLine`                                                      |
| **Gameflow phase**               | LCU's session state (`Lobby`, `ChampSelect`, `InProgress`, `EndOfGame`, …)                  |
| **Platform vs regional routing** | `na1`/`euw1`-style hosts vs `americas`/`europe`-style hosts for different Riot API families |
| **DTO**                          | Data transfer object — the JSON shape a Riot endpoint returns                               |
| **Queue id**                     | Riot's numeric id for a game mode/queue (e.g. 420 = ranked solo)                            |
