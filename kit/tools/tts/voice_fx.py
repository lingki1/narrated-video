"""Give a voice a character after it is generated: lower it a little and lay an electronic layer under it, so a designed voice
reads as a virtual character instead of a plain human (or a plain child).

  python tools/tts/voice_fx.py <reel>                       # every voice that has "fx" in voices.json
  python tools/tts/voice_fx.py <reel> --voice L --preset virtual-mid
  python tools/tts/voice_fx.py --compare <reel> <id> [<id> …]   # one file per preset in videos/<reel>/out/fx-compare/, to choose by ear
  python tools/tts/voice_fx.py --list
  python tools/tts/voice_fx.py <reel> --off                 # take the effect off again: put the plain clips back

The originals stay in videos/<reel>/vo/raw/; the processed clip replaces videos/<reel>/vo/<id>.wav, so vo.py and sound.py need
no change. A second run always starts again from raw/. If a line was regenerated after processing (vo_all.py --overwrite), the new
file is recognised (fx.json keeps a fingerprint of what this tool wrote) and becomes the new raw.

The chain: (1) formants and pitch moved down a little — with Praat (praat-parselmouth) when it is installed, which can move them
separately; otherwise one librosa pitch shift that moves both; (2) a channel vocoder whose carrier follows the voice's own pitch
snapped to semitones — the "electronic" layer, it keeps the melody of the sentence but sounds made; (3) a light chorus; (4) a
little sample-rate/bit crush. Every layer is mixed under the processed dry voice, which carries the words.
You cannot hear the result: run vo_qa.py on the processed clips (the words must still be recognised) and let a person choose
the strength with --compare.
Needs numpy, scipy, soundfile, librosa; praat-parselmouth is optional."""
import argparse
import hashlib
import json
import os
import shutil
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, sosfiltfilt

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from paths import out_dir as film_out, reel_rel, vo_dir  # noqa: E402

# formant: formant shift ratio (<1 = bigger, older); pitch: new median pitch as a ratio of the old one;
# vocoder / chorus / crush: how much of each layer goes under the dry voice (0–1)
PRESETS = {
    'deeper':         dict(formant=0.92, pitch=0.86, vocoder=0.0,  chorus=0.0,  crush=0.0),
    'virtual-light':  dict(formant=0.94, pitch=0.90, vocoder=0.20, chorus=0.14, crush=0.0),
    'virtual-mid':    dict(formant=0.91, pitch=0.85, vocoder=0.32, chorus=0.18, crush=0.05),
    'virtual-strong': dict(formant=0.88, pitch=0.80, vocoder=0.48, chorus=0.22, crush=0.09),
    'robot':          dict(formant=0.90, pitch=0.88, vocoder=0.75, chorus=0.12, crush=0.12),
}


def fingerprint(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:16]


def shift(y, sr, formant, pitch):
    """move formants and pitch down; Praat's Change gender does them separately, librosa only together"""
    if formant == 1 and pitch == 1:
        return y
    try:
        import parselmouth
        from parselmouth.praat import call
        snd = parselmouth.Sound(y.astype(np.float64), sampling_frequency=sr)
        f0 = call(snd.to_pitch(), 'Get quantile', 0, 0, 0.5, 'Hertz')
        f0 = f0 if f0 == f0 else 0  # NaN when nothing was voiced
        out = call(snd, 'Change gender', 75, 600, formant, (f0 * pitch) if f0 else 0, 1.0, 1.0)
        return np.asarray(out.values[0], dtype=np.float32)
    except ImportError:
        import librosa
        steps = 12 * np.log2((formant + pitch) / 2)
        return librosa.effects.pitch_shift(y.astype(np.float32), sr=sr, n_steps=float(steps))


def track_pitch(y, sr, hop):
    """frame-wise f0 (Hz) and a 0–1 voicing weight"""
    import librosa
    f0 = librosa.yin(y, fmin=70, fmax=520, sr=sr, frame_length=2048, hop_length=hop)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    n = min(len(f0), len(rms)); f0 = f0[:n]; rms = rms[:n]
    db = 20 * np.log10(rms / (rms.max() + 1e-9) + 1e-9)
    voiced = np.clip((db + 34) / 8, 0, 1)
    return f0, voiced


def vocoder(y, sr, bands=26):
    """channel vocoder: the voice's band envelopes imposed on a saw that follows its pitch, snapped to semitones"""
    hop = 240
    f0, voiced = track_pitch(y, sr, hop)
    midi = np.round(69 + 12 * np.log2(np.maximum(f0, 1) / 440))
    fq = 440 * 2 ** ((midi - 69) / 12)
    t_frames = np.arange(len(fq)) * hop
    f_s = np.interp(np.arange(len(y)), t_frames, fq)
    sos = butter(1, 30, fs=sr, output='sos'); f_s = sosfiltfilt(sos, f_s)  # a short glide between notes
    v_s = np.interp(np.arange(len(y)), t_frames, voiced)
    ph = np.cumsum(f_s / sr)
    saw = 2 * (ph % 1.0) - 1
    sub = np.sign(np.sin(np.pi * ph))  # a square an octave down, for body
    rng = np.random.default_rng(3)
    carrier = v_s * (0.8 * saw + 0.35 * sub) + (1 - v_s) * rng.standard_normal(len(y)) * 0.6
    edges = np.geomspace(110, min(7600, sr / 2 * 0.92), bands + 1)
    env_sos = butter(2, 60, fs=sr, output='sos')
    out = np.zeros_like(y)
    for lo, hi in zip(edges[:-1], edges[1:]):
        b = butter(2, [lo, hi], btype='band', fs=sr, output='sos')
        env = sosfilt(env_sos, np.abs(sosfilt(b, y)))
        out += sosfilt(b, carrier) * env
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-9) * np.sqrt(np.mean(y ** 2))


