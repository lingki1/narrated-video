"""Drum machine + synth voices for upbeat cuts (built on audio.py; everything synthesised, nothing sampled).

Grid helpers assume a tempo; a scene's sound.py places hits on the same beat grid its scene.js is cut to.
"""
import numpy as np
from scipy.signal import sawtooth

from audio import SR, Mix, _env, _filter, _t, bell, hz, noise, pad


def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)


# ───────────────────────── drums ─────────────────────────

def kick(level=1.0, punch=1.0, length=0.42):
    t = _t(length)
    f = 52 + 150 * np.exp(-t / 0.028) * punch + 30 * np.exp(-t / 0.2)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    click = _filter(noise(length), 'bandpass', [1500, 6000]) * np.exp(-t / 0.004) * 0.35
    return level * sat(body + click, 1.8) * _env(len(t), 0.001, 0.03)


def snare(level=1.0, tone=185):
    t = _t(0.3)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.05) * 0.7
    body += np.sin(2 * np.pi * tone * 1.6 * t) * np.exp(-t / 0.03) * 0.3
    rattle = _filter(noise(0.3), 'bandpass', [1400, 9000]) * np.exp(-t / 0.11)
    return level * sat(body + rattle * 0.9, 1.3) * _env(len(t), 0.001, 0.03)


def clap(level=1.0):
    t = _t(0.45)
    out = np.zeros_like(t)
    src = _filter(noise(0.45), 'bandpass', [900, 3200])
    for k, d in enumerate((0.0, 0.011, 0.023, 0.034)):
        i = int(d * SR)
        seg = np.zeros_like(t)
        seg[i:] = np.exp(-(t[i:] - d) / (0.008 if k < 3 else 0.16))
        out += src * seg
    return level * out * 0.8 * _env(len(t), 0.001, 0.05)


def hat(level=1.0, open_=False):
    dur = 0.32 if open_ else 0.06
    t = _t(dur)
    n = _filter(noise(dur), 'highpass', 7500)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (3140, 4270, 5190, 6380)) * 0.12
    return level * (n + _filter(metal, 'highpass', 6000)) * np.exp(-t / (0.09 if open_ else 0.014)) * _env(len(t), 0.0005, 0.01)


def tom(freq, level=1.0):
    t = _t(0.4)
    f = freq * (1 + 0.6 * np.exp(-t / 0.03))
    return level * sat(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13), 1.4) * _env(len(t), 0.001, 0.03)


def crash(level=1.0, dur=2.2):
    t = _t(dur)
    n = _filter(noise(dur), 'highpass', 3500)
    shimmer = _filter(noise(dur), 'bandpass', [6000, 12000]) * 0.6
    return level * (n + shimmer) * np.exp(-t / (dur / 3.2)) * _env(len(t), 0.002, 0.2)


# ───────────────────────── tonal ─────────────────────────

def sub(freq, dur, level=1.0):
    t = _t(dur)
    # fundamental + a few harmonics so the line still reads on phone speakers (they roll off below ~150 Hz)
    x = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.15 * np.sin(6 * np.pi * freq * t)
    return level * sat(x, 1.8) * _env(len(t), 0.004, min(0.06, dur * 0.4))


def pluck(freq, dur=0.5, bright=1.0, decay=0.22, detune=6.0):
    """Saw-ish pluck: harmonics 1/h, higher ones die faster. Stereo (detuned L/R)."""
    t = _t(dur)
    sides = []
    for sign in (-1, 1):
        f = freq * 2 ** (sign * detune / 1200)
        v = np.zeros_like(t)
        for h in range(1, 14):
            if f * h > 16000:
                break
            v += np.sin(2 * np.pi * f * h * t + h * sign * 0.3) / h * np.exp(-t * h ** 0.8 / (decay * bright))
        sides.append(v * _env(len(t), 0.002, min(0.08, dur * 0.3)))
    return np.stack(sides, axis=1) * 0.55


