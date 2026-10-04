"""Build the page + file list for publishing one reel's sound preview as a private claude.ai Artifact
(for watching on a phone away from home: no LAN, no open ports).

usage: python artifact_preview.py <reel-name>
writes <film>/out/artifact/page.html (page content, no doctype — the Artifact skeleton adds it), audio.mp3 and files.json
(the `files` map for the Artifact tool: published path -> source path under the project folder).

The scene module is published as it is (r/x/scene.js, so its ../../lib imports land on lib/ at the artifact root); the page adds its
own player because an artifact gets no query string (?play) and no out/ folder. Nothing but this reel's files is published."""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
reel = sys.argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import out_dir, reel_dir, reel_rel  # noqa: E402
REL = reel_rel(reel)
src = reel_dir(reel)
out = out_dir(reel, 'artifact')
os.makedirs(out, exist_ok=True)

# every module the scene imports (relative imports only), keeping the folder layout
files = {}
seen = set()


def walk(path, published):
    if path in seen:
        return
    seen.add(path)
    files[published] = os.path.relpath(path, ROOT).replace('\\', '/')
    code = '\n'.join(ln for ln in open(path, encoding='utf-8').read().split('\n') if not ln.lstrip().startswith('//'))   # an import in a comment is not an import
    for m in re.finditer(r"""(?:from|import)\s+['"](\.{1,2}/[^'"]+)['"]""", code):
        walk(os.path.realpath(os.path.join(os.path.dirname(path), m.group(1))), os.path.normpath(os.path.join(os.path.dirname(published), m.group(1))).replace('\\', '/'))


walk(os.path.join(src, 'scene.js'), 'r/x/scene.js')
assert not any(p.startswith('..') for p in files), files
if os.path.exists(os.path.join(src, 'vo-env.json')):
    files['vo-env.json'] = f'{REL}/vo-env.json'  # scene.js fetches it relative to the document
# pictures the scene loads next to itself (new URL('./img/x.jpg', import.meta.url)) travel with it
for sub in ('img', 'assets'):
    d = os.path.join(src, sub)
    for base, _, names in os.walk(d) if os.path.isdir(d) else []:
        for n in names:
            rel = os.path.relpath(os.path.join(base, n), src).replace('\\', '/')
            files[f'r/x/{rel}'] = f'{REL}/{rel}'

wav = out_dir(reel, reel + '.wav')
mp3 = os.path.join(out, 'audio.mp3')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-b:a', '128k', mp3], check=True)
files['audio.mp3'] = f'{REL}/out/artifact/audio.mp3'

index = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
title = re.search(r'<title>(.*?)</title>', index).group(1)
fonts = '\n'.join(re.findall(r'<link href="https://fonts\.googleapis\.com[^>]+>', index))
# every local stylesheet the page links, in order (lib/narration.css, then the reel's own style.css)
sheets = re.findall(r'<link rel="stylesheet" href="(\.[^"]+)">', index) or ['./style.css']
css = '\n'.join(open(os.path.normpath(os.path.join(src, h)), encoding='utf-8').read() for h in sheets)

