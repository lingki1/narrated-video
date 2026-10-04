"""Voice-over for this reel: one wav per line id in this film's vo/ folder (ids and text come from lines.js).

python vo.py  → writes vo-env.json (loudness envelope per line, 20 ms steps: subtitles and mouths follow it) and vo-d.js (line
lengths in ms: the scene chains its timeline from them). sound.py imports load() to place the clips."""
import json
import os
import re

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
REEL = os.path.basename(HERE)
SRC = os.path.join(HERE, 'vo')
PRE, POST = 0.05, 0.12  # room kept before the first sound and after the last one
GAIN = {}  # per voice letter, e.g. {'S': 0.95}; default 1.0


def ids():
    js = open(os.path.join(HERE, 'lines.js'), encoding='utf-8').read()
    return re.findall(r"\[\s*'([A-Za-z]+\d+)'\s*,", js)


def trim(y, sr, db=-40.0):
    hop = int(0.005 * sr)
    rms = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2) + 1e-12) for i in range(0, len(y), hop)])
    loud = np.where(20 * np.log10(rms / (rms.max() + 1e-12)) > db)[0]
    a = max(0, loud[0] * hop - int(PRE * sr)); b = min(len(y), (loud[-1] + 1) * hop + int(POST * sr))
    return y[a:b]


def load(sr_out=48000):
    """{id: mono float32 clip at sr_out}, silence trimmed, every line normalised to the same loudness"""
    out = {}
    for k in ids():
        p = os.path.join(SRC, k + '.wav')
        if not os.path.exists(p):
            continue
        y, sr = sf.read(p)
        y = (y.mean(axis=1) if y.ndim > 1 else y).astype(np.float32)
        y = trim(y, sr)
        f = int(0.012 * sr)
        y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        y = resample_poly(y, sr_out, sr).astype(np.float32) if sr != sr_out else y
        frame = int(0.05 * sr_out)
        e = np.sqrt(np.mean(y[: len(y) // frame * frame].reshape(-1, frame) ** 2, axis=1))
        live = e[e > e.max() * 0.1]
        out[k] = y / (float(np.sqrt(np.mean(live ** 2))) + 1e-9) * 0.1 * GAIN.get(k[0], 1.0)
    return out


if __name__ == '__main__':
    clips = load(48000)
    env, dur = {}, {}
    for k, c in clips.items():
        hop = 960  # 20 ms at 48 kHz
        r = np.array([np.sqrt(np.mean(c[i:i + hop] ** 2)) for i in range(0, len(c), hop)])
        db = 20 * np.log10(r / (r.max() + 1e-9) + 1e-9)
        env[k] = [round(float(v), 2) for v in np.clip((db + 36) / 30, 0, 1)]
        dur[k] = int(round(len(c) / 48))
    json.dump({'pre': PRE, 'env': env}, open(os.path.join(HERE, 'vo-env.json'), 'w'))
    open(os.path.join(HERE, 'vo-d.js'), 'w', encoding='utf-8', newline='\n').write(
        '// written by vo.py: voice-over line lengths in ms (trimmed, incl. 50 ms lead-in + 120 ms tail)\nexport const D = ' + json.dumps(dur) + ';\n')
    missing = [k for k in ids() if k not in clips]
    print(f'{len(clips)} lines, {sum(dur.values()) / 1000:.1f} s of voice' + (f' | no audio yet: {", ".join(missing)}' if missing else ''))
