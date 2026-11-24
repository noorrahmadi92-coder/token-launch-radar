// Token Radar, model radar-6: one sealed snapshot in, one ranked board out.
//
// The board ranks every rankable pre-token protocol in the snapshot -- the
// whole watchlist (the floor) and every other rankable pre-token protocol,
// 198 rows -- and accounts for all 758 protocols in an audit the dashboard
// shows: ranked, live-token set aside, token recorded but no market cap, and
// wrapped or staked products excluded with the reason. A protocol is
// pre-token when its snapshot entry records no token (no market cap, no
// CoinGecko id, no symbol), and rankable when it is not a wrapped, staked or
// bridged product of a token that already trades -- the same exclusions the
// watchlist itself uses (Bridge / Canonical Bridge / Liquid Staking / Liquid
// Restaking / Restaked BTC / CEX categories, a version-marked name, a name
// carrying a whole word wrapped, staked or staking, or beginning with an
// exchange's name). Live-token protocols are kept apart and shown with the
// market's own market cap, never mixed into the ranked board.
//
// Implied value is a FITTED valuation, computed from the snapshot alone.
// Every value term is fitted to the snapshot's own live-token protocols, and
// the fit is tested out of sample before it prices anything:
//
//   1. Fitted size curve. Take the live-token protocols with a market cap
//      and a TVL above zero (128 of them). Fit, by ordinary least squares,
//        log10(market cap) = a + b * log10(TVL) + category offset,
//      where the category offset is the category's mean residual, shrunk
//      toward zero with a prior weight of 4 protocols, so a category with
//      one or two comps cannot set its own price. The fitted base value of
//      a protocol is 10 to that power. No multiple is hand-set and no
//      clamp is imposed: the curve is whatever the live market says.
//   2. Held-out tests. The fit is refit leaving each live protocol out in
//      turn (leave-one-out) and again in five folds, and the held-out
//      error is reported on the board: the median absolute log10 error and
//      the share of held-out predictions within a factor of two. The same
//      leave-one-out residuals give a conformal interval for every row:
//      the 10th and 90th percentiles of the residuals, applied as a
//      multiplier, so each implied value carries a range, and a rank range.
//   3. Launch odds from the peers' record. For each age band, the odds are
//      the share of protocols in that band that record a token -- the
//      peers' own launch record, not a guess. Older bands launch more
//      often. A protocol's expected value is its implied value times its
//      odds. The board ranks by implied value, the worth of a launch; the
//      odds and the expected value are shown beside it.
//   4. Growth and maturity. The fitted value is then adjusted for the
//      protocol's own seven-day TVL growth and for how long it has run
//      with no token, the two adjustments the bounty names, and for chain
//      breadth:
//        growth = 1 + clamp(change_7d, -60, 120) / 100 * 0.5
//        maturity = 0.70 + min(age_days, 1095) / 1095 * 0.30
//        breadth = 1 + 0.02 * min(chains - 1, 4)
//        implied = fitted value * growth * maturity * breadth
//      These three are economic adjustments, stated as such; they are not
//      fitted, because fitting them on the live comps makes the held-out
//      error worse (the growth and age coefficients come out negative),
//      which the validation would then have to hide.
//
// No protocol name is ever special-cased: the same function scores every
// row, and the dashboard recomputes each row from the same figures and
// shows the working, including its fitted value, its odds and its range.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  comp_prior_weight: number;
  chain_step: number;
  chain_max_extra: number;
  folds: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  comp_prior_weight: 4,
  chain_step: 0.02,
  chain_max_extra: 4,
  folds: 5,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-6';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One age band's launch odds, from the peers' own record. */
export interface OddsRow {
  min_days: number;
  max_days: number | null;
  n: number;
  live: number;
  odds: number;
}

/** The launch-odds table: one row per age band. */
export interface OddsTable {
  bands: OddsRow[];
  overall: number;
}

