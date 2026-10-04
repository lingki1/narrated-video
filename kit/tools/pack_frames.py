"""Get the frames of a flight (tools/shot3d.py <film> <scene> fly) ready for the page: WebP atlases of a few frames side by side
(valid images, so any host serves them; fewer files than one per frame) and an index.

usage: python tools/pack_frames.py <film> <scene> [q=80] [per=2] [fps=30] [t0=0] [w=1920]
→ videos/<film>/img/<scene>/a000.webp … + frames.js  (export default { fps, t0, count, w, h, per, files: [...] })
Frame i is in files[floor(i / per)], at x = (i % per) * w. t0 = how many seconds into the film frame 1 is (the page reads it from frames.js)."""
import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import out_dir, reel_dir  # noqa: E402

film, shot = sys.argv[1], sys.argv[2]
opt = dict(a.split('=', 1) for a in sys.argv[3:] if '=' in a)
q = int(opt.get('q', 80)); per = int(opt.get('per', 2)); fps = float(opt.get('fps', 30)); t0 = float(opt.get('t0', 0)); w = int(opt.get('w', 1920))
src = out_dir(film, 'shots', shot)
names = sorted(n for n in os.listdir(src) if re.match(r'f\d+\.(jpg|png)$', n))
assert names, f'no frames in {src}'
dst = os.path.join(reel_dir(film), 'img', shot); os.makedirs(dst, exist_ok=True)
for old in os.listdir(dst):
    if re.match(r'a\d+\.webp$', old) or old == 'frames.js':
        os.remove(os.path.join(dst, old))
first = Image.open(os.path.join(src, names[0])); h = round(w * first.height / first.width)
files = []; total = 0
for k in range(0, len(names), per):
    group = names[k:k + per]; sheet = Image.new('RGB', (w * len(group), h))
    for i, n in enumerate(group):
        im = Image.open(os.path.join(src, n)).convert('RGB')
        sheet.paste(im if im.size == (w, h) else im.resize((w, h), Image.LANCZOS), (i * w, 0))
    name = f'a{k // per:03d}.webp'; sheet.save(os.path.join(dst, name), 'WEBP', quality=q, method=4)
    files.append(name); total += os.path.getsize(os.path.join(dst, name))
meta = {'fps': fps, 't0': t0, 'count': len(names), 'w': w, 'h': h, 'per': per, 'files': files}
open(os.path.join(dst, 'frames.js'), 'w', encoding='utf-8', newline='\n').write(
    f'// written by tools/pack_frames.py from out/shots/{shot}/ — frame i is in files[floor(i / per)] at x = (i % per) * w\nexport default ' + json.dumps(meta) + ';\n')
print(f'{len(names)} frames → {len(files)} files, {total / 1e6:.1f} MB ({total / len(names) / 1024:.0f} KB a frame) → {dst}')
