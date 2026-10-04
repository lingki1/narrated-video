"""Are two moments of a film the same picture? (A seam: where a rendered sequence hands over to layers, where one shot replaces another.)

usage: python tools/frame_diff.py <film> <ms A> <ms B> [name=seam] [box=x,y,w,h]
  → prints how far apart they are (mean difference 0–255, share of pixels off by more than 24), over the whole frame or the box
  → videos/<film>/out/check/<name>.jpg: A | B | where they differ"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from paths import ROOT, out_dir, reel_rel  # noqa: E402

film, ta, tb = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
opt = dict(a.split('=', 1) for a in sys.argv[4:] if '=' in a); name = opt.get('name', 'seam')
r = subprocess.run(['node', 'render.mjs', reel_rel(film), '--stills', f'{ta},{tb}'], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT)
if r.returncode != 0:
    print(r.stdout[-1500:], r.stderr[-2500:]); sys.exit(1)
a, b = (Image.open(out_dir(film, 'stills', f'{film}-{t:05d}.png')).convert('RGB') for t in (ta, tb))
if 'box' in opt:
    x, y, w, h = (int(v) for v in opt['box'].split(',')); a, b = a.crop((x, y, x + w, y + h)), b.crop((x, y, x + w, y + h))
d = np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16)).max(axis=2)
print(f'{ta} ms vs {tb} ms: mean difference {d.mean():.2f}, {(d > 24).mean() * 100:.1f}% of pixels off by more than 24')
w, h = a.size; s = 640 / w; sheet = Image.new('RGB', (1928, int(h * s) + 26), (27, 26, 29)); dr = ImageDraw.Draw(sheet)
heat = Image.fromarray(np.clip(d * 4, 0, 255).astype(np.uint8)).convert('RGB')
for i, (im, label) in enumerate(((a, f'{ta} ms'), (b, f'{tb} ms'), (heat, 'where they differ'))):
    sheet.paste(im.resize((640, int(h * s)), Image.LANCZOS), (i * 644, 26)); dr.text((i * 644 + 6, 6), label, fill=(242, 238, 232))
os.makedirs(out_dir(film, 'check'), exist_ok=True); out = out_dir(film, 'check', f'{name}.jpg'); sheet.save(out, quality=90); print(out)