def stab(freqs, dur=0.35, level=1.0):
    """Detuned-saw chord stab with a closing lowpass (two filtered layers crossfaded)."""
    t = _t(dur)
    raw = np.zeros((len(t), 2))
    for f in freqs:
        for c, cents in enumerate((-9, 9)):
            ff = f * 2 ** (cents / 1200)
            raw[:, c] += sawtooth(2 * np.pi * ff * t + c) * 0.5
    bright = _filter(raw, 'lowpass', 5200)
    dull = _filter(raw, 'lowpass', 900)
    k = np.exp(-t / 0.06)[:, None]
    return level * (bright * k + dull * (1 - k)) * _env(len(t), 0.003, 0.12)[:, None] / max(1, len(freqs))


def riser(dur, level=1.0, f0=180, f1=2400):
    t = _t(dur)
    p = t / dur
    f = f0 * (f1 / f0) ** p
    tone = sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.25
    n = noise(dur)
    hiss = np.zeros_like(n)
    hop = 2048
    for s in range(0, len(n) - hop, hop):
        fc = 400 * (9000 / 400) ** (s / len(n))
        hiss[s:s + hop] = _filter(n[s:s + hop], 'bandpass', [fc / 1.5, min(fc * 1.5, SR / 2 - 200)])
    env = p ** 2.2
    return level * (tone + hiss * 1.2) * env * _env(len(t), 0.05, 0.01)


def reverse_swell(dur, level=1.0):
    return crash(level, dur)[::-1] * np.linspace(0, 1, int(dur * SR)) ** 1.5


def impact(level=1.0, dur=2.6):
    t = _t(dur)
    f = 32 + 60 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    body = _filter(noise(dur), 'lowpass', 1800) * np.exp(-t / 0.18) * 0.6
    return level * sat(boom * 1.2 + body, 1.5) * _env(len(t), 0.001, 0.3)


def scribble(dur, level=1.0, seed=3):
    """Marker on paper: bandpassed noise with a jittery amplitude."""
    rng = np.random.default_rng(seed)
    t = _t(dur)
    n = _filter(noise(dur), 'bandpass', [1800, 7000])
    jitter = np.interp(t, np.linspace(0, dur, int(dur * 40)), rng.uniform(0.2, 1.0, int(dur * 40)))
    return level * n * jitter * _env(len(t), 0.01, 0.03)


def rain(dur, level=1.0):
    n = _filter(noise(dur), 'bandpass', [900, 7000]) * 0.5
    rng = np.random.default_rng(11)
    drops = np.zeros(int(dur * SR))
    for at in rng.uniform(0, dur - 0.05, int(dur * 55)):
        i = int(at * SR)
        m = int(0.012 * SR)
        drops[i:i + m] += np.sin(2 * np.pi * rng.uniform(2500, 6000) * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.002 * SR)) * rng.uniform(0.2, 1)
    return level * (n + drops * 0.5) * _env(int(dur * SR), 0.6, 0.6)


# ───────────────────────── lo-fi / reviewer kit (Reel 07) ─────────────────────────

def epiano(freq, dur=1.6, level=1.0, bright=1.0):
    """Rhodes-ish tine: FM with a decaying index, slow tremolo, detuned L/R. Stereo."""
    t = _t(dur)
    sides = []
    for c, cents in enumerate((-4, 4)):
        f = freq * 2 ** (cents / 1200)
        index = (1.6 * bright) * np.exp(-t / 0.25) + 0.25
        x = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * t))
        x += 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)
        trem = 1 + 0.12 * np.sin(2 * np.pi * 4.6 * t + c * np.pi)
        sides.append(x * np.exp(-t / 1.1) * trem * _env(len(t), 0.004, min(0.25, dur * 0.3)))
    return level * np.stack(sides, axis=1) * 0.5


