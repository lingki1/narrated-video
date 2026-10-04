"""Design brand-new voices from a text description (Qwen3-TTS VoiceDesign, Apache 2.0) and build a listening page.
The voices belong to no real person; the clip that gets picked becomes the 10–15 s reference for vo_qwen.py.

  python tools/tts/voice_design.py <directions.json> <out_dir>
directions.json: {"text": "...", "seeds": [101, 202], "directions": [{"id", "name", "instruct"}]}
Each direction is generated once per seed (the same description gives a different voice every time), named <id><A|B|…>.
Writes <out_dir>/<id><take>.wav (+ .mp3), takes.json and index.html. Existing wavs are kept, so adding directions is cheap."""
import base64
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
import torch

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CFG  # noqa: E402

MODEL = CFG.get('qwenDesign') or 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign'  # a local folder, or the Hugging Face id
spec = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2].rstrip('/\\') + '/'
os.makedirs(out, exist_ok=True)

from qwen_tts import Qwen3TTSModel  # noqa: E402

t0 = time.time()
model = Qwen3TTSModel.from_pretrained(MODEL, device_map='cuda:0', dtype=torch.bfloat16)
print(f'>> model ready in {time.time() - t0:.0f}s | VRAM {torch.cuda.memory_allocated() / 2**30:.2f} GB', flush=True)

takes = []
for d in spec['directions']:
    for k, seed in enumerate(spec['seeds']):
        tid = d['id'] + 'ABCDEF'[k]
        wav = out + tid + '.wav'
        if not os.path.exists(wav):
            torch.manual_seed(seed); torch.cuda.manual_seed_all(seed); np.random.seed(seed)
            t1 = time.time()
            wavs, sr = model.generate_voice_design(text=d.get('text', spec['text']), language='Chinese', instruct=d['instruct'])
            y = np.asarray(wavs[0], dtype=np.float32)
            sf.write(wav, y / (np.abs(y).max() + 1e-9) * 0.8, sr)
            print(f"-- {tid} {d['name']} seed {seed}: {len(y) / sr:.1f}s in {time.time() - t1:.0f}s", flush=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-b:a', '96k', wav[:-4] + '.mp3'], check=True)
        takes.append(dict(id=tid, direction=d['id'], name=d['name'], instruct=d['instruct'], seed=seed, sec=round(sf.info(wav).duration, 1)))
json.dump(dict(text=spec['text'], takes=takes), open(out + 'takes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'>> peak VRAM {torch.cuda.max_memory_allocated() / 2**30:.2f} GB')

cards = []
for d in spec['directions']:
    rows = ''.join(f'''<div class="take"><b>{t['id']}</b><audio controls preload="none" src="data:audio/mpeg;base64,{base64.b64encode(open(out + t['id'] + '.mp3', 'rb').read()).decode()}"></audio></div>'''
                   for t in takes if t['direction'] == d['id'])
    cards.append(f'''<article class="card"><header><span class="num">{d['id']}</span><span class="name">{d['name']}</span></header><p class="desc">{d['instruct']}</p>{rows}</article>''')
html = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>声音设计</title><style>
:root{{--bg:#F2EEE8;--ink:#111112;--mute:#6b6862;--line:#d9d3c9;--card:#fbf9f5;--accent:#D81B5C}}
@media (prefers-color-scheme:dark){{:root{{--bg:#111112;--ink:#F2EEE8;--mute:#a09c94;--line:#2c2c2e;--card:#1a1a1c;--accent:#FF3D72}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,"Microsoft YaHei",sans-serif}}
main{{max-width:980px;margin:0 auto;padding:24px 16px 56px}}h1{{font-size:22px;margin:0 0 6px}}.lead{{color:var(--mute);margin:0 0 6px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:18px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0}}
.card header{{display:flex;align-items:baseline;gap:10px}}.num{{font-weight:700;font-size:20px;color:var(--accent)}}.name{{font-weight:600}}
.desc{{color:var(--mute);font-size:13px;margin:6px 0 10px}}.take{{display:flex;align-items:center;gap:10px;margin-top:8px}}.take b{{width:26px;flex:none}}
audio{{flex:1;min-width:0;height:36px}}.said{{border-left:3px solid var(--line);padding-left:10px;color:var(--mute);font-size:13px;margin:12px 0 0}}
</style></head><body><main>
<h1>声音设计</h1>
<p class="lead">这些声音是按文字描述生成的，不属于任何真人。每个方向出了 {len(spec['seeds'])} 条，同一句描述每次生成的声音都不一样。</p>
<p class="lead">看中哪条报编号（比如 3B）。想改方向也可以直接说，比如「1A 再低一点、再懒一点」。</p>
<p class="said">念的是：{spec['text']}</p>
<div class="grid">{''.join(cards)}</div></main></body></html>'''
open(out + 'index.html', 'w', encoding='utf-8', newline='\n').write(html)
print('>>', out + 'index.html', round(os.path.getsize(out + 'index.html') / 1e6, 2), 'MB')
