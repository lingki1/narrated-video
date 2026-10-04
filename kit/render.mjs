// Render a scene to MP4 (H.264) or to still frames. Every frame is window.renderAt(ms) of the scene page, captured one by one.
//   node render.mjs videos/<name>                      → videos/<name>/out/<name>.mp4
//   node render.mjs videos/<name> --stills 3000,12000  → PNG stills in videos/<name>/out/stills/
//   node render.mjs videos/<name> --sound-only         → videos/<name>/out/<name>.wav + <name>.timeline.json (for the ?play preview)
//   options: --fps 30  --from 0 --to <ms>  --out name.mp4  --query k=v  --suffix x  --blur 4 [--shutter 0.5]  --workers 4
// Needs: Node 18+, playwright-core (or playwright) with a Chromium build, ffmpeg, Python with numpy/scipy/soundfile.
// Where they are: environment variables PLAYWRIGHT_CORE / FFMPEG / PYTHON / CHROMIUM_PATH, or video.config.json next to this file.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = dirname(fileURLToPath(import.meta.url));
const CFG = existsSync(join(ROOT, 'video.config.json')) ? JSON.parse(readFileSync(join(ROOT, 'video.config.json'), 'utf8')) : {};
function loadChromium() {
  for (const m of [process.env.PLAYWRIGHT_CORE, CFG.playwrightCore, 'playwright-core', 'playwright']) {
    if (!m) continue;
    try { return require(m).chromium; } catch { /* try the next one */ }
  }
  console.error('playwright-core not found. Run `npm i playwright-core && npx playwright-core install chromium-headless-shell` in this folder,\nor point "playwrightCore" in video.config.json at an existing install.');
  process.exit(1);
}
const chromium = loadChromium();
const FFMPEG = process.env.FFMPEG || CFG.ffmpeg || 'ffmpeg';
const PYTHON = process.env.PYTHON || CFG.python || 'python';

const args = process.argv.slice(2);
const scene = args[0];
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
if (!scene) { console.error('usage: node render.mjs videos/<name> [--stills ms,ms] [--sound-only] [--fps 30]'); process.exit(1); }
if (!existsSync(join(ROOT, scene, 'index.html'))) { console.error(`${scene}/index.html not found (films live in videos/<name>, template samples in samples/<name>)`); process.exit(1); }
const OUT = join(ROOT, scene, 'out');   // everything a film produces stays in its own folder

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const extraQuery = opt('query') ? `&${opt('query')}` : '';
const url = `http://127.0.0.1:${server.address().port}/${scene.replace(/\\/g, '/')}/index.html?render${extraQuery}`;