def vinyl(dur, level=1.0, seed=21):
    """Record surface: soft hiss + sparse crackles."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    hiss = _filter(noise(dur), 'bandpass', [600, 5000]) * 0.08
    crack = np.zeros(n)
    for at in rng.uniform(0, dur, int(dur * 9)):
        i = int(at * SR); m = int(0.004 * SR)
        crack[i:i + m] += rng.uniform(0.3, 1.0) * np.exp(-np.arange(min(m, n - i)) / (0.0006 * SR)) * rng.choice([-1, 1])
    return level * (hiss + _filter(crack, 'highpass', 1200)) * _env(n, 0.3, 0.5)


def blip(freq, dur=0.07, level=1.0, vowel=0):
    """One syllable of Tiane's voice (Animalese-style): a short buzzy tone through a vowel-ish formant."""
    t = _t(dur)
    f = freq * (1 + 0.04 * np.sin(2 * np.pi * 18 * t))
    x = sawtooth(2 * np.pi * np.cumsum(f) / SR, 0.5) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6
    lo, hi = [(700, 1300), (400, 2300), (500, 1000), (300, 2600)][vowel % 4]
    x = _filter(x, 'bandpass', [lo * 0.6, hi * 1.3]) * 1.6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    return level * x * _env(len(t), 0.006, dur * 0.45)


def scratch(level=1.0):
    """Record scratch: filtered noise + a pitch that swoops up then back down."""
    dur = 0.42
    t = _t(dur)
    f = 180 + 700 * np.sin(np.pi * np.clip(t / 0.26, 0, 1)) ** 2
    tone = sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.4
    grit = _filter(noise(dur), 'bandpass', [900, 4000]) * np.sin(np.pi * np.clip(t / 0.3, 0, 1))
    return level * sat(tone + grit, 1.4) * _env(len(t), 0.005, 0.08)


def marker(dur=0.38, level=1.0):
    """Felt marker squeak on glass."""
    t = _t(dur)
    f = 1900 + 500 * np.sin(2 * np.pi * 3 * t)
    squeak = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
    rub = _filter(noise(dur), 'bandpass', [2500, 8000]) * 0.5
    return level * (squeak + rub) * _env(len(t), 0.02, 0.06)


def shutter(level=1.0):
    """Camera shutter: two quick mechanical clicks."""
    out = np.zeros(int(0.12 * SR))
    for at, g in ((0.0, 1.0), (0.055, 0.7)):
        i = int(at * SR); m = int(0.03 * SR)
        k = _filter(noise(0.03), 'bandpass', [1500, 7000]) * np.exp(-np.arange(m) / (0.004 * SR))
        out[i:i + m] += k * g
    return level * out


def typewriter(level=1.0, rng=None):
    rng = rng or np.random.default_rng(0)
    t = _t(0.035)
    k = _filter(noise(0.035), 'bandpass', [2000, 6500]) * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * rng.uniform(900, 1300) * t) * np.exp(-t / 0.006) * 0.4
    return level * (k + body) * rng.uniform(0.7, 1.0)


def stamp(level=1.0):
    t = _t(0.5)
    thud = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.09)
    slap = _filter(noise(0.5), 'bandpass', [500, 3500]) * np.exp(-t / 0.03)
    return level * sat(thud + slap * 0.8, 1.5)


# ───────────────────────── helpers ─────────────────────────

def sidechain(mix, kicks, depth=0.6, release=0.16):
    """Duck a whole Mix under the kicks (pumping)."""
    n = len(mix.buf)
    g = np.ones(n)
    tt = np.arange(n) / SR
    for k in kicks:
        i = int(k * SR)
        j = min(n, i + int(release * 4 * SR))
        g[i:j] = np.minimum(g[i:j], 1 - depth * np.exp(-(tt[i:j] - k) / release))
    mix.buf *= g[:, None]
    return mix


def chord_pad(mix, t, notes, dur, gain=0.12, attack=0.4, release=1.2):
    for n in notes:
        mix.add(t, pad(hz(n), dur + release, attack=attack, release=release), gain=gain)


def arp_bell(mix, t, note, gain=0.1, pan=0.0):
    mix.add(t, bell(hz(note), 1.0, decay=0.35, bright=0.8), gain=gain, pan=pan)


__all__ = ['sat', 'kick', 'snare', 'clap', 'hat', 'tom', 'crash', 'sub', 'pluck', 'stab', 'riser', 'reverse_swell',
           'impact', 'scribble', 'rain', 'epiano', 'vinyl', 'blip', 'scratch', 'marker', 'shutter', 'typewriter', 'stamp',
           'sidechain', 'chord_pad', 'arp_bell', 'Mix', 'SR', 'hz']