/** The fitted size curve and its validation. */
export interface FitResult {
  intercept: number;
  slope: number;
  r_squared: number;
  n: number;
  category_offsets: { category: string; n: number; offset: number }[];
  loo_median_abs_log_err: number;
  loo_within_2x: number;
  fold_median_abs_log_err: number;
  fold_within_2x: number;
  interval_low_factor: number;
  interval_high_factor: number;
}

/** The audit: every protocol in the snapshot, accounted for. */
export interface Audit {
  total: number;
  ranked: number;
  live: number;
  token_no_mcap: number;
  wrapped_excluded: number;
  watchlist_covered: number;
  watchlist_size: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  rank_low: number;
  rank_high: number;
  launch_odds: number;
  expected_value_usd: number;
  farm_cost_usd: number;
  farm_verdict: string;
  model: {
    fitted_value_usd: number;
    intercept: number;
    slope: number;
    category_offset: number;
    comp_n: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  rank_low: number;
  rank_high: number;
  launch_odds: number;
  expected_value_usd: number;
  farm_cost_usd: number;
  farm_verdict: string;
  fitted_value_usd: number;
  category_offset: number;
  comp_n: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the fit, the odds and the audit. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  fit: FitResult;
  odds: OddsTable;
  audit: Audit;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const LOG2 = Math.log10(2);
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list, else null. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** The p-th quantile of a list by linear interpolation, p in [0, 1]. */
function quantile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The live-token protocols the curve is fitted on: a market cap and a TVL, both above zero. */
export function fitComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/** Ordinary least squares for y = a + b*x, returned as [a, b]. */
function ols(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const b = den === 0 ? 0 : num / den;
  return [my - b * mx, b];
}

/** A category's shrunk mean residual: the mean, pulled toward zero by the prior weight. */
function shrunkOffset(residuals: number[], priorWeight: number): number {
  if (residuals.length === 0) return 0;
  const mean = residuals.reduce((s, v) => s + v, 0) / residuals.length;
  return (mean * residuals.length) / (residuals.length + priorWeight);
}

/** Fit the size curve on a set of live protocols: intercept, slope and category offsets. */
function fitCurve(
  comps: SnapshotProtocol[],
  model: ModelConstants,
): { intercept: number; slope: number; offsets: Map<string, number>; counts: Map<string, number> } {
  const xs = comps.map((p) => Math.log10(p.tvl_usd));
  const ys = comps.map((p) => Math.log10(p.mcap_usd!));
  const [intercept, slope] = ols(xs, ys);
  const byCat = new Map<string, number[]>();
  for (let i = 0; i < comps.length; i++) {
    const key = comps[i]!.category ?? 'Other';
    const list = byCat.get(key) ?? [];
    list.push(ys[i]! - (intercept + slope * xs[i]!));
    byCat.set(key, list);
  }
  const offsets = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const [key, residuals] of byCat) {
    offsets.set(key, shrunkOffset(residuals, model.comp_prior_weight));
    counts.set(key, residuals.length);
  }
  return { intercept, slope, offsets, counts };
}

/** The fitted log10 market cap of a protocol under a fitted curve. */
function fittedLogValue(
  protocol: SnapshotProtocol,
  curve: { intercept: number; slope: number; offsets: Map<string, number> },
): number {
  return curve.intercept + curve.slope * Math.log10(protocol.tvl_usd) + (curve.offsets.get(protocol.category ?? 'Other') ?? 0);
}

/** The fitted size curve, its category offsets and its held-out validation. */
export function fitSizeCurve(snapshot: Snapshot, model: ModelConstants = MODEL): FitResult {
  const comps = fitComps(snapshot);
  const curve = fitCurve(comps, model);
  const xs = comps.map((p) => Math.log10(p.tvl_usd));
  const ys = comps.map((p) => Math.log10(p.mcap_usd!));
  const fitted = comps.map((p) => fittedLogValue(p, curve));
  const residuals = ys.map((y, i) => y - fitted[i]!);
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const ssTot = ys.reduce((s, y) => s + (y - meanY) * (y - meanY), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Leave-one-out: refit without each protocol and predict it.
  const looErrors: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const rest = comps.filter((_, j) => j !== i);
    const refit = fitCurve(rest, model);
    looErrors.push(ys[i]! - fittedLogValue(comps[i]!, refit));
  }
  const looMedian = median(looErrors.map((e) => Math.abs(e))) ?? 0;
  const looWithin2x = looErrors.length === 0 ? 0 : looErrors.filter((e) => Math.abs(e) <= LOG2).length / looErrors.length;

  // Five folds, split by slug so the split is the same on every run.
  const ordered = [...comps].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const folds: SnapshotProtocol[][] = Array.from({ length: model.folds }, () => []);
  ordered.forEach((p, i) => folds[i % model.folds]!.push(p));
  const foldErrors: number[] = [];
  for (let k = 0; k < model.folds; k++) {
    const test = folds[k]!;
    const train = folds.flatMap((f, j) => (j === k ? [] : f));
    const refit = fitCurve(train, model);
    for (const p of test) foldErrors.push(Math.log10(p.mcap_usd!) - fittedLogValue(p, refit));
  }
  const foldMedian = median(foldErrors.map((e) => Math.abs(e))) ?? 0;
  const foldWithin2x = foldErrors.length === 0 ? 0 : foldErrors.filter((e) => Math.abs(e) <= LOG2).length / foldErrors.length;

  // The conformal interval from the leave-one-out residuals.
  const lowFactor = Math.pow(10, quantile(looErrors, 0.1));
  const highFactor = Math.pow(10, quantile(looErrors, 0.9));

  const offsets = [...curve.offsets.entries()]
    .map(([category, offset]) => ({ category, n: curve.counts.get(category) ?? 0, offset: round4(offset) }))
    .sort((a, b) => b.n - a.n || (a.category < b.category ? -1 : 1));
  return {
    intercept: round4(curve.intercept),
    slope: round4(curve.slope),
    r_squared: round4(rSquared),
    n: comps.length,
    category_offsets: offsets,
    loo_median_abs_log_err: round4(looMedian),
    loo_within_2x: round4(looWithin2x),
    fold_median_abs_log_err: round4(foldMedian),
    fold_within_2x: round4(foldWithin2x),
    interval_low_factor: round4(lowFactor),
    interval_high_factor: round4(highFactor),
  };
}

/** The age bands the launch odds are computed over, in days. */
const ODDS_BANDS: [number, number | null][] = [
  [0, 180],
  [180, 365],
  [365, 730],
  [730, 1095],
  [1095, null],
];

/** The launch-odds table: for each age band, the share of its protocols that record a token. */
export function launchOdds(snapshot: Snapshot, model: ModelConstants = MODEL): OddsTable {
  const bands: OddsRow[] = ODDS_BANDS.map(([min, max]) => {
    const inBand = snapshot.protocols.filter((p) => {
      const age = ageDays(snapshot.as_of, p.listed_at);
      if (age === null) return false;
      return age >= min && (max === null || age < max);
    });
    const live = inBand.filter((p) => p.mcap_usd !== null).length;
    return {
      min_days: min,
      max_days: max,
      n: inBand.length,
      live,
      odds: inBand.length === 0 ? 0 : round4(live / inBand.length),
    };
  });
  const known = snapshot.protocols.filter((p) => ageDays(snapshot.as_of, p.listed_at) !== null);
  const liveKnown = known.filter((p) => p.mcap_usd !== null).length;
  const overall = known.length === 0 ? 0 : round4(liveKnown / known.length);
  return { bands, overall };
}

/** A protocol's launch odds from its age, falling back to the band its unknown age is read as. */
export function oddsFor(protocol: SnapshotProtocol, snapshot: Snapshot, odds: OddsTable, model: ModelConstants = MODEL): number {
  const age = ageDays(snapshot.as_of, protocol.listed_at) ?? model.unknown_age_days;
  for (const band of odds.bands) {
    if (age >= band.min_days && (band.max_days === null || age < band.max_days)) return band.odds;
  }
  return odds.overall;
}

/** The audit: every protocol in the snapshot, accounted for. */
export function buildAudit(snapshot: Snapshot): Audit {
  const live = snapshot.protocols.filter((p) => p.mcap_usd !== null).length;
  const tokenNoMcap = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd === null).length;
  const pre = snapshot.protocols.filter((p) => isPreToken(p));
  const wrapped = pre.filter((p) => isWrappedOrStaked(p)).length;
  const ranked = pre.length - wrapped;
  const index = new Set(snapshot.protocols.map((p) => p.slug));
  const watchlistCovered = snapshot.watchlist.filter((s) => index.has(s) && isRankable(snapshot.protocols.find((p) => p.slug === s)!)).length;
  return {
    total: snapshot.protocols.length,
    ranked,
    live,
    token_no_mcap: tokenNoMcap,
    wrapped_excluded: wrapped,
    watchlist_covered: watchlistCovered,
    watchlist_size: snapshot.watchlist.length,
  };
}

