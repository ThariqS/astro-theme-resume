// Full-resolution stills of a lab diorama, plus a contact sheet.
//   node scripts/stills.mjs <slug> [t1 t2 ...]     (default: 6 evenly spaced times)
//   Q=nograde adds query params; SUB=raw writes to _stills/<slug>/raw instead.
// Needs the ledges-lab preview server on :5180 (serves lab/). Borrows playwright from ~/Projects/dioramas.
// Writes lab/dioramas/_stills/<slug>/t<time>.png and sheet.jpg.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(path.join(os.homedir(), 'Projects/dioramas/node_modules/playwright/index.mjs'));
const [slug, ...ts] = process.argv.slice(2);
if (!slug) { console.error('usage: node scripts/stills.mjs <slug> [t...]'); process.exit(1); }

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:5180/dioramas/${slug}/index.html?record${process.env.Q ? '&' + process.env.Q : ''}`);
await page.waitForFunction(() => window.DIORAMA, null, { timeout: 20000 });
const meta = await page.evaluate(async () => { await window.DIORAMA.ready; const { width, height, duration } = window.DIORAMA; return { width, height, duration }; });
await page.setViewportSize({ width: meta.width, height: meta.height });

const times = ts.length ? ts.map(Number) : Array.from({ length: 6 }, (_, i) => +(meta.duration * (i + 0.5) / 6).toFixed(2));
const dir = path.resolve(`lab/dioramas/_stills/${slug}`, process.env.SUB || '');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const files = [];
for (const t of times) {
  await page.evaluate((t) => window.DIORAMA.render(t), t);
  const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  fs.writeFileSync(f, await page.screenshot({ clip: { x: 0, y: 0, width: meta.width, height: meta.height } }));
  files.push(f);
}
await browser.close();
const real = errors.filter((e) => !e.includes('404'));            // favicon misses aren't interesting
if (real.length) console.log('page errors:\n' + real.slice(0, 10).join('\n'));
if (files.length > 1) {
  // montage writes the sheet but exits non-zero when it can't find a label font, so ignore its status
  try { execFileSync('montage', ['-label', '', ...files, '-tile', `${Math.min(3, files.length)}x`, '-geometry', '540x675+4+4', '-background', '#16171b', path.join(dir, 'sheet.jpg')], { stdio: 'ignore' }); } catch {}
}
console.log(files.join('\n') + (files.length > 1 ? `\n${path.join(dir, 'sheet.jpg')}` : ''));
