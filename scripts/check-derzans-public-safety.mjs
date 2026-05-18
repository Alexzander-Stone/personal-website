import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const publicDataDir = path.resolve(repoRoot, 'public', 'data', 'derzans-draft');
const distDir = path.resolve(repoRoot, 'dist');

const blockedJsonKeys = new Set([
  'actual_average_ev',
  'average_ev',
  'branch_seeds',
  'budget',
  'budget_results',
  'budget_summaries',
  'budget_sweep',
  'case_file',
  'config',
  'derzan_average_ev',
  'derzan_delta_vs_actual',
  'ev',
  'ev_by_seed',
  'example_branch',
  'example_team_comps',
  'likely_opponent_replies',
  'prior_actions',
  'seed',
  'seed_results',
  'seeds',
  'visits',
  'visits_by_seed',
]);

const blockedTextPatterns = [
  { label: 'local Windows path', pattern: /[A-Za-z]:\\[^\s"'`)]+/ },
  { label: 'private proof export path', pattern: /proof_exports[\\/]/i },
  { label: 'private proof input path', pattern: /input[\\/]proof-/i },
  { label: 'local draft backend URL', pattern: /localhost:8000/i },
  { label: 'raw seed results', pattern: /seed_results/i },
  { label: 'raw visit counts', pattern: /visits_by_seed/i },
  { label: 'raw expected value key', pattern: /average_ev/i },
];

const filesToScan = [
  path.resolve(publicDataDir, 'proof-viewer.json'),
  path.resolve(publicDataDir, 'public-proof-summary.json'),
  path.resolve(publicDataDir, 'public-proof-summary.md'),
];

async function listFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function walkJson(value, filePath, issues, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, filePath, issues, [...trail, String(index)]));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (blockedJsonKeys.has(key)) {
      issues.push(`${filePath}: blocked JSON key \`${nextTrail.join('.')}\``);
    }
    walkJson(child, filePath, issues, nextTrail);
  }
}

function scanText(filePath, issues) {
  const content = readFileSync(filePath, 'utf-8');
  for (const blocked of blockedTextPatterns) {
    if (blocked.pattern.test(content)) {
      issues.push(`${filePath}: matched ${blocked.label}`);
    }
  }
}

function scanJson(filePath, issues) {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  walkJson(parsed, filePath, issues);
}

const issues = [];

for (const filePath of filesToScan) {
  if (!existsSync(filePath)) {
    issues.push(`${filePath}: missing required public artifact`);
    continue;
  }
  if (filePath.endsWith('.json')) scanJson(filePath, issues);
  scanText(filePath, issues);
}

const builtFiles = [
  ...await listFiles(path.resolve(distDir, 'derzans-draft')),
  ...await listFiles(path.resolve(distDir, 'data', 'derzans-draft')),
  ...await listFiles(path.resolve(distDir, '_astro')),
].filter((filePath) => /\.(html|js|json|md|txt)$/i.test(filePath));

for (const filePath of builtFiles) {
  scanText(filePath, issues);
}

if (issues.length > 0) {
  console.error('Derzan public safety check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Derzan public safety check passed.');
