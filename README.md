# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/noorrahmadi92-coder/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/noorrahmadi92-coder/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — 178 pre-token protocols ranked by implied token value from live-token comparables, with a farm plan for each. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

## Run it

```sh
node main.ts
```

In the grader, `main.ts` reads the sealed snapshot at `/input/snapshot.json` and writes the ranked board to `/output/board.json`, the dashboard data to `/output/data.js`, and `/output/dossier.json`. Locally, run it against the kit snapshot:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Then open `out/dashboard/index.html` in a browser. No network, no install, Node 22+ only (standard library).

## What it does

- Reads the frozen DefiLlama snapshot (758 protocols, snapshot 2026-11-14) and covers all 40 watchlist protocols, plus every other rankable pre-token protocol below the $50M floor — 178 rows in all.
- Ranks them by implied token value using model `radar-2`, a comparables valuation: each category's multiple is the median market-cap / TVL of live-token protocols in that category (global median 0.17x over 144 comps when a category has fewer than 3 comps), shrunk toward the global median and clamped to 0.08x–0.50x, then adjusted for 7-day TVL growth, how long the protocol has run with no token, and chain breadth. No protocol name is special-cased.
- The dashboard is a static page with no network: a sortable, filterable board (search, category, chain, min TVL, min implied value), a detail view for every protocol showing the full working behind its implied value and its six-step farm plan, a live-token view set aside with real market caps, and a methodology table of the comparables.
- Every row says a protocol "records no token", never "has no token": the snapshot is DefiLlama's record, not proof. Implied value is the entry's own estimate, not a price, and not a prediction that any token launches.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ch0mnr4w&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
