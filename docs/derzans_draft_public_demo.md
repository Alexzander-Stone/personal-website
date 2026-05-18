# Derzan's Draft Public Demo

This site contains the public-safe Derzan's Draft surface:

- `/derzans-draft/`
- `/derzans-draft/proof/`

The pages must only read sanitized artifacts from `public/data/derzans-draft/`. They should never import raw proof exports, team configs, private case files, local solver paths, seeds, search effort values, visit counts, raw EVs, or trace trees.

## Refresh The Public Proof Data

From this repo:

```bash
npm run derzan:proof
```

By default this expects the Derzan solver repo at:

```text
../league-of-legends-optimal-team-comp
```

To use another local checkout:

```bash
DERZANS_DRAFT_REPO=/path/to/league-of-legends-optimal-team-comp npm run derzan:proof
```

The command writes:

- `public/data/derzans-draft/proof-viewer.json`
- `public/data/derzans-draft/public-proof-summary.json`
- `public/data/derzans-draft/public-proof-summary.md`

## Verify Before Deploy

```bash
npm run derzan:proof
npm run build
npm run derzan:safety
npm run a11y:check
```

If the local Playwright install has Chromium but not the headless-shell binary, point the check at the installed browser:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run a11y:check
```

## Public Claim Boundary

The public pages can say Derzan found a stronger branch under an explicit analyst-authored model. They must not say:

- T1 would have won.
- The coach was wrong.
- League draft is solved globally.
- Exact values, private configs, or raw search traces are available publicly.

The public proof is a conversation starter. Private pilots are where team-specific assumptions and deeper audit outputs belong.
