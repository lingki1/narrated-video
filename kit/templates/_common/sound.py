"""Soundtrack for this reel: the voices (vo.py) over a quiet original bed, plus the cues the scene asked for.
usage: python sound.py <timeline.json> <out.wav>     (render.mjs --sound-only calls it)

The default bed: 76 BPM electric-piano chords with a soft kick and vinyl crackle while it is night (T.day, if the scene set it,
is where it brightens); between T.quietA and T.quietB (if set) the drums drop out so nothing competes with the words.
Cues: film.cue(time, kind) from the scene, plus what moving things log for themselves (steps, pops …); every kind is a sound in
lib/sfx.py — add your own there. render.mjs walks the whole film once before calling this, so they are all in the timeline.
Everything is synthesised here (lib/audio.py, lib/beat.py): no samples, nothing to license. Change key, tempo and voices freely."""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib'))
sys.path.insert(0, HERE)
from audio import SR, Mix, _filter, bell, click, hz  # noqa: E402
from beat import epiano, hat, impact, kick, pluck, sat, sidechain, stamp, sub, vinyl  # noqa: E402
import vo  # noqa: E402

tl = json.load(open(sys.argv[1], encoding='utf-8'))
T = {k: v / 1000 for k, v in tl['T'].items()}
DUR = tl['duration'] / 1000
BPM = 76
Bt = 60 / BPM
rng = np.random.default_rng(7)

voice, drums, bass, music, fx = (Mix(DUR) for _ in range(5))
kicks = []

# ───────────────────────── voice ─────────────────────────
clips = vo.load(SR)
narrator = tl['vo'][0]['who']
for v in tl['vo']:
    if v['id'] in clips:
        voice.add(v['at'] / 1000 - vo.PRE, clips[v['id']], gain=1.0, pan=0.0 if v['who'] == narrator else -0.12)

# ───────────────────────── bed (Am7 · Fmaj7 · Cmaj7 · G6, one chord per bar) ─────────────────────────
PROG = [('A1', ['A2', 'G3', 'C4', 'E4']), ('F1', ['F2', 'A3', 'C4', 'E4']), ('C2', ['C3', 'G3', 'B3', 'E4']), ('G1', ['G2', 'B3', 'D4', 'E4'])]
DAY = T.get('day', 0.0)  # the bed is brighter from here on (0 = bright throughout)
quiet = lambda t: T.get('quietA', 1e9) <= t < T.get('quietB', -1)
bright = lambda t: t >= DAY

OPEN = T.get('open', 0.0)   # a project's opening sting plays alone; the bed comes in after it
opening = Mix(DUR)
if OPEN:
    try:
        import opening as _opening  # noqa: E402  (lib/opening.py of the project: sting(mix))
        _opening.sting(opening)
    except ImportError:
        pass
n = 0
while OPEN + n * Bt < T['end'] + 1.0:
    t = OPEN + n * Bt
    bar_pos = n % 4
    root, ch = PROG[(n // 4) % 4]
    if bar_pos == 0:
        for i, note in enumerate(ch):
            music.add(t + i * 0.035, epiano(hz(note), Bt * 3.6, bright=1.1 if bright(t) else 0.8), gain=0.22)
    if bar_pos == 2 and not quiet(t):
        music.add(t + Bt / 2, epiano(hz(ch[2]) * 2, Bt * 1.2, bright=0.9), gain=0.1, pan=0.25)
    if not quiet(t):
        if bar_pos in (0, 2):
            drums.add(t, kick(0.8, 0.8, 0.34), gain=0.6); kicks.append(t)
            bass.add(t, sub(hz(root) * 2, Bt * 0.7), gain=0.45)
        if bar_pos in (1, 3):
            drums.add(t, click(700, 0.5), gain=0.16, pan=0.1)  # a soft rim
        for h in range(2):
            drums.add(t + h * Bt / 2, hat(0.4), gain=0.08 if bright(t) else 0.05, pan=-0.2)
        if bright(t) and bar_pos in (1, 3):
            music.add(t + Bt / 2, pluck(hz(ch[3]) * 2, 0.3, bright=1.0, decay=0.14), gain=0.12, pan=-0.25)
    n += 1
if DAY > 1.0:
    music.add(0.0, vinyl(DAY, 1.0, seed=7), gain=0.06)

# ───────────────────────── cues from the picture (asked for by the scenes, and logged by whatever moves) ─────────────────────────
import sfx  # noqa: E402
counts = sfx.play_all(fx, tl['stamps'], rng)
print('sound effects: ' + (', '.join(f'{k} {v}' for k, v in sorted(counts.items(), key=lambda kv: -kv[1])) or 'none') + f'  ({sum(counts.values()) / (DUR / 60):.0f} a minute)')
for i, nname in enumerate(['C5', 'E5', 'G5', 'C6']):
    fx.add(T['card'] + 0.1 + i * 0.14, bell(hz(nname), 1.6, decay=0.5), gain=0.07)

# ───────────────────────── mix: the voice on top, everything else ducked under it ─────────────────────────
sidechain(bass, kicks, depth=0.5, release=0.14)
music.reverb(seconds=2.0, wet=0.22)
fx.reverb(seconds=1.6, wet=0.2)
drums.reverb(seconds=0.8, wet=0.08)


def active_rms(m):
    x = m.buf[: int(DUR * SR)]
    frame = int(0.05 * SR)
    e = np.sqrt(np.mean(x[: len(x) // frame * frame].reshape(-1, frame, 2) ** 2, axis=(1, 2)))
    live = e[e > e.max() * 0.03]
    return float(np.sqrt(np.mean(live ** 2))) + 1e-12 if len(live) else 1.0


frame = int(0.02 * SR)
vb = voice.buf[: len(voice.buf) // frame * frame]
act = (np.sqrt(np.mean(vb.reshape(-1, frame, 2) ** 2, axis=(1, 2))) > 0.01).astype(float)
sm = np.zeros_like(act)
for k in range(len(act)):
    prev = sm[k - 1] if k else 0.0
    sm[k] = prev + (act[k] - prev) * (0.4 if act[k] > prev else 0.04)
duck = np.concatenate([np.repeat(10 ** (-6 * sm / 20), frame), np.ones(len(music.buf))])[: len(music.buf)]

out = Mix(DUR)
levels = []
FX_PEAK_DB = -5.0   # the loudest effect peaks here (the voice peaks near +5 before the final limiter): about 10 dB under it
for name, m, db, ducked in (('voice', voice, -13.0, False), ('drums', drums, -27.0, True), ('bass', bass, -27.0, True), ('music', music, -25.0, True), ('fx', fx, -20.0, False), ('open', opening, -2.0, False)):
    if not np.any(m.buf):
        continue
    # the effects bus is set by its loudest hit, not by its average: it is hundreds of soft footsteps and a few stamps, and
    # levelling by average would push the stamps up to the voice
    m.buf *= (10 ** ((FX_PEAK_DB if name == 'fx' else db) / 20) / (np.abs(m.buf).max() + 1e-9)) if name in ('fx', 'open') else 10 ** (db / 20) / active_rms(m)
    if ducked:
        m.buf *= duck[:, None]
    levels.append(f"{name} peak {20 * np.log10(np.abs(m.buf).max() + 1e-9):.1f} dB")
    out += m
print('mix: ' + ' · '.join(levels))
out.buf = _filter(out.buf, 'highpass', 32)
out.buf = sat(out.buf / (np.abs(out.buf).max() + 1e-9) * 1.2, 1.15) * 0.9
out.write(sys.argv[2], fade_out=1.6)
print(sys.argv[2])
