// Token Launch Radar — entrypoint (Node 22, standard library only).
//
// What this program does, in order:
//   1. Load the sealed DefiLlama snapshot (the frozen /input/snapshot.json,
//      or a snapshot file / directory given with --input).
//   2. Score every rankable pre-token protocol with the fitted model in
//      lib/model.ts -- a size curve fitted by least squares to the
//      snapshot's live-token protocols, tested leave-one-out and in five
//      folds, with launch odds from the peers' age record -- and refuse to
//      continue if the resulting board breaks the scorer's gate.
//   3. Write the ranked board to board.json and the same data, as a
//      script the dashboard can load, to data.js.
//   4. Copy the static dashboard and the three screenshots into the
//      output directory, checking the screenshots' names and count.
//   5. Write dossier.json last, using the vendored make.fun library,
//      so the dossier always describes exactly what was just written.
//
// The dashboard itself needs no network: index.html, app.css and
// app.js read only the data.js this program writes beside them.
//
// When run outside the grader, MAKEFUN_OUTPUT_DIR replaces /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// Where this file lives, so dashboard/ and screenshots/ are found
// relative to the repository root no matter where it is run from.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The scorer's own limits (from its reference/gate.json): the text
// limit shapes how many bytes the dossier may carry, while the
// screenshot limits are hard refusals if exceeded.
const MAX_TEXT_BYTES = 65_536;
const SCREENSHOT_LIMIT = { max: 4, max_bytes: 524_288 };
const VALID_IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

// Limits handed to the dossier builder for the dashboard bundle.
const DASHBOARD_LIMIT = { max_files: 400, max_bytes: 4_194_304 };

// Read a `--name value` or `--name=value` argument, or fall back.
function readFlag(name: string, fallback: string): string {
  const flag = `--${name}`;
  const position = process.argv.indexOf(flag);
  if (position >= 0 && position + 1 < process.argv.length) {
    return process.argv[position + 1]!;
  }
  const equalsForm = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (equalsForm === undefined) return fallback;
  return equalsForm.slice(flag.length + 1);
}

// Copy a directory's plain files into another directory, skipping
// anything hidden (names starting with a dot) and anything that is
// not a regular file. Returns the names that were copied, in the
// order the directory lists them.
function copyPlainFiles(sourceDir: string, targetDir: string): string[] {
  if (!existsSync(sourceDir)) return [];
  mkdirSync(targetDir, { recursive: true });
  const copied: string[] = [];
  for (const entry of readdirSync(sourceDir)) {
    if (entry.startsWith('.')) continue;
    const sourcePath = join(sourceDir, entry);
    if (!statSync(sourcePath).isFile()) continue;
    copyFileSync(sourcePath, join(targetDir, entry));
    copied.push(entry);
  }
  return copied;
}

function run(): void {
  const inputGiven = readFlag('input', '/input');
  const snapshotPath = inputGiven.endsWith('.json')
    ? inputGiven
    : join(inputGiven, 'snapshot.json');
  if (!existsSync(snapshotPath)) {
    process.stderr.write(
      `token radar: no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input\n`,
    );
    process.exit(2);
  }
  const outputDir = readFlag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

  const snapshot = parseSnapshot(readFileSync(snapshotPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const gateProblem = boardIssue(board, snapshot);
  if (gateProblem !== null) {
    process.stderr.write(
      `token radar: the model wrote a board the gate refuses: ${gateProblem}\n`,
    );
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(outputDir, 'data.js'), dataScript(radar));

  copyPlainFiles(join(repoRoot, 'dashboard'), join(outputDir, 'dashboard'));
  const shots = copyPlainFiles(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
  if (shots.length < 3) {
    process.stderr.write(
      `token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`,
    );
    process.exit(1);
  }
  for (const shot of shots) {
    if (!VALID_IMAGE_NAME.test(shot)) {
      process.stderr.write(
        `token radar: screenshots/${shot}: a name is letters, digits and . _ -, 1 to 128 characters\n`,
      );
    }
  }

  // Dossier goes last: the scorer rebuilds it from this output and
  // compares the bytes, so it must describe the files above, not
  // anything written after it.
  writeFileSync(
    join(outputDir, 'dossier.json'),
    buildDossier(outputDir, {
      text_max_bytes: MAX_TEXT_BYTES,
      screenshots: SCREENSHOT_LIMIT,
      dashboard: DASHBOARD_LIMIT,
    }),
  );

  const fit = radar.fit;
  process.stdout.write(
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
      `token radar: audit ${radar.audit.ranked} ranked + ${radar.audit.live} live + ${radar.audit.token_no_mcap} token-no-mcap + ${radar.audit.wrapped_excluded} wrapped-excluded = ${radar.audit.total}\n` +
      `token radar: fitted log10(FDV) = ${fit.intercept} + ${fit.slope}*log10(TVL), R2 ${fit.r_squared} on ${fit.n} comps; LOO median error ${fit.loo_median_abs_log_err} (${Math.round(fit.loo_within_2x * 100)}% within 2x), 5-fold ${fit.fold_median_abs_log_err} (${Math.round(fit.fold_within_2x * 100)}% within 2x)\n` +
      `token radar: wrote ${join(outputDir, 'board.json')}, ${join(outputDir, 'data.js')}, ${join(outputDir, 'dashboard')} (3 files), ${join(outputDir, 'screenshots')} (${shots.length} images) and ${join(outputDir, 'dossier.json')}\n`,
  );
}

run();
