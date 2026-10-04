"""Named sound effects for what happens on screen. Everything is synthesised (lib/audio.py, lib/beat.py): nothing to license.

A scene asks for a sound with film.cue(ms, kind); things that move also ask for themselves — the acting system (lib/actor.js)
logs a step when a foot lands, jump / land, the pen scratching, scissors, the wrench, a squash, and lib/parts.js logs a pop
when something pops in. render.mjs walks the whole timeline once before it builds the sound, so those are all in the timeline.

    import sfx;  counts = sfx.play_all(fx, tl['stamps'], rng)

Kinds:  pop  step  jump  land  squish  write  snip  ratchet  whoosh  throw  drop  slide  ding  buzz  tick  stamp
        msg / card  bell  alarm  type  shutter  crumple  gallop  sparkle
Levels here are relative to each other; the mix (sound.py) sets the whole effects bus under the voice."""
import numpy as np

from audio import SR, _env, _filter, bell, click, glide, hz, noise, whoosh
from beat import impact, pluck, scribble, shutter, stamp, tom, typewriter


def _puff(dur=0.09, lo=300, hi=1400, level=1.0):
    """a short, soft burst of band-passed noise (dust, cloth, air)"""
    n = _filter(noise(dur), 'bandpass', [lo, hi])
    return level * n * _env(len(n), 0.004, dur * 0.8) / (np.abs(n).max() + 1e-9)


def _cut(x, dur):
    n = int(dur * SR)
    return x[:n] * _env(min(n, len(x)), 0.001, 0.02)


def play(fx, kind, s, rng):
    """add one effect to the Mix `fx` at s seconds; returns False if the kind is unknown"""
    pan = float(rng.uniform(-0.25, 0.25))
    if kind == 'pop':                      # something pops in
        fx.add(s, glide(480, 940, 0.075), gain=0.20, pan=pan)
    elif kind == 'step':                   # one footstep: soft and low, a little different each time
        fx.add(s, _cut(_filter(tom(float(rng.uniform(84, 104)), 1.0), 'lowpass', 600), 0.09), gain=0.13, pan=pan * 0.6)
        fx.add(s, _puff(0.05, 500, 1800), gain=0.03, pan=pan * 0.6)
    elif kind == 'jump':                   # takes off
        fx.add(s, glide(260, 620, 0.13), gain=0.16, pan=pan)
    elif kind == 'land':                   # comes down
        fx.add(s, _cut(tom(78, 1.0), 0.16), gain=0.24, pan=pan)
        fx.add(s, _puff(0.09, 300, 1200), gain=0.07, pan=pan)
    elif kind == 'squish':                 # gets pressed flat
        fx.add(s, glide(520, 190, 0.14), gain=0.18, pan=pan)
        fx.add(s, _puff(0.1, 200, 900), gain=0.06, pan=pan)
    elif kind == 'write':                  # the pen, one short stroke
        fx.add(s, scribble(0.11, 1.0, seed=int(rng.integers(1, 9999))), gain=0.10, pan=pan)
    elif kind == 'snip':                   # scissors
        fx.add(s, click(3300, 1.0), gain=0.12, pan=pan)
        fx.add(s + 0.05, click(2500, 0.8), gain=0.10, pan=pan)
    elif kind == 'ratchet':                # a wrench turning
        for i in range(3):
            fx.add(s + i * 0.045, click(1300 + i * 120, 0.9), gain=0.10, pan=pan)
    elif kind in ('whoosh', 'throw'):      # something flies
        fx.add(s, whoosh(0.26, 500, 2600), gain=0.15, pan=pan)
    elif kind == 'drop':                   # something falls in / is dropped
        fx.add(s, glide(700, 160, 0.22), gain=0.16, pan=pan)
        fx.add(s + 0.2, _cut(tom(70, 1.0), 0.18), gain=0.22, pan=pan)
    elif kind == 'slide':                  # pushing or dragging
        fx.add(s, whoosh(0.5, 180, 420), gain=0.12, pan=pan)
    elif kind == 'ding':                   # it worked
        fx.add(s, bell(hz('E6'), 0.7, decay=0.25, bright=1.2), gain=0.14, pan=pan)
        fx.add(s + 0.09, bell(hz('B6'), 1.0, decay=0.35, bright=1.2), gain=0.14, pan=pan)
    elif kind == 'buzz':                   # it didn't
        for i in range(2):
            b = glide(190, 150, 0.13) + 0.5 * glide(380, 300, 0.13)
            fx.add(s + i * 0.16, np.tanh(b * 2.5), gain=0.16, pan=pan)
    elif kind == 'tick':
        fx.add(s, click(1500, 0.8), gain=0.14, pan=pan)
    elif kind == 'stamp':
        fx.add(s, stamp(1.0), gain=0.34)
        fx.add(s, impact(0.9, 1.4), gain=0.16)
    elif kind in ('msg', 'card'):
        fx.add(s, pluck(hz('E5'), 0.22, bright=1.1, decay=0.09), gain=0.14, pan=-0.2)
        fx.add(s + 0.07, pluck(hz('A5'), 0.22, bright=1.1, decay=0.09), gain=0.11, pan=-0.2)
    elif kind == 'bell':
        for i, nname in enumerate(['E5', 'A5', 'C6']):
            fx.add(s + i * 0.09, bell(hz(nname), 1.2, decay=0.4), gain=0.09, pan=float(rng.uniform(-0.4, 0.4)))
    elif kind == 'alarm':
        for k in range(2):
            fx.add(s + k * 0.26, bell(hz('B5'), 0.16, decay=0.08, bright=1.6), gain=0.14, pan=0.2)
            fx.add(s + k * 0.26 + 0.11, bell(hz('B5'), 0.16, decay=0.08, bright=1.6), gain=0.14, pan=0.2)
    elif kind == 'type':
        fx.add(s, typewriter(1.0, rng), gain=0.12, pan=pan)
    elif kind == 'shutter':
        fx.add(s, shutter(1.0), gain=0.22, pan=pan)
    elif kind == 'crumple':
        for i in range(5):
            fx.add(s + i * 0.05 + float(rng.uniform(0, 0.02)), _puff(0.05, 1500, 6000), gain=0.09, pan=pan)
    elif kind == 'gallop':                 # one hoof-beat pair
        fx.add(s, click(620, 1.0), gain=0.10, pan=pan)
        fx.add(s + 0.09, click(480, 0.9), gain=0.09, pan=pan)
    elif kind == 'sparkle':
        for i, nname in enumerate(['E6', 'G6', 'B6', 'E7']):
            fx.add(s + i * 0.05, bell(hz(nname), 0.6, decay=0.2, bright=1.3), gain=0.07, pan=float(rng.uniform(-0.4, 0.4)))
    else:
        return False
    return True


def play_all(fx, stamps, rng, skip=()):
    """play every [ms, kind] cue; returns {kind: count} (unknown kinds are counted under '?<kind>')"""
    counts = {}
    for at, kind in sorted(stamps):
        if kind in skip:
            continue
        ok = play(fx, kind, max(0.0, at / 1000), rng)
        k = kind if ok else '?' + kind
        counts[k] = counts.get(k, 0) + 1
    return counts