page = f'''<title>{title}</title>
{fonts}
<style>
/* One fixed look (the film's own ink ground): the 9:16 frame is centred above a thin transport bar. */
:root {{ color-scheme: dark; --ink: #111112; --paper: #F2EEE8; --hot: #FF3D72; --mute: #9b968e; --bar: #1c1b1f;
  --ui: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }}
html, body {{ height: 100%; }}
{css}
body {{ background: var(--ink); color: var(--paper); font-family: var(--ui); }}
/* the 1080-wide frame lives inside a clipped, fixed box, so it can never widen the page (phones would zoom out to fit it) */
.pv-stage {{ position: fixed; inset: 0; overflow: hidden; }}
#viewport {{ transform-origin: 0 0; }}
.pv-start {{ position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(17, 17, 18, 0.55); border: 0; padding: 0 16px;
  color: var(--paper); font: 700 17px/1.3 var(--ui); cursor: pointer; }}
.pv-start span {{ display: inline-flex; align-items: center; gap: 12px; padding: 16px 26px 16px 22px; background: var(--hot); color: var(--ink); box-shadow: 6px 6px 0 var(--paper); }}
.pv-start svg {{ width: 22px; height: 22px; fill: var(--ink); }}
.pv-start:focus-visible span, .pv-bar button:focus-visible, .pv-bar input:focus-visible {{ outline: 3px solid var(--paper); outline-offset: 3px; }}
.pv-bar {{ position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; display: flex; align-items: center; gap: 12px; padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--bar); color: var(--paper); font: 600 13px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }}
.pv-bar button {{ flex: none; width: 40px; height: 40px; border: 0; background: var(--paper); color: var(--ink); display: grid; place-items: center; cursor: pointer; }}
.pv-bar button svg {{ width: 18px; height: 18px; fill: var(--ink); }}
.pv-bar input {{ flex: 1; min-width: 0; height: 40px; accent-color: var(--hot); }}
.pv-bar output {{ flex: none; min-width: 10ch; text-align: right; color: var(--mute); }}
.pv-note {{ position: fixed; left: 16px; right: 16px; top: calc(12px + env(safe-area-inset-top, 0px)); z-index: 55; text-align: center; font: 600 13px/1.4 var(--ui); color: var(--paper); }}
</style>
<div class="pv-stage" id="pv-stage"><div id="viewport"></div></div>
<button class="pv-start" id="pv-start" type="button"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5v17l14-8.5z"/></svg>点这里，带声音播放</span></button>
<div class="pv-note" id="pv-note" hidden></div>
<div class="pv-bar">
  <button id="pv-toggle" type="button" aria-label="播放 / 暂停"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="pv-icon" d="M6 3.5v17l14-8.5z"/></svg></button>
  <input id="pv-seek" type="range" min="0" max="1000" step="100" value="0" aria-label="时间">
  <output id="pv-time">0:00 / 0:00</output>
</div>
<script type="module" src="r/x/scene.js"></script>
<script type="module">
await window.sceneReady;
const D = window.DURATION, render = window.renderAt;
const $ = (id) => document.getElementById(id);
const vp = $('viewport'), start = $('pv-start'), seek = $('pv-seek'), time = $('pv-time'), icon = $('pv-icon'), note = $('pv-note'), bar = document.querySelector('.pv-bar'), stage = $('pv-stage');
const PLAY = 'M6 3.5v17l14-8.5z', PAUSE = 'M5 3.5h5v17H5zM14 3.5h5v17h-5z';
seek.max = String(D);
const mmss = (ms) => `${{Math.floor(ms / 60000)}}:${{String(Math.floor(ms / 1000) % 60).padStart(2, '0')}}`;
function fit() {{
  const box = stage.getBoundingClientRect(), W = box.width, H = box.height - bar.offsetHeight, FW = (window.STAGE && window.STAGE.w) || 1080, FH = (window.STAGE && window.STAGE.h) || 1920, s = Math.min(W / FW, H / FH);
  vp.style.transform = `translate(${{((W - FW * s) / 2).toFixed(1)}}px, ${{((H - FH * s) / 2).toFixed(1)}}px) scale(${{s.toFixed(5)}})`;
}}
addEventListener('resize', fit); fit();

const audio = new Audio('audio.mp3'); audio.preload = 'auto';
let sound = true, playing = false, clock = 0, last = performance.now(), shown = -1;
audio.addEventListener('error', () => {{ sound = false; note.textContent = '声音没加载出来，先无声播放'; note.hidden = false; }});
audio.addEventListener('ended', () => {{ playing = false; clock = D; paint(); }});
function paint() {{ icon.setAttribute('d', playing ? PAUSE : PLAY); }}
async function play() {{
  start.hidden = true;
  if (clock >= D - 50) {{ clock = 0; if (sound) audio.currentTime = 0; }}
  if (sound) {{ try {{ await audio.play(); }} catch {{ sound = false; note.textContent = '这里放不了声音，先无声播放'; note.hidden = false; }} }}
  playing = true; last = performance.now(); paint();
  try {{ await navigator.wakeLock?.request('screen'); }} catch {{}}
}}
function pause() {{ playing = false; if (sound) audio.pause(); paint(); }}
const toggle = () => (playing ? pause() : play());
start.addEventListener('click', play);
$('pv-toggle').addEventListener('click', toggle);
vp.addEventListener('click', toggle);
seek.addEventListener('input', () => {{ clock = Number(seek.value); if (sound) audio.currentTime = clock / 1000; last = performance.now(); }});
addEventListener('keydown', (e) => {{
  if (e.code === 'Space' && e.target === document.body) {{ e.preventDefault(); toggle(); }}
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {{ clock = Math.max(0, Math.min(D, clock + (e.code === 'ArrowLeft' ? -1000 : 1000))); if (sound) audio.currentTime = clock / 1000; }}
}});
function tick(now) {{
  if (playing) {{
    if (sound) clock = audio.currentTime * 1000;
    else {{ clock += now - last; if (clock >= D) {{ clock = D; playing = false; paint(); }} }}
  }}
  last = now;
  render(Math.min(clock, D - 1));
  const k = Math.floor(clock / 250);
  if (k !== shown) {{ shown = k; time.textContent = `${{mmss(clock)}} / ${{mmss(D)}}`; if (document.activeElement !== seek) seek.value = String(clock); }}
  requestAnimationFrame(tick);
}}
requestAnimationFrame(tick);
</script>
'''
open(os.path.join(out, 'page.html'), 'w', encoding='utf-8', newline='\n').write(page)
json.dump(files, open(os.path.join(out, 'files.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
site = os.path.join(out, 'site')  # local copy laid out as published, for one look before publishing
shutil.rmtree(site, ignore_errors=True)
for pub, rel in files.items():
    os.makedirs(os.path.dirname(os.path.join(site, pub)), exist_ok=True)
    shutil.copy(os.path.join(ROOT, rel), os.path.join(site, pub))
open(os.path.join(site, 'index.html'), 'w', encoding='utf-8', newline='\n').write(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + page + '</body></html>')
print(os.path.join(out, 'page.html'), round(os.path.getsize(os.path.join(out, 'page.html')) / 1024, 1), 'KB | audio', round(os.path.getsize(mp3) / 1e6, 2), 'MB')
print(json.dumps(files, ensure_ascii=False, indent=1))
