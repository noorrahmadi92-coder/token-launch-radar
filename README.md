# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/noorrahmadi92-coder/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/noorrahmadi92-coder/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — 198 pre-token protocols ranked by fitted implied token value, with launch odds from the peers' record and a costed farm plan for each. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

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

- Reads the frozen DefiLlama snapshot (758 protocols, snapshot 2026-11-14) and ranks every rankable pre-token protocol — the whole 40-protocol watchlist plus every other rankable pre-token protocol, 198 rows in all — and accounts for all 758 protocols in an audit (198 ranked, 144 live-token set aside, 272 token recorded but no market cap, 144 wrapped/staked excluded).
- Ranks them by implied token value from model `radar-6`, a fitted valuation: log10(FDV) is fitted by least squares to the snapshot's 128 live-token protocols (log10(market cap) on log10(TVL), with a shrunk category offset), then adjusted for 7-day TVL growth, how long the protocol has run with no token, and chain breadth. No protocol name is special-cased, and no multiple is hand-set.
- Tests the fit before it prices anything: leave-one-out and five-fold held-out error, reported on the board, and an 80% conformal interval and a rank range for every row.
- Estimates each protocol's launch odds from the peers' own age record (the share of protocols in its age band that record a token) and shows the expected value beside the implied value.
- The dashboard is a static page with no network: a sortable, filterable board (search, category, chain, min TVL, min implied value), a detail view for every protocol showing the full working behind its implied value, its odds, its interval and its six-step costed farm plan with a verdict, a live-token view set aside with real market caps, and a methodology panel with the fitted coefficients, the validation and the odds table.
- Every row says a protocol "records no token", never "has no token": the snapshot is DefiLlama's record, not proof. Implied value is the entry's own estimate, not a price, and not a prediction that any token launches.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ch0mnr4w&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