// The Playwright browser cache gets upgraded by other tools; if the build this playwright-core expects is gone,
// fall back to the newest headless shell in the cache (or CHROMIUM_PATH).
function findShell() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try { if (existsSync(chromium.executablePath())) return undefined; } catch { /* not installed */ }
  const cache = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse() : [];
  for (const d of dirs) {
    const exe = join(cache, d, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}
// Frame capture goes straight through CDP with optimizeForSpeed: still lossless PNG (pixel-identical to
// page.screenshot, checked 2026-09-29) but ~3× faster — the PNG encoder, not painting, was the bottleneck.
// GPU flags (--use-angle=d3d11, on a desktop GPU) were measured too and made no difference.
let VIEWPORT = { width: 1080, height: 1920 };   // until the film says otherwise (window.STAGE)
async function openScene() {
  const browser = await chromium.launch({ executablePath: findShell() });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.error(`page ${m.type()}:`, m.text()); });
  await page.goto(url);
  await page.evaluate(() => window.sceneReady);
  const st = await page.evaluate(() => window.STAGE || null);
  if (st && (st.w !== VIEWPORT.width || st.h !== VIEWPORT.height)) { VIEWPORT = { width: st.w, height: st.h }; await page.setViewportSize(VIEWPORT); }
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t) => {
    await page.evaluate((ms) => window.renderAt(ms), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { browser, page, shot };
}
const { browser, page, shot } = await openScene();
const duration = await page.evaluate(() => window.DURATION);

const name = scene.split('/').filter(Boolean).pop() + (opt('suffix') ? `-${opt('suffix')}` : '');
mkdirSync(OUT, { recursive: true });

// Before the soundtrack is built, play the whole film once without screenshots: things that move log their own sounds as they
// are drawn (lib/film.js sfx()), and only a pass over every moment collects them all into TIMELINE.stamps.
async function collectSounds() {
  const n = await page.evaluate((step) => { const before = window.TIMELINE.stamps.length; for (let t = 0; t <= window.DURATION; t += step) window.renderAt(t); return window.TIMELINE.stamps.length - before; }, 40);
  console.log(`sounds logged by the picture: ${n}`);
}
const stills = opt('stills');
if (args.includes('--times')) {
  // when each line starts (seconds), to pick stills from
  const vo = (await page.evaluate(() => window.TIMELINE)).vo;
  console.log(vo.map((v) => `${v.id} ${(v.at / 1000).toFixed(1)}`).join('  '));
} else if (args.includes('--sweep')) {
  // Step through the whole timeline without screenshots (every --step ms, default 100): page errors are printed as they
  // happen; at the end, whatever the scene logged in window.__reach (time → how far a hand is from its shoulder) is listed.
  const step = Number(opt('step', 100)); const from = Number(opt('from', 0)); const to = Number(opt('to', duration));
  let errs = 0; page.on('pageerror', () => errs++);
  for (let t = from; t <= to; t += step) await page.evaluate((ms) => window.renderAt(ms), t);
  const reach = await page.evaluate(() => window.__reach || {});
  const keys = Object.keys(reach).map(Number).sort((a, b) => a - b);
  const vo = (await page.evaluate(() => window.TIMELINE)).vo; const lineAt = (t) => { let id = '—'; for (const v of vo) if (t >= v.at - 1200) id = v.id; return id; };
  console.log(`swept ${from}–${to} ms every ${step} ms · page errors: ${errs} · stretched arms: ${keys.length || 'none'}`);
  const runs = []; for (const k of keys) { const r = runs[runs.length - 1]; if (r && k - r.b <= 500) { r.b = k; r.max = Math.max(r.max, reach[k]); } else runs.push({ a: k, b: k, max: reach[k] }); }
  for (const r of runs) console.log(`  ${lineAt(r.a)}  ${(r.a / 1000).toFixed(1)}–${(r.b / 1000 + 0.5).toFixed(1)}s  max ${r.max}`);
} else if (stills) {
  mkdirSync(join(OUT, 'stills'), { recursive: true });
  const { writeFileSync } = await import('node:fs');
  for (const t of stills.split(',').map(Number)) {
    const file = join(OUT, 'stills', `${name}-${String(t).padStart(5, '0')}.png`);
    writeFileSync(file, await shot(t));
    console.log(file);
  }
} else if (args.includes('--sound-only')) {
  // Just the soundtrack: <film>/out/<name>.wav, which the ?play preview picks up (lib/motion.js autoplay). No video.
  const { writeFileSync } = await import('node:fs');
  const timelineFile = join(OUT, `${name}.timeline.json`);
  await collectSounds();
  writeFileSync(timelineFile, JSON.stringify(await page.evaluate(() => window.TIMELINE)));
  await new Promise((res, rej) => {
    const p = spawn(PYTHON, [join(ROOT, scene, 'sound.py'), timelineFile, join(OUT, `${name}.wav`)], { stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`sound.py exited ${code}`))));
  });
} else {
  const fps = Number(opt('fps', 30));
  const from = Number(opt('from', 0));
  const to = Number(opt('to', duration));
  const out = resolve(OUT, opt('out', `${name}.mp4`));
  const soundScript = join(ROOT, scene, 'sound.py');
  const hasSound = existsSync(soundScript) && !args.includes('--mute');
  // With a soundtrack the frames go to <name>.video.mp4 first; --audio-only reuses that file.
  const videoOut = hasSound ? out.replace(/\.mp4$/, '.video.mp4') : out;
  const run = (cmd, argv) => new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });

  if (!args.includes('--audio-only')) {
    // --blur N: motion blur. Each output frame averages N sub-frames spread over `--shutter` (fraction of a frame,
    // default 0.5 = a film camera's 180° shutter), centred on the frame time. ffmpeg tmix averages, select keeps every Nth.
    const sub = Math.max(1, Number(opt('blur', 1)));
    const shutter = Number(opt('shutter', 0.5));
    const vf = sub > 1
      ? ['-vf', `tmix=frames=${sub}:weights='${Array(sub).fill(1).join(' ')}',select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB)`, '-r', String(fps)]
      : [];
    const frames = Math.round((to - from) / 1000 * fps);
    const dt = 1000 / fps;
    const started = Date.now();
    // --workers N (default 4): N browsers each render a contiguous slice into its own part file, then the parts are
    // joined losslessly (concat, -c copy). Scenes are a pure function of t, so slices are independent; tmix/select
    // only ever mixes a frame's own sub-frames, so the seams are exact. 4 workers ≈ 3.8× on this machine.
    const workers = Math.max(1, Math.min(Number(opt('workers', 4)), frames));
    const scenes = [{ shot }, ...await Promise.all(Array.from({ length: workers - 1 }, openScene))];
    const partOf = (k) => (workers > 1 ? videoOut.replace(/\.mp4$/, `.part${k}.mp4`) : videoOut);
    let done = 0;
    const renderSlice = async ({ shot: shotK }, k) => {
      const a = Math.floor(frames * k / workers); const b = Math.floor(frames * (k + 1) / workers);
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-i', '-', ...vf,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', partOf(k)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg (part ${k}) exited ${code}`)))));
      for (let i = a; i < b; i++) {
        for (let j = 0; j < sub; j++) {
          const offset = sub > 1 ? ((j + 0.5) / sub - 0.5) * shutter * dt : 0;
          const png = await shotK(Math.max(0, from + i * dt + offset));
          if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
        }
        if (done++ % 60 === 0) console.log(`frame ${done - 1}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
      }
      ff.stdin.end();
      await closed;
    };
    await Promise.all(scenes.map(renderSlice));
    await Promise.all(scenes.slice(1).map((s) => s.browser.close()));
    if (workers > 1) {
      const { writeFileSync, unlinkSync } = await import('node:fs');
      const list = videoOut.replace(/\.mp4$/, '.parts.txt');
      writeFileSync(list, scenes.map((_, k) => `file '${partOf(k).replace(/\\/g, '/')}'`).join('\n'));
      await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', videoOut]);
      for (let k = 0; k < workers; k++) unlinkSync(partOf(k));
      unlinkSync(list);
    }
    console.log(`video done: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s (${workers} workers)`);
  }

  if (hasSound) {
    const { writeFileSync } = await import('node:fs');
    const timelineFile = out.replace(/\.mp4$/, '.timeline.json');
    const wav = out.replace(/\.mp4$/, '.wav');
    await collectSounds();
    writeFileSync(timelineFile, JSON.stringify(await page.evaluate(() => window.TIMELINE)));
    await run(PYTHON, [soundScript, timelineFile, wav]);
    // Instagram / TikTok normalise to about -14 LUFS; hitting it ourselves keeps the mix as designed.
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', videoOut, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  }
  console.log(out);
}
await browser.close();
server.close();
