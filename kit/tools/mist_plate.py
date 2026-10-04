"""Two generated textures a layered ink-wash film needs, written into videos/<film>/img/:
  mist.webp   a wide bank of paper-coloured mist with wispy ends (solid in the middle: wider than the frame), which the page
              slides across the frame to hand one scene over to the next without a cut
  grain.png   a small seamless tile of paper grain (dark specks and fibres, mostly transparent) laid over the whole frame
usage: python tools/mist_plate.py <film>     Nothing here is anyone's artwork: both are noise."""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import reel_dir  # noqa: E402

film = sys.argv[1]
dst = os.path.join(reel_dir(film), 'img'); os.makedirs(dst, exist_ok=True)
rng = np.random.default_rng(8)
PAPER = (242, 238, 232)


def fbm(w, h, cells, octaves=5, stretch=1.0, wrap=False):
    """smooth noise 0…1: random grids of growing resolution, scaled up and summed (stretch > 1: streaks lying down)"""
    out = np.zeros((h, w), np.float32); amp = 1.0; total = 0.0
    for o in range(octaves):
        gw, gh = max(2, int(cells * 2 ** o / stretch)), max(2, int(cells * 2 ** o * h / w))
        g = rng.random((gh, gw)).astype(np.float32)
        if wrap:
            g = np.pad(g, ((0, 1), (0, 1)), mode='wrap')
        out += amp * np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255
        total += amp; amp *= 0.55
    return out / total


sm = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))

# the bank of mist: drawn at half size (it is all soft), 3600 × 1080 on the page
W, H = 1800, 540
u = np.linspace(0, 1, W, dtype=np.float32)[None, :]; v = np.linspace(0, 1, H, dtype=np.float32)[:, None]
core = sm(0.0, 0.2, u) * sm(1.0, 0.8, u)                        # 1 across the middle 60 % (2160 px on the page)
n = fbm(W, H, 5, stretch=3.0); fine = fbm(W, H, 20, octaves=3, stretch=2.0)
lean = 0.10 * (v - 0.5)                                         # the front leans: the top runs a little ahead
edge = np.clip(core + lean * (1 - core), 0, 1)
a = sm(0.34, 0.66, edge + ((n - 0.5) * 1.5 + (fine - 0.5) * 0.35) * (1 - edge ** 4))
tone = 1 - 0.05 * (1 - a) * sm(0.3, 0.8, n)                     # a breath of grey where it is thin
img = np.zeros((H, W, 4), np.uint8)
for c in range(3):
    img[..., c] = np.clip(PAPER[c] * tone, 0, 255)
img[..., 3] = np.clip(a * 255, 0, 255)
Image.fromarray(img, 'RGBA').save(os.path.join(dst, 'mist.webp'), 'WEBP', quality=82, alpha_quality=90, method=5)

# the grain: a 512 tile that repeats without a seam
S = 512
speck = fbm(S, S, 96, octaves=3, wrap=True); cloud = fbm(S, S, 6, octaves=3, wrap=True)
alpha = np.clip((speck - 0.52) * 0.55, 0, 1) + np.clip((cloud - 0.5) * 0.10, 0, 1)
fib = np.zeros((S, S), np.float32)
for _ in range(60):                                             # a few short fibres
    x, y = rng.integers(0, S, 2); ang = rng.random() * np.pi; ln = rng.integers(8, 26)
    for k in range(ln):
        fib[int(y + k * np.sin(ang)) % S, int(x + k * np.cos(ang)) % S] = 0.10
g = np.zeros((S, S, 4), np.uint8); g[..., 0] = 60; g[..., 1] = 54; g[..., 2] = 48
g[..., 3] = np.clip((alpha + fib) * 255, 0, 70)
Image.fromarray(g, 'RGBA').save(os.path.join(dst, 'grain.png'), optimize=True)
for f in ('mist.webp', 'grain.png'):
    print(f, os.path.getsize(os.path.join(dst, f)) // 1024, 'KB')
