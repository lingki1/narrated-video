"""Tiny deterministic synth for soundtracks: UI sound effects + a soft ambient bed.

Everything is generated here (no samples, no downloads), so there is nothing to license.
A scene's sound.py builds a Mix from the timeline its scene.js exports and writes a WAV;
render.mjs muxes it into the video with loudness normalisation (-14 LUFS).
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
_rng = np.random.default_rng(7)  # fixed seed: the same scene always sounds the same

NOTE_INDEX = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(note):
    """'A4' → 440.0; accepts sharps/flats like 'C#5', 'Bb3'."""
    name, octave = note[:-1], int(note[-1])
    semi = NOTE_INDEX[name[0]] + (1 if '#' in name else -1 if 'b' in name[1:] else 0)
    return 440.0 * 2 ** ((semi + 12 * (octave + 1) - 69) / 12)


def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _env(n, attack, release, sr=SR):
    env = np.ones(n)
    a = min(n, int(attack * sr))
    r = min(n - a, int(release * sr))
    if a:
        env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if r:
        env[n - r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return env


def _filter(sig, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, sig, axis=0)


def noise(dur):
    return _rng.standard_normal(int(dur * SR))


# ───────────────────────── voices (mono unless noted) ─────────────────────────

def bell(freq, dur=1.6, decay=0.55, bright=1.0):
    """Music-box / celesta: a few partials, higher ones die faster."""
    t = _t(dur)
    out = np.zeros_like(t)
    for ratio, amp, d in ((1, 1.0, 1.0), (2.0, 0.32 * bright, 0.55), (3.0, 0.12 * bright, 0.35), (4.16, 0.07 * bright, 0.22)):
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay * d))
    return out * _env(len(t), 0.003, 0.05)


def pad(freq, dur, attack=1.2, release=1.6, detune_cents=7.0):
    """Warm additive pad, stereo (two detuned voices per side)."""
    t = _t(dur)
    env = _env(len(t), attack, release)
    sides = []
    for sign in (-1, 1):
        f = freq * 2 ** (sign * detune_cents / 1200)
        voice = np.zeros_like(t)
        for h in range(1, 7):
            voice += np.sin(2 * np.pi * f * h * t + sign * h * 0.7) / h ** 1.6
        sides.append(voice * env)
    return np.stack(sides, axis=1) * 0.5


def kick(level=1.0):
    t = _t(0.35)
    f = 48 + 60 * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return level * np.sin(phase) * np.exp(-t / 0.12) * _env(len(t), 0.002, 0.02)


def hat(level=1.0):
    n = noise(0.05)
    return level * _filter(n, 'highpass', 7000) * np.exp(-_t(0.05) / 0.012)


def click(freq=1900, level=1.0):
    """A soft UI tap."""
    t = _t(0.05)
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.010)
    tick = _filter(noise(0.05), 'highpass', 3000) * np.exp(-t / 0.002) * 0.4
    return level * (body + tick)


def key(level=1.0):
    """One keystroke on a phone keyboard: a short filtered tick with a little random pitch."""
    t = _t(0.04)
    f = _rng.uniform(260, 420)
    body = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008) * 0.6
    tick = _filter(noise(0.04), 'bandpass', [2500, 7000]) * np.exp(-t / 0.003)
    return level * (body + tick) * _rng.uniform(0.75, 1.0)


def glide(f0, f1, dur, decay=None, level=1.0):
    """Sine that glides exponentially from f0 to f1 (send / receive blips)."""
    t = _t(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / decay) if decay else _env(len(t), 0.004, dur * 0.6)
    return level * np.sin(phase) * env * _env(len(t), 0.003, 0.01)


def whoosh(dur, f_from, f_to, level=1.0):
    """Band-passed noise whose centre sweeps from f_from to f_to (overlap-add of short filtered chunks)."""
    n = int(dur * SR)
    src = noise(dur + 0.1)
    out = np.zeros(n + SR // 10)
    hop = 1024
    win = np.hanning(hop * 2)
    for i, start in enumerate(range(0, n, hop)):
        p = start / n
        fc = f_from * (f_to / f_from) ** p
        chunk = src[start:start + hop * 2]
        if len(chunk) < hop * 2:
            break
        band = _filter(chunk, 'bandpass', [fc / 1.6, min(fc * 1.6, SR / 2 - 100)])
        out[start:start + hop * 2] += band * win
    out = out[:n]
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return level * out * shape / (np.abs(out).max() + 1e-9)


# ───────────────────────── mixing ─────────────────────────

class Mix:
    def __init__(self, duration):
        self.duration = duration
        self.buf = np.zeros((int((duration + 4) * SR), 2))

    def add(self, t, sig, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            angle = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(angle), sig * np.sin(angle)], axis=1) * np.sqrt(2)
        start = int(t * SR)
        end = min(len(self.buf), start + len(sig))
        if start < end:
            self.buf[start:end] += sig[:end - start] * gain
        return self

    def reverb(self, seconds=1.8, wet=0.25, tone=6000):
        n = int(seconds * SR)
        decay = np.exp(-np.arange(n) / SR / (seconds / 6.9))
        ir = np.stack([_filter(noise(seconds), 'lowpass', tone) * decay for _ in range(2)], axis=1)
        ir /= np.sqrt((ir ** 2).sum(axis=0))
        wet_sig = np.stack([fftconvolve(self.buf[:, c], ir[:, c])[:len(self.buf)] for c in range(2)], axis=1)
        self.buf = self.buf * (1 - wet) + wet_sig * wet * 1.4
        return self

    def lowpass(self, freq):
        self.buf = _filter(self.buf, 'lowpass', freq)
        return self

    def __iadd__(self, other):
        self.buf += other.buf
        return self

    def write(self, path, fade_out=1.2):
        out = self.buf[:int(self.duration * SR)].copy()
        f = int(fade_out * SR)
        out[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
        out[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
        peak = np.abs(out).max() + 1e-9
        out = out / peak * 10 ** (-1 / 20)
        wavfile.write(path, SR, (out * 32767).astype(np.int16))
