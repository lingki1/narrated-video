"""Generate every line of a reel with Qwen3-TTS, each voice cloned from its own reference clip. The model is loaded once.

  python tools/tts/vo_all.py <reel> [--only L03,S01] [--take 2] [--overwrite]

Reads videos/<reel>/lines.js and voices.json in the project root:
  { "L": { "ref": "assets/voice-ref/narrator.wav", "text": "what the reference clip says" }, "S": { … } }
Writes videos/<reel>/vo/<id>.wav (+ manifest.json). Existing files are kept unless --overwrite; --take N writes <id>.tN.wav with a
new seed and never overwrites, so a misread line can be redone and compared. Then: python tools/tts/vo_qa.py videos/<reel>/lines.js videos/<reel>/vo"""
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
from common import CFG, ROOT, read_lines, tts_text  # noqa: E402
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from paths import reel_dir, vo_dir  # noqa: E402

MODEL = CFG.get('qwenBase') or 'Qwen/Qwen3-TTS-12Hz-1.7B-Base'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reel')
    ap.add_argument('--only')
    ap.add_argument('--take', type=int, default=1)
    ap.add_argument('--seed', type=int, default=20261001)
    ap.add_argument('--overwrite', action='store_true')
    a = ap.parse_args()
    lines = read_lines(os.path.join(reel_dir(a.reel), 'lines.js'))
    voices = json.load(open(os.path.join(ROOT, 'voices.json'), encoding='utf-8'))
    missing = sorted({cid[0] for cid, _ in lines} - set(voices))
    if missing:
        sys.exit(f'voices.json has no reference for voice(s): {", ".join(missing)}')
    only = set(a.only.split(',')) if a.only else None
    out_dir = vo_dir(a.reel)
    os.makedirs(out_dir, exist_ok=True)

    from qwen_tts import Qwen3TTSModel
    t0 = time.time()
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map='cuda:0', dtype=torch.bfloat16)
    prompts = {}
    for who in sorted({cid[0] for cid, _ in lines}):
        v = voices[who]
        prompts[who] = model.create_voice_clone_prompt(ref_audio=os.path.join(ROOT, v['ref']), ref_text=tts_text(v['text']), x_vector_only_mode=bool(v.get('xvec')))
    print(f'>> model ready in {time.time() - t0:.0f}s | voices: {", ".join(prompts)}', flush=True)
    mpath = os.path.join(out_dir, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
    tot_a = tot_g = 0.0
    for i, (cid, text) in enumerate(lines):
        if only and cid not in only:
            continue
        name = f'{cid}.wav' if a.take == 1 else f'{cid}.t{a.take}.wav'
        out = os.path.join(out_dir, name)
        if os.path.exists(out) and not a.overwrite:
            continue
        seed = a.seed + i + (a.take - 1) * 1000
        torch.manual_seed(seed); torch.cuda.manual_seed_all(seed); np.random.seed(seed % (2**32))
        read = tts_text(text)
        t1 = time.time()
        wavs, sr = model.generate_voice_clone(text=read, language=voices[cid[0]].get('language', 'Chinese'), voice_clone_prompt=prompts[cid[0]], non_streaming_mode=True)
        y = np.asarray(wavs[0], dtype=np.float32)
        sf.write(out, y / max(1.0, float(np.abs(y).max()) / 0.95), sr)
        gen, dur = time.time() - t1, len(y) / sr
        tot_a += dur; tot_g += gen
        manifest[name] = dict(id=cid, text=text, read=read, seed=seed, engine=os.path.basename(MODEL), ref=os.path.basename(voices[cid[0]]['ref']), audio_sec=round(dur, 2), gen_sec=round(gen, 2))
        json.dump(manifest, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'-- {cid} {dur:5.1f}s audio in {gen:5.1f}s | {read[:34]}', flush=True)
    print(f'>> done: {tot_a:.0f}s of audio in {tot_g:.0f}s' + (f' | peak VRAM {torch.cuda.max_memory_allocated() / 2**30:.2f} GB' if torch.cuda.is_available() else ''))


if __name__ == '__main__':
    main()
