# Coop Tracker (Ferret edition)

A slim fork of [carpetsage/egg](https://github.com/carpetsage/egg) that ships **one app only** — the Egg Inc. Coop Tracker — under a ferret-themed dark UI. All other wasmegg apps (rockets, enlightenment, ascension-planner, etc.) and their build pipelines have been removed; everything in this repo exists to build and ship `eicoop`.

- Source: <https://github.com/SashaXaumi/egg>
- Live site: deployed to Netlify via GitHub Actions (site id is held in the repo's `NETLIFY_EICOOP_SITE_ID` secret).
- Upstream we track for game-protocol updates: <https://github.com/carpetsage/egg> (registered as the `upstream` remote).

## Repo layout

pnpm workspaces. The three packages are:

| Path | Purpose |
|---|---|
| `lib/` | Shared core. The Egg, Inc. API client (`lib/api/`), the generated proto types (`lib/proto/`, gitignored — regenerated from `protobuf/ei.proto`), and game logic helpers (contracts, prophecy eggs, earning bonus, etc.). |
| `ui/` | Shared Vue components (`BaseIcon`, `BaseInfo`, etc.) consumed by `eicoop`. |
| `eicoop/` | The Coop Tracker Vite + Vue 3 app (`name: coop-tracker`). Everything user-facing — `src/components/`, `src/views/`, `src/lib/`, `src/ferret.css` — lives here. |
| `protobuf/ei.proto` | The single source of truth for the reverse-engineered Egg Inc. wire format. `lib/proto/index.{js,d.ts}` are generated from it by `make`. |
| `periodicals/data/` | Static JSON snapshots (contracts, seasons, custom eggs, etc.) synced daily from upstream by a GitHub Action. The fork does **not** call the game's `getconfig` itself. |
| `.github/workflows/` | Two workflows: `build-eicoops.yml` (builds + deploys to Netlify on push) and `update-periodicals.yml` (daily upstream JSON sync, then dispatches a build). |

Anything under `wasmegg/`, `ui-tests/`, or per-app build files from upstream is intentionally absent in this fork.

## Quick start on a new machine

Prerequisites:

- **Node 22+** (matches the version pinned in `build-eicoops.yml`).
- **pnpm** — install via `corepack enable && corepack prepare pnpm@latest --activate`.
- **make** (for the proto regeneration step).
- No `protoc` install needed — `protobufjs-cli` ships its own.

```bash
git clone https://github.com/SashaXaumi/egg.git
cd egg

# Install workspace deps.
pnpm install

# Regenerate the proto types (lib/proto/index.{js,d.ts}). Required after every
# `protobuf/ei.proto` change. Both files are gitignored.
make -C lib init   # one-time inside lib/
make -C lib

# Dev server (Vite + HMR on http://localhost:5173).
cd eicoop
pnpm dev
```

Type check the app before pushing:

```bash
cd eicoop
pnpm vue-tsc --noEmit
```

Production build:

```bash
cd eicoop
pnpm build         # type-checks then `vite build`
# or, to skip type checking (CI uses this):
pnpm fastbuild
```

The build output is `eicoop/dist/`.

## How the app talks to the game

The same-origin proxy `/api/*` is rewritten to `https://www.auxbrain.com/*`:

- In production via [`eicoop/public/_redirects`](eicoop/public/_redirects).
- In dev via Vite's `server.proxy` in `eicoop/vite.config.ts`.

Every game call goes through [`lib/api/index.ts`](lib/api/index.ts): build a JS request object → `encodeMessage` to protobuf base64 → POST `data=<base64>` as form-urlencoded → `decodeMessage` the base64 response (most are wrapped in an `AuthenticatedMessage` envelope, sometimes gzipped). The client identity (version, build, platform) lives in [`lib/api/version.ts`](lib/api/version.ts) and is sent on every request as `BasicRequestInfo`.

When the game updates, this `version.ts` and `protobuf/ei.proto` are the two places to sync. See "Tracking upstream" below.

## Deployment

`build-eicoops.yml` runs on push to `main`, on push of `protobuf/ei.proto`, or on workflow_dispatch:

1. Sets up Node 22 + pnpm.
2. `make init && make` inside `lib/` to regenerate proto.
3. `pnpm install` + `pnpm fastbuild` inside `eicoop/`.
4. `netlify deploy --prod -d eicoop/dist` (or `--alias` for branches / commit SHAs).

Required GitHub repository secrets:

| Secret | Used by |
|---|---|
| `NETLIFY_AUTH_TOKEN` | netlify deploys |
| `NETLIFY_EICOOP_SITE_ID` | netlify deploys |

There is no `EI_USERID` secret on this fork — the daily `update-periodicals` job pulls already-synced JSON from upstream rather than calling the game API directly.

The Netlify config (`eicoop/netlify.toml`) just sets `publish = "./dist/"`. All routing is in `eicoop/public/_redirects`.

## Tracking upstream (game-version sync)

When the game ships a new version and breaks the dashboard, the fix lives upstream in `carpetsage/egg`. The recipe:

```bash
git fetch upstream
# Find the relevant fix commits (look for "fix dashboard" / "update protos").
git log --oneline HEAD..upstream/main -- protobuf/ei.proto lib/api/

# 1. Adopt the new proto definition.
git show upstream/main:protobuf/ei.proto > protobuf/ei.proto

# 2. Regenerate generated types.
make -C lib

# 3. Bump client identity in lib/api/version.ts (APP_VERSION / APP_BUILD /
#    CLIENT_VERSION) to whatever the upstream commit set them to.

# 4. Apply any new helper functions in lib/api/index.ts and the call-site fixes
#    in eicoop/src/lib/ + components. Cherry-pick selectively — most upstream
#    diffs touch wasmegg/* files that don't exist here.
```

The most recent sync (`ed36a247`, "Sync game 1.35.7") is a worked example of this flow.

## Theme

The ferret dark theme lives in `eicoop/src/ferret.css`: CSS tokens on `:root` (`--bg-0`..`--bg-3`, `--text-0`..`--text-3`, `--gold`, `--leaf`, `--cinnamon`, `--rose`, etc.), an app-wide `body` rule, and scoped `.ferret …` component classes (`.hero`, `.squad-card`, `.den-card`, etc.). Fonts (Fredoka / Nunito / JetBrains Mono) are loaded by a `<link>` in `eicoop/index.html` so they aren't render-blocked behind the CSS bundle.

Originally derived from a claude.ai/design "Ferret coop" handoff (Variant C). The design didn't ship as-is — the den, the player rows, and several other pieces have been iterated on locally.

## Credits

- Upstream: <https://github.com/carpetsage/egg>.
- Original project: <https://github.com/fanaticscripter/egg>.
- Egg, Inc. game assets are served verbatim from the upstream CDN at `https://eggincassets.pages.dev/`.
