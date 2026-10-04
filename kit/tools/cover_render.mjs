// Screenshot a reel's designed covers: every cover in videos/<name>/cover.js × every ratio → videos/<name>/out/cover/<cover>-<ratio>.png
//   node tools/cover_render.mjs <name>                    all covers, all ratios
//   node tools/cover_render.mjs <name> --only a,b         some covers
//   node tools/cover_render.mjs <name> --ratio wide       one ratio (wide 16:9 · land 4:3 · tall 3:4)
//   node tools/cover_render.mjs <name> --safe             also a copy with what the platforms cover or crop painted on (…-safe.png)
//   node tools/cover_render.mjs <name> --scale 2          twice the pixels (wide → 3840×2160, what YouTube asks for), saved as …@2x.png
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outDir, reelDir, reelRel } from './paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CFG = existsSync(join(ROOT, 'video.config.json')) ? JSON.parse(readFileSync(join(ROOT, 'video.config.json'), 'utf8')) : {};
const require = createRequire(import.meta.url);
function loadChromium() {
  for (const m of [process.env.PLAYWRIGHT_CORE, CFG.playwrightCore, 'playwright-core', 'playwright'].filter(Boolean)) { try { return require(m).chromium; } catch { /* next */ } }
  console.error('playwright-core not found (see render.mjs)'); process.exit(1);
}
const chromium = loadChromium();
function findShell() {
  if (process.env.CHROMIUM_PATH || CFG.chromiumPath) return process.env.CHROMIUM_PATH || CFG.chromiumPath;
  try { if (existsSync(chromium.executablePath())) return undefined; } catch { /* not installed */ }
  const cache = join(process.env.LOCALAPPDATA || join(process.env.HOME || '', '.cache'), 'ms-playwright');
  const dirs = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse() : [];
  for (const d of dirs) for (const sub of ['chrome-win', 'chrome-headless-shell-win64', 'chrome-linux', 'chrome-mac']) for (const exe of ['headless_shell.exe', 'chrome-headless-shell.exe', 'headless_shell', 'chrome-headless-shell']) { const p = join(cache, d, sub, exe); if (existsSync(p)) return p; }
  return undefined;
}

const args = process.argv.slice(2); const name = args.find((a) => !a.startsWith('--'));
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
if (!name) { console.error('usage: node tools/cover_render.mjs <reel> [--only a,b] [--ratio wide|land|tall] [--safe] [--scale 2]'); process.exit(1); }
const REL = reelRel(name); const reel = REL.split('/').pop();
if (!existsSync(join(reelDir(reel), 'cover.html'))) { console.error(`${REL}/cover.html not found`); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/${REL}/cover.html`;

const browser = await chromium.launch({ executablePath: findShell() });
const scale = +(opt('scale') || 1);
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('page error:', e.message));
const load = async (query) => { await page.goto(`${base}?${query}`); await page.waitForFunction(() => window.COVER && window.COVER.ready, null, { timeout: 30000 }); return page.evaluate(() => window.COVER); };
const first = await load('');
const ids = (opt('only') ? opt('only').split(',') : first.ids).filter((x) => first.ids.includes(x));
const ratios = opt('ratio') ? opt('ratio').split(',') : first.ratios; const safe = args.includes('--safe');
const out = outDir(reel, 'cover'); mkdirSync(out, { recursive: true });
for (const id of ids) for (const r of ratios) {
  for (const s of safe ? ['', 'safe'] : ['']) {
    const info = await load(`c=${id}&r=${r}${s ? '&safe=1' : ''}`);
    await page.setViewportSize({ width: info.W, height: info.H });
    const file = join(out, `${id}-${r}${s ? '-safe' : ''}${scale > 1 ? `@${scale}x` : ''}.png`);
    await (await page.$('#cover')).screenshot({ path: file }); console.log(file);
  }
}
await browser.close(); server.close();