def chorus(y, sr):
    n = np.arange(len(y)); out = np.zeros_like(y)
    for depth, base, rate, ph in ((0.0022, 0.009, 0.31, 0.0), (0.0018, 0.013, 0.43, 1.7)):
        d = (base + depth * np.sin(2 * np.pi * rate * n / sr + ph)) * sr
        out += np.interp(n - d, n, y, left=0.0)
    return out / 2


def crush(y, sr, keep=3, bits=6):
    held = np.repeat(y[::keep], keep)[: len(y)]
    q = 2 ** (bits - 1)
    out = np.round(held * q) / q
    return sosfilt(butter(2, 900, btype='high', fs=sr, output='sos'), out)


def process(y, sr, p):
    dry = shift(y, sr, p['formant'], p['pitch'])
    out = dry.copy()
    if p['vocoder']:
        out = out * (1 - 0.5 * p['vocoder']) + vocoder(dry, sr) * p['vocoder']
    if p['chorus']:
        out = out + chorus(dry, sr) * p['chorus']
    if p['crush']:
        out = out + crush(dry, sr) * p['crush']
    return (out / max(1e-9, np.abs(out).max()) * 0.95).astype(np.float32)


def load(path):
    y, sr = sf.read(path, dtype='float32')
    if y.ndim > 1:
        y = y.mean(axis=1)
    return y, sr


def voices_fx():
    p = os.path.join(ROOT, 'voices.json')
    if not os.path.exists(p):
        return {}
    v = json.load(open(p, encoding='utf-8'))
    return {k: x['fx'] for k, x in v.items() if isinstance(x, dict) and x.get('fx')}


def run_reel(reel, plan):
    d = vo_dir(reel); raw = os.path.join(d, 'raw'); os.makedirs(raw, exist_ok=True)
    state_p = os.path.join(d, 'fx.json'); state = json.load(open(state_p, encoding='utf-8')) if os.path.exists(state_p) else {}
    done = 0
    for f in sorted(os.listdir(d)):
        if not f.endswith('.wav') or '.t' in f[:-4]:
            continue
        lid = f[:-4]; letter = ''.join(ch for ch in lid if ch.isalpha())
        if letter not in plan:
            continue
        main = os.path.join(d, f); orig = os.path.join(raw, f)
        if not os.path.exists(orig) or state.get(lid, {}).get('out') != fingerprint(main):
            shutil.copy2(main, orig)  # first time, or the line was regenerated since: what is there now is the new original
        y, sr = load(orig)
        sf.write(main, process(y, sr, PRESETS[plan[letter]]), sr)
        state[lid] = {'preset': plan[letter], 'out': fingerprint(main)}; done += 1
        print(f'-- {lid}  {plan[letter]}')
    json.dump(state, open(state_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'>> {done} clips processed; originals in {raw}')
    print(f'>> 下一步必须再核对一遍处理后的声音（变调会让个别字变糊）：python tools/tts/vo_qa.py {reel_rel(reel)}/lines.js {reel_rel(reel)}/vo')


def compare(reel, ids):
    d = vo_dir(reel); out = film_out(reel, 'fx-compare'); os.makedirs(out, exist_ok=True)
    for lid in ids:
        src = os.path.join(d, 'raw', lid + '.wav')
        src = src if os.path.exists(src) else os.path.join(d, lid + '.wav')
        y, sr = load(src)
        sf.write(os.path.join(out, f'{lid}-0-original.wav'), y, sr)
        for i, (name, p) in enumerate(PRESETS.items(), 1):
            sf.write(os.path.join(out, f'{lid}-{i}-{name}.wav'), process(y, sr, p), sr)
    print(f'>> {out}')


def restore(reel):
    """Put the originals back (the plain voice): every clip this tool processed and that has not been regenerated since is
    replaced by its raw/ copy; fx.json is cleared so a later run starts clean. raw/ stays where it is."""
    d = vo_dir(reel); raw = os.path.join(d, 'raw'); state_p = os.path.join(d, 'fx.json')
    state = json.load(open(state_p, encoding='utf-8')) if os.path.exists(state_p) else {}
    back = kept = 0
    for lid, st in sorted(state.items()):
        main = os.path.join(d, lid + '.wav'); orig = os.path.join(raw, lid + '.wav')
        if not (os.path.exists(main) and os.path.exists(orig)):
            continue
        if st.get('out') == fingerprint(main):
            shutil.copy2(orig, main); back += 1
        else:
            kept += 1   # regenerated after processing: what is there now is already a plain clip
    json.dump({}, open(state_p, 'w', encoding='utf-8'))
    print(f'>> {back} clips restored to the plain voice, {kept} already plain (regenerated since)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reel', nargs='?')
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--voice'); ap.add_argument('--preset')
    ap.add_argument('--compare', action='store_true'); ap.add_argument('--list', action='store_true'); ap.add_argument('--off', action='store_true')
    a = ap.parse_args()
    if a.off:
        return restore(a.reel)
    if a.list:
        for k, v in PRESETS.items():
            print(f'{k:16} {v}')
        return
    if a.compare:
        return compare(a.reel, a.ids)
    plan = {a.voice: a.preset} if a.voice else voices_fx()
    if not plan:
        sys.exit('nothing to do: pass --voice L --preset virtual-mid, or put "fx": "<preset>" on a voice in voices.json')
    for k, v in plan.items():
        if v not in PRESETS:
            sys.exit(f'unknown preset {v!r} for {k}; see --list')
    run_reel(a.reel, plan)


if __name__ == '__main__':
    main()
