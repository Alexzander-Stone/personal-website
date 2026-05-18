import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, '..');
const defaultDerzanRepo = resolve(siteRoot, '..', 'league-of-legends-optimal-team-comp');
const derzanRepo = resolve(process.env.DERZANS_DRAFT_REPO ?? defaultDerzanRepo);
const outputDir = resolve(siteRoot, 'public', 'data', 'derzans-draft');

const sanitizer = resolve(derzanRepo, 'proof', 'sanitize_public.py');
if (!existsSync(sanitizer)) {
  console.error(`Could not find Derzan sanitizer at ${sanitizer}`);
  console.error('Set DERZANS_DRAFT_REPO to the local Derzan repo path and retry.');
  process.exit(1);
}

const completed = spawnSync(
  'python',
  ['-m', 'proof.sanitize_public', '--output-dir', outputDir],
  {
    cwd: derzanRepo,
    encoding: 'utf-8',
    stdio: 'pipe',
  },
);

if (completed.stdout) process.stdout.write(completed.stdout);
if (completed.stderr) process.stderr.write(completed.stderr);

if (completed.status !== 0) {
  process.exit(completed.status ?? 1);
}

console.log(`Updated Derzan public proof artifacts in ${outputDir}`);
