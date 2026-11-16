// makefun-frontend-01 entry: hands the frontend in for grading.
//
// The app itself is the static files under app/ (index.html + ES modules +
// one stylesheet, no build step). It reads only make.fun's public API.
// This program runs in the grader's sandbox (Node 22, standard library
// only, no network, read-only repo, writable /output, 120 s) and does
// three things: copy app/ to /output/app, copy screenshots/ to
// /output/screenshots, and write /output/dossier.json with buildDossier
// from the vendored library — the summary the judge reads. It runs twice
// and both runs must write the same bytes, so there is no timestamp, no
// randomness and no ordering that depends on the filesystem here.
//
// vendor/makefun-frontend.ts is the kit's copy, unchanged: the scorer
// rebuilds dossier.json with its own copy and compares byte for byte.
//
// Local run (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function checkEntry() {
  const index = join(ROOT, 'app', 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) fail('app/index.html is missing');
  const shots = join(ROOT, 'screenshots');
  if (!existsSync(shots)) fail('screenshots/ is missing');
  const names = readdirSync(shots).filter((n) => !n.startsWith('.'));
  if (names.length !== 3) fail(`screenshots/ must hold exactly 3 images, found ${names.length}`);
  for (const name of names) {
    const bytes = statSync(join(shots, name)).size;
    if (bytes > 262144) fail(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

checkEntry();
mkdirSync(join(OUT, 'app'), { recursive: true });
cpSync(join(ROOT, 'app'), join(OUT, 'app'), { recursive: true });
mkdirSync(join(OUT, 'screenshots'), { recursive: true });
cpSync(join(ROOT, 'screenshots'), join(OUT, 'screenshots'), { recursive: true });

writeFileSync(
  join(OUT, 'dossier.json'),
  buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
