"""Render one 3D ink-wash scene of a film with Blender (command line only) and get it ready for the page.

usage: python tools/shot3d.py <film> <scene> still  [key=value …]   → videos/<film>/out/shots/<scene>.png  (the frame as the camera stands)
       python tools/shot3d.py <film> <scene> layers [key=value …]   → videos/<film>/out/shots/<scene>/*.png + layers.json (raw)
                                                                     → videos/<film>/img/<scene>/*.webp + layers.js (trimmed, for lib/plates.js)
                                                                     → videos/<film>/out/shots/<scene>-check.png (the layers stacked back up)
The scene is videos/<film>/blender/<scene>.py (it starts with `from inkkit import *`, see lib3d/inkkit.py for the keys:
px=1 samples=48 fog=1 post=1 kuw=3.2 edge=0.85 wide=1). A scene that ends in fly() is rendered frame by frame:
       python tools/shot3d.py <film> <scene> fly [from= to= step= px= shutter= jpg=]  → videos/<film>/out/shots/<scene>/f0001.jpg …
Blender is found from the environment variable BLENDER, video.config.json ("blender"), or the PATH. How to use all this: the skill's references/3d.md."""
import json
import os
import shutil
import subprocess
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import ROOT, out_dir, reel_dir  # noqa: E402

film, shot, mode = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else 'still')
keys = [a for a in sys.argv[4:] if '=' in a]
cfg_path = os.path.join(ROOT, 'video.config.json')
cfg = json.load(open(cfg_path, encoding='utf-8')) if os.path.exists(cfg_path) else {}
BLENDER = next((b for b in (os.environ.get('BLENDER'), cfg.get('blender'), 'blender') if b and (os.path.isfile(b) or shutil.which(b))), None)
if not BLENDER:
    sys.exit('Blender not found: put the full path of its executable in video.config.json ("blender") or in the environment variable BLENDER, or put it on the PATH')
script = os.path.join(reel_dir(film), 'blender', f'{shot}.py')
if not os.path.exists(script):
    sys.exit(f'no scene script: {script}')
PAPER = (242, 238, 232)


def blender(out, *more):
    t0 = time.time()
    r = subprocess.run([BLENDER, '-b', '--factory-startup', '-P', script, '--', out, *more, *keys], capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = [ln for ln in (r.stdout + r.stderr).splitlines() if ln.startswith(('SLAB', 'LAYERS', 'RENDERED', 'FLIGHT', 'PATH', 'Traceback', 'Error', 'EDGE', 'eevee', 'setin')) or 'Error' in ln or ln.startswith('  File')]
    print('\n'.join(tail[-30:]))
    if r.returncode != 0 or 'Traceback' in r.stdout + r.stderr:
        print((r.stdout + r.stderr)[-3000:]); sys.exit(1)
    print(f'blender: {time.time() - t0:.1f} s')


if mode == 'still':
    wide = '-wide' if 'wide=1' in keys else ''      # the still with its overscan is kept next to the plain one
    out = out_dir(film, 'shots', f'{shot}{wide}.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
    blender(out, 'mode=still')
    print(out)
    sys.exit(0)
if mode == 'fly':       # a scene that ends in fly(): frames <out>/shots/<scene>/f0001.jpg … (keys: from= to= step= px= shutter=)
    raw = out_dir(film, 'shots', shot); os.makedirs(raw, exist_ok=True)
    blender(os.path.join(raw, 'f'), 'mode=fly')
    print(raw)
    sys.exit(0)

raw = out_dir(film, 'shots', shot); os.makedirs(raw, exist_ok=True)
if not any(k.startswith('px=') for k in keys):
    keys.append('px=1.5')                  # layers are drawn finer than the frame: the page zooms into them
blender(raw + os.sep, 'mode=layers')
meta = json.load(open(os.path.join(raw, 'layers.json'), encoding='utf-8'))
W, H, px = meta['width'], meta['height'], meta['px']; ox, oy = meta['over']
x0, y0 = -W * (ox - 1) / 2, -H * (oy - 1) / 2              # where the drawn picture's top-left corner sits in frame pixels
dst = os.path.join(reel_dir(film), 'img', shot); os.makedirs(dst, exist_ok=True)
for old in os.listdir(dst):
    if old.endswith(('.webp', '.js')):
        os.remove(os.path.join(dst, old))
check = Image.new('RGBA', (int(W * ox * px), int(H * oy * px)), PAPER + (255,))
layers = []; total = 0
for L in sorted(meta['layers'], key=lambda l: -l['depth']):   # back to front
    im = Image.open(os.path.join(raw, L['file'])).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 2 else 0).getbbox()
    if not box:
        print('empty layer, left out:', L['id']); continue
    pad = 2; box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    cut = im.crop(box); name = L['file'].replace('.png', '.webp')
    cut.save(os.path.join(dst, name), 'WEBP', quality=90 if L['kind'] == 'actor' else 84, alpha_quality=92, method=5)
    total += os.path.getsize(os.path.join(dst, name))
    check.alpha_composite(im)
    entry = {**L, 'file': name, 'box': [round(x0 + box[0] / px, 1), round(y0 + box[1] / px, 1), round((box[2] - box[0]) / px, 1), round((box[3] - box[1]) / px, 1)]}
    layers.append(entry)
    print(f"{L['id']:>14}  depth {L['depth']:>6}  box {entry['box']}  {os.path.getsize(os.path.join(dst, name)) // 1024} KB")
out = {'width': W, 'height': H, 'focal': meta['focal'], 'over': meta['over'], 'layers': layers, 'anchors': meta.get('anchors', {})}
open(os.path.join(dst, 'layers.js'), 'w', encoding='utf-8', newline='\n').write(
    f'// written by tools/shot3d.py from blender/{shot}.py — layers back to front; box = [x, y, w, h] in frame pixels\nexport default ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
# the check picture: the frame itself (what the camera sees at rest), cut out of the stacked layers
fx, fy = int(-x0 * px), int(-y0 * px)
check.convert('RGB').save(out_dir(film, 'shots', f'{shot}-check-wide.png'))
check.crop((fx, fy, fx + int(W * px), fy + int(H * px))).convert('RGB').save(out_dir(film, 'shots', f'{shot}-check.png'))
print(f'{len(layers)} layers, {total / 1e6:.2f} MB → {dst}')
print(out_dir(film, 'shots', f'{shot}-check.png'))
# how far the stacked layers are from the picture rendered in one go (the still): they should be the same picture.
# (A still may hold things the layers leave to the page — a sun, marker dots — and every actor pose at once shows in the stack.)
still = out_dir(film, 'shots', f'{shot}.png')
if os.path.exists(still):
    import numpy as np
    a = Image.open(still).convert('RGB'); b = Image.open(out_dir(film, 'shots', f'{shot}-check.png')).convert('RGB').resize(a.size, Image.LANCZOS)
    d = np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16)).max(axis=2)
    print(f'stacked layers vs the still: mean difference {d.mean():.2f} (0–255), {(d > 24).mean() * 100:.1f}% of pixels off by more than 24' + ('  ← look at both' if d.mean() > 4 else ''))