/** The multipliers and the implied value one protocol gets under the fitted curve and the odds. */
export function impliedValue(
  protocol: SnapshotProtocol,
  snapshot: Snapshot,
  fit: FitResult,
  odds: OddsTable,
  model: ModelConstants,
): {
  fitted: number;
  implied: number;
  low: number;
  high: number;
  launchOdds: number;
  expected: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
  categoryOffset: number;
  compN: number;
} {
  const age = ageDays(snapshot.as_of, protocol.listed_at);
  const offsetEntry = fit.category_offsets.find((c) => c.category === (protocol.category ?? 'Other'));
  const categoryOffset = offsetEntry ? offsetEntry.offset : 0;
  const compN = offsetEntry ? offsetEntry.n : 0;
  const fittedLog = fit.intercept + fit.slope * Math.log10(protocol.tvl_usd) + categoryOffset;
  const fitted = Math.pow(10, fittedLog);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainMult = 1 + model.chain_step * Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_extra);
  const implied = Math.max(1, Math.round(fitted * growthMult * maturityMult * chainMult));
  const low = Math.max(1, Math.round(implied * fit.interval_low_factor));
  const high = Math.max(low, Math.round(implied * fit.interval_high_factor));
  const launchOdds = oddsFor(protocol, snapshot, odds, model);
  const expected = Math.max(1, Math.round(implied * launchOdds));
  return {
    fitted: Math.max(1, Math.round(fitted)),
    implied,
    low,
    high,
    launchOdds,
    expected,
    growthPct,
    growthMult,
    maturityMult,
    chainMult,
    age,
    categoryOffset,
    compN,
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is a wrapped, staked or bridged product of a token that already trades. */
export function isWrappedOrStaked(p: SnapshotProtocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return true;
  if (VERSIONED.test(p.name)) return true;
  if (/\b(wrapped|staked|staking)\b/i.test(p.name)) return true;
  if (EXCHANGE_PREFIX.test(p.name)) return true;
  return false;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped/staked product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isWrappedOrStaked(p);
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('risk curator') || c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares; pick the vault with the longest track record.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, borrow a small amount against it once, and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open through at least one fee cycle.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app, not just the bridge itself.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position, then close it in profit or at a small loss.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}, then settle or close it.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it for the full qualifying window.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it; record the mint transaction.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active for the full window.`;
  if (c.includes('payment')) return `Send two payments of $${capital / 2} each through ${name} on ${chain}, a week apart.`;
  if (c.includes('governance')) return `Deposit $${capital} into ${name} on ${chain} and vote in its next governance round from the same wallet.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC to ${name}'s chain and use one of its native apps from the same wallet.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    { text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline; never farm from an exchange account.`, cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
    { text: action, cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`, time: '15 minutes to set up' },
    { text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, from the same wallet.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes; never pay anyone to claim for you.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/** What one farm position costs in all: the capital plus the gas over the hold window. */
export function farmCost(p: SnapshotProtocol, age: number | null): number {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weeks = Math.ceil(hold / 7);
  const gas = 3 + (capital >= 150 ? 8 : 4) + 2 * weeks;
  return capital + gas;
}

/** One line verdict on the farm: what it costs, and whether the position is worth opening. */
export function farmVerdict(p: SnapshotProtocol, age: number | null, expected: number): string {
  const capital = capitalFor(p);
  const cost = farmCost(p, age);
  if (expected >= 10_000_000) return `Worth farming: about $${cost} to open a $${capital} position, for an expected value of $${Math.round(expected / 1_000_000)}M if a token launches.`;
  if (expected >= 1_000_000) return `A reasonable farm: about $${cost} to open a $${capital} position, for an expected value near $${Math.round(expected / 1_000_000)}M.`;
  return `A small farm: about $${cost} to open a $${capital} position; farm it only if you already use this chain, since the expected value is under $1M.`;
}

/** The protocols the board ranks, strongest first, with ranks 1..n and a rank range for each. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fit = fitSizeCurve(snapshot, model);
  const odds = launchOdds(snapshot, model);
  const ranked = snapshot.protocols.filter((p) => isRankable(p));
  const scored = ranked.map((p) => {
    const v = impliedValue(p, snapshot, fit, odds, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const implieds = scored.map((s) => s.implied);
  return scored.map((s, i) => {
    const rank = i + 1;
    // The rank range: the best rank this row could hold at its interval high,
    // and the worst at its interval low, counting rows that would still beat it.
    const rankLow = implieds.filter((v) => v > s.high).length + 1;
    const rankHigh = implieds.filter((v) => v > s.low).length + 1;
    const cost = farmCost(s.p, s.age);
    return {
      rank,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      implied_low_usd: s.low,
      implied_high_usd: s.high,
      rank_low: rankLow,
      rank_high: rankHigh,
      launch_odds: s.launchOdds,
      expected_value_usd: s.expected,
      farm_cost_usd: cost,
      farm_verdict: farmVerdict(s.p, s.age, s.expected),
      model: {
        fitted_value_usd: s.fitted,
        intercept: fit.intercept,
        slope: fit.slope,
        category_offset: round4(s.categoryOffset),
        comp_n: s.compN,
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        chain_multiplier: round4(s.chainMult),
        age_days: s.age,
      },
      farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, chains: p.chains, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, change_7d: p.change_7d }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank, slug: row.slug, name: row.name, category: row.category, chains: row.chains,
    tvl_usd: row.tvl_usd, change_7d: row.change_7d, mcap_usd: row.mcap_usd, listed_at: row.listed_at,
    age_days: row.age_days, implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd, implied_high_usd: row.implied_high_usd,
    rank_low: row.rank_low, rank_high: row.rank_high,
    launch_odds: row.launch_odds, expected_value_usd: row.expected_value_usd,
    farm_cost_usd: row.farm_cost_usd, farm_verdict: row.farm_verdict,
    fitted_value_usd: row.model.fitted_value_usd,
    category_offset: row.model.category_offset, comp_n: row.model.comp_n,
    growth_multiplier: row.model.growth_multiplier, maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const fit = fitSizeCurve(snapshot, model);
  const odds = launchOdds(snapshot, model);
  const audit = buildAudit(snapshot);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of, source: snapshot.source, floor_usd: snapshot.floor_usd, model,
    model_version: MODEL_VERSION, watchlist_size: snapshot.watchlist.length, board_size: board.length,
    early_size: early, live_size: live.length, fit, odds, audit, rows: board.map(radarRow), live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new SnapshotError('snapshot.json is not JSON'); }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    return {
      slug: p.slug, name: p.name, category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return { as_of: o.as_of, source: o.source, floor_usd: o.floor_usd, protocols, watchlist: o.watchlist as string[] };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_low_usd > r.implied_value_usd || r.implied_high_usd < r.implied_value_usd) return `${r.slug} has an interval that does not contain its implied value`;
    if (r.rank_low > r.rank || r.rank_high < r.rank) return `${r.slug} has a rank range that does not contain its rank`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
