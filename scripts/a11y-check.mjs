import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const distDir = path.resolve('dist');
const host = '127.0.0.1';
const port = 4173;
const baseUrl = `http://${host}:${port}`;

const pathsToCheck = [
  '/',
  '/projects',
  '/projects/draft-ai',
  '/derzans-draft',
  '/derzans-draft/proof',
  '/bear',
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(distDir)) {
  console.error('Missing dist/ directory. Run `npm run build` before accessibility checks.');
  process.exit(1);
}

const resolveStaticPath = (pathname) => {
  let safePath = decodeURIComponent(pathname).replace(/^\/+/, '');

  if (safePath === '') {
    safePath = 'index.html';
  } else if (!path.extname(safePath)) {
    safePath = path.join(safePath, 'index.html');
  }

  const resolved = path.resolve(distDir, safePath);
  if (!resolved.startsWith(distDir)) {
    return null;
  }

  return resolved;
};

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? '/', baseUrl);
    const filePath = resolveStaticPath(reqUrl.pathname);

    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }

    await stat(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

const startServer =
  () =>
    new Promise((resolve) => {
      server.listen(port, host, () => resolve());
    });

const stopServer =
  () =>
    new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

const formatAxeViolation = (violation) => {
  const sampleNodes = violation.nodes.slice(0, 2).map((node) => node.target.join(' '));
  return `${violation.id}: ${violation.help} (${sampleNodes.join(' | ')})`;
};

const failures = [];

await startServer();

let browser;

try {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext();

  for (const pagePath of pathsToCheck) {
    const page = await context.newPage();
    const url = `${baseUrl}${pagePath}`;

    await page.goto(url, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .options({
        rules: {
          'color-contrast': { enabled: true },
          'landmark-one-main': { enabled: true },
          'landmark-no-duplicate-main': { enabled: true },
          region: { enabled: true },
        },
      })
      .analyze();

    if (results.violations.length > 0) {
      failures.push({
        page: pagePath,
        type: 'axe',
        details: results.violations.map(formatAxeViolation),
      });
    }

    const focusableCount = await page
      .locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      .count();

    if (focusableCount === 0) {
      failures.push({
        page: pagePath,
        type: 'keyboard',
        details: ['No focusable elements found for keyboard navigation check.'],
      });
    } else {
      await page.evaluate(() => {
        document.body.setAttribute('tabindex', '-1');
        document.body.focus();
      });
      await page.keyboard.press('Tab');

      const focusCheck = await page.evaluate(() => {
        const active = document.activeElement;

        if (!active || active === document.body || active === document.documentElement) {
          return {
            ok: false,
            reason: 'Tab did not move focus onto an interactive element.',
          };
        }

        const styles = window.getComputedStyle(active);
        const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
        const hasShadow = styles.boxShadow && styles.boxShadow !== 'none';

        if (!hasOutline && !hasShadow) {
          return {
            ok: false,
            reason: `Focused element has no visible focus indicator (${active.tagName.toLowerCase()}).`,
          };
        }

        return { ok: true };
      });

      if (!focusCheck.ok) {
        failures.push({
          page: pagePath,
          type: 'keyboard',
          details: [focusCheck.reason],
        });
      }
    }

    await page.close();
  }

  await context.close();
} finally {
  if (browser) {
    await browser.close();
  }

  await stopServer();
}

if (failures.length > 0) {
  console.error('Accessibility checks failed:\n');

  for (const failure of failures) {
    console.error(`- [${failure.type}] ${failure.page}`);
    for (const detail of failure.details) {
      console.error(`  - ${detail}`);
    }
  }

  process.exit(1);
}

console.log('Accessibility checks passed.');
