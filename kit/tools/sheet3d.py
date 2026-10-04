"""A contact sheet of the frames a flight rendered, to look at a camera move without playing it.
usage: python tools/sheet3d.py <film> <scene> [cols=4] [fps=30] [t0=0] [pick=8] [w=640]  → videos/<film>/out/shots/<scene>-sheet.jpg
Every frame found in videos/<film>/out/shots/<scene>/ (pick=n: every n-th) goes on the sheet, labelled with its film time
(t0 = how many seconds into the film frame 1 is)."""
import os
import re
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import out_dir  # noqa: E402

film, shot = sys.argv[1], sys.argv[2]
opt = dict(a.split('=', 1) for a in sys.argv[3:] if '=' in a)
cols = int(opt.get('cols', 4)); fps = float(opt.get('fps', 30)); t0 = float(opt.get('t0', 0)); cell = int(opt.get('w', 640))
src = out_dir(film, 'shots', shot)
names = sorted(n for n in os.listdir(src) if re.match(r'f\d+\.(jpg|png)$', n))
if opt.get('pick'):     # pick=every n-th of the frames found
    names = names[::int(opt['pick'])]
ims = [Image.open(os.path.join(src, n)).convert('RGB') for n in names]
h = round(cell * ims[0].height / ims[0].width); rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * cell, rows * h), (27, 26, 29)); d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(zip(names, ims)):
    x, y = (i % cols) * cell, (i // cols) * h
    sheet.paste(im.resize((cell - 4, h - 4)), (x + 2, y + 2))
    f = int(re.search(r'\d+', n).group()); label = f'{t0 + (f - 1) / fps:.2f}s  f{f}'
    d.rectangle((x + 6, y + 6, x + 6 + 8 * len(label) + 6, y + 24), fill=(17, 17, 18)); d.text((x + 10, y + 9), label, fill=(242, 238, 232))
out = out_dir(film, 'shots', f'{shot}-sheet.jpg'); sheet.save(out, quality=88)
print(out, len(ims), 'frames')
