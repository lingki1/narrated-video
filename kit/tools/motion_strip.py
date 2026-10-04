"""Look at a movement frame by frame: consecutive frames of one part of the picture, side by side, large enough to judge.

usage: python tools/motion_strip.py <film> <from ms> <to ms> [step=150] [crop=x,y,w,h] [cols=6] [cell=420] [name=strip] [query=part=3]
  → videos/<film>/out/check/<name>.jpg   (each cell labelled with its time)
Sparse thumbnails of whole frames hide what goes wrong in a walk — a foot sliding, an arm coming off, a body bending.
This renders every step-th moment through render.mjs and cuts out the same window from each."""
import os
import subprocess
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from paths import ROOT, out_dir, reel_rel  # noqa: E402

film, t0, t1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
opt = dict(a.split('=', 1) for a in sys.argv[4:] if '=' in a)   # query=part=3 keeps its second '='
step = int(opt.get('step', 150)); cols = int(opt.get('cols', 6)); cell = int(opt.get('cell', 420)); name = opt.get('name', 'strip')
times = list(range(t0, t1 + 1, step))
# query=k=v goes to the page (render.mjs --query): a film that can play one part on its own reads it from its URL.
# The stills are named after this strip, so two people checking at once do not overwrite each other
extra = ['--suffix', name] + (['--query', opt['query']] if 'query' in opt else [])
r = subprocess.run(['node', 'render.mjs', reel_rel(film), '--stills', ','.join(map(str, times)), *extra], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT)
if r.returncode != 0:
    print(r.stdout[-1500:], r.stderr[-2500:]); sys.exit(1)
frames = [Image.open(out_dir(film, 'stills', f'{film}-{name}-{t:05d}.png')).convert('RGB') for t in times]
x, y, w, h = (int(v) for v in opt['crop'].split(',')) if 'crop' in opt else (0, 0, *frames[0].size)
ch = round(cell * h / w); rows = -(-len(frames) // cols)
sheet = Image.new('RGB', (cols * cell, rows * ch), (27, 26, 29)); d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(zip(times, frames)):
    cx, cy = (i % cols) * cell, (i // cols) * ch
    sheet.paste(im.crop((x, y, x + w, y + h)).resize((cell - 4, ch - 4), Image.LANCZOS), (cx + 2, cy + 2))
    d.rectangle((cx + 6, cy + 6, cx + 78, cy + 24), fill=(17, 17, 18)); d.text((cx + 10, cy + 9), f'{t / 1000:.2f} s', fill=(242, 238, 232))
os.makedirs(out_dir(film, 'check'), exist_ok=True); out = out_dir(film, 'check', f'{name}.jpg'); sheet.save(out, quality=90)
print(out, len(frames), 'frames')
