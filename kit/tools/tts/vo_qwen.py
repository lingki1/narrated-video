"""Voice-over with Qwen3-TTS Base cloning a reference clip (normally a voice made by voice_design.py).
One wav per line id (L01.wav … + manifest.json); vo_qa.py checks the result.

  python tools/tts/vo_qwen.py <lines.txt> --ref <ref.wav> --ref-text "<what the reference says>" --out <dir>
  --only C01,C02   just these lines        --take N   C01.tN.wav with a new seed (never overwrites)
  --xvec           use only the speaker embedding of the reference (no in-context continuation of the reference clip)
Skips lines whose wav exists unless --overwrite."""
import argparse
import json
import os
import sys
import time

import numpy as np
import soundfile as sf
import torch

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CFG, read_lines, tts_text  # noqa: E402

MODEL = CFG.get('qwenBase') or 'Qwen/Qwen3-TTS-12Hz-1.7B-Base'  # a local folder, or the Hugging Face id (downloads ~4 GB)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--ref', required=True)
    ap.add_argument('--ref-text', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--only')
    ap.add_argument('--take', type=int, default=1)
    ap.add_argument('--seed', type=int, default=20261001)
    ap.add_argument('--xvec', action='store_true')
    ap.add_argument('--overwrite', action='store_true')
    a = ap.parse_args()
    lines = read_lines(a.lines)
    only = set(a.only.split(',')) if a.only else None
    os.makedirs(a.out, exist_ok=True)

    from qwen_tts import Qwen3TTSModel
    t0 = time.time()
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map='cuda:0', dtype=torch.bfloat16)
    prompt = model.create_voice_clone_prompt(ref_audio=a.ref, ref_text=tts_text(a.ref_text), x_vector_only_mode=a.xvec)
    print(f'>> model ready in {time.time() - t0:.0f}s | VRAM {torch.cuda.memory_allocated() / 2**30:.2f} GB', flush=True)
    mpath = os.path.join(a.out, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
    tot_a = tot_g = 0.0
    for i, (cid, text) in enumerate(lines):
        if only and cid not in only:
            continue
        name = f'{cid}.wav' if a.take == 1 else f'{cid}.t{a.take}.wav'
        out = os.path.join(a.out, name)
        if os.path.exists(out) and not a.overwrite:
            print(f'-- {cid} exists, skipped'); continue
        seed = a.seed + i + (a.take - 1) * 1000
        torch.manual_seed(seed); torch.cuda.manual_seed_all(seed); np.random.seed(seed % (2**32))
        read = tts_text(text)
        t1 = time.time()
        wavs, sr = model.generate_voice_clone(text=read, language='Chinese', voice_clone_prompt=prompt, non_streaming_mode=True)
        y = np.asarray(wavs[0], dtype=np.float32)
        sf.write(out, y / max(1.0, float(np.abs(y).max()) / 0.95), sr)
        gen, dur = time.time() - t1, len(y) / sr
        tot_a += dur; tot_g += gen
        manifest[name] = dict(id=cid, text=text, read=read, seed=seed, engine='Qwen3-TTS-12Hz-1.7B-Base', ref=os.path.basename(a.ref), mode='xvec' if a.xvec else 'icl',
                              audio_sec=round(dur, 2), gen_sec=round(gen, 2))
        json.dump(manifest, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'-- {cid} {dur:5.1f}s audio in {gen:5.1f}s | {read[:34]}', flush=True)
    if tot_a:
        print(f'>> done: {tot_a:.0f}s of audio in {tot_g:.0f}s | peak VRAM {torch.cuda.max_memory_allocated() / 2**30:.2f} GB')


if __name__ == '__main__':
    main()
