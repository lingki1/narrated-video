"""Whisper QA for generated voice-over lines: does each wav really say the script? (I can't listen; Whisper can.)

  python tools/tts/vo_qa.py <lines.txt> <wav_dir> [--only C01,C12] [--tones <配音稿.md>] [--model turbo] [--thr 0.08]
Reads C01.wav… (or C01.tN.wav with --take N), transcribes with Whisper, compares with the script at PINYIN level (toneless, so
homophones like 它/他 don't count; Latin letters stay letters; digits → Chinese numerals; name spellings from the config unified) and writes qa-report.md next to the audio.
Flags: CER over --thr, clipping, long leading/trailing silence, a long pause inside a line, duration far from the 估时 in the table.
"""
import argparse
import os
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CFG, read_lines  # noqa: E402


def canon(s):
    """Text -> [(token, shown)]. Chinese characters become toneless pinyin, so the homophones Whisper picks
    (它/他, 托/拖, 依恋/一链, 知心/知新) compare equal, while a really misread syllable still differs.
    Latin letters stay letters, so a mispronounced English word (show -> 兽) shows up."""
    import cn2an
    from pypinyin import Style, lazy_pinyin
    s = unicodedata.normalize('NFKC', s).lower()
    for pat, rep in CFG.get('aliases', []):  # spellings Whisper uses for your own names, e.g. ["brandname|brand name|布兰德", "品牌名"]
        s = re.sub(pat, rep, s)
    if re.search(r'\d', s):
        try:
            s = cn2an.transform(s, 'an2cn')
        except Exception:
            pass
    s = re.sub(r'[^一-鿿a-z]', '', s)
    out = []
    for m in re.finditer(r'[一-鿿]+|[a-z]', s):
        run = m.group(0)
        if '一' <= run[0] <= '鿿':
            out.extend(zip(lazy_pinyin(run, style=Style.NORMAL), run))
        else:
            out.append((run, run))
    return out


def edit_ops(ref, hyp):
    """Levenshtein distance on tokens + a short human-readable list of what differs."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1][0] != hyp[j - 1][0]))
    i, j, ops, same = n, m, [], []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (ref[i - 1][0] != hyp[j - 1][0]):
            if ref[i - 1][0] != hyp[j - 1][0]:
                ops.append(f'{ref[i - 1][1]}({ref[i - 1][0]})→{hyp[j - 1][1]}({hyp[j - 1][0]})')
            elif ref[i - 1][1] != hyp[j - 1][1]:
                same.append((ref[i - 1][1], hyp[j - 1][1]))
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            ops.append(f'漏{ref[i - 1][1]}')
            i -= 1
        else:
            ops.append(f'多{hyp[j - 1][1]}')
            j -= 1
    return d[n][m], ops[::-1], same[::-1]


POLY = set('重行长还调传弹朝藏差处倒都分干更冠号几假间将降角教结解尽觉卷空乐累量落没模难泊曲圈塞散少舍省盛数帖吐为鲜相兴咽要应载着正中种转作')


def polyphone_hints(same):
    """Where Whisper wrote a different character with the 'same' pinyin, and the script character has more than one
    reading of which the heard character shares exactly one: the voice may have picked the other reading (重来 read zhòng
    comes back as 中来, and a toneless comparison calls that a match). Only a hint — look at each one."""
    from pypinyin import Style, pinyin
    out = []
    for ref, hyp in same:
        if ref not in POLY:   # pypinyin lists rare readings for half the dictionary; only the everyday polyphones are worth a look
            continue
        rs = set(pinyin(ref, style=Style.NORMAL, heteronym=True)[0])
        rh = set(pinyin(hyp, style=Style.NORMAL, heteronym=True)[0])
        if len(rs) > 1 and len(rs & rh) == 1:
            out.append(f'{ref}→{hyp}（{next(iter(rs & rh))}）')
    return out


def audio_stats(path):
    import numpy as np
    import soundfile as sf
    x, sr = sf.read(path)
    if x.ndim > 1:
        x = x.mean(axis=1)
    hop = int(sr * 0.01)
    r = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    db = 20 * np.log10(r + 1e-9)
    loud = np.where(db > db.max() - 35)[0]
    lead = loud[0] * 0.01 if len(loud) else 0
    trail = (len(db) - loud[-1] - 1) * 0.01 if len(loud) else 0
    quiet = db < db.max() - 35
    longest, cur = 0, 0
    for k in range(loud[0] if len(loud) else 0, (loud[-1] + 1) if len(loud) else 0):
        cur = cur + 1 if quiet[k] else 0
        longest = max(longest, cur)
    hot = np.abs(x) >= 0.999
    run = mx = 0
    for h in hot:
        run = run + 1 if h else 0
        mx = max(mx, run)
    return dict(dur=len(x) / sr, peak=float(np.abs(x).max()), lead=lead, trail=trail, pause=longest * 0.01, clip_n=int(hot.sum()), clip_run=mx)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('dir')
    ap.add_argument('--only')
    ap.add_argument('--take', type=int, default=1)
    ap.add_argument('--tones')
    ap.add_argument('--model', default='turbo')
    ap.add_argument('--thr', type=float, default=0.08)
    a = ap.parse_args()

    import torch
    import whisper

    lines = read_lines(a.lines)
    est = {}
    if a.tones:
        for raw in open(a.tones, encoding='utf-8'):
            m = re.match(r'^\|\s*([CL]\d+)\s*\|.+\|\s*([\d.]+)\s*s\s*\|\s*$', raw)
            if m:
                est[m.group(1)] = float(m.group(2))
    only = set(a.only.split(',')) if a.only else None
    model = whisper.load_model(a.model, device='cuda', download_root=CFG.get('whisperCache'))
    rows, bad = [], 0
    for cid, text in lines:
        if only and cid not in only:
            continue
        wav = os.path.join(a.dir, f'{cid}.wav' if a.take == 1 else f'{cid}.t{a.take}.wav')
        if not os.path.exists(wav):
            continue
        r = model.transcribe(wav, language='zh', initial_prompt='以下是普通话的句子，使用简体中文。', temperature=0,
                             condition_on_previous_text=False, fp16=True)
        hyp = r['text'].strip()
        ref_c, hyp_c = canon(text), canon(hyp)
        dist, ops, same = edit_ops(ref_c, hyp_c)
        poly = polyphone_hints(same)
        cer = dist / max(1, len(ref_c))
        st = audio_stats(wav)
        flags = []
        if cer > a.thr or dist >= 3:   # short lines: three wrong characters is already obvious even if the % looks small
            flags.append(f'CER {cer:.0%}（错 {dist} 字）')
        if st['clip_n'] > 20 or st['clip_run'] > 3:   # a couple of full-scale samples are inaudible; a run of 4+ is distortion
            flags.append(f"削波 {st['clip_n']} 点（最长连续 {st['clip_run']}）")
        if st['lead'] > 0.5:
            flags.append(f"开头静音 {st['lead']:.1f}s")
        if st['trail'] > 0.9:
            flags.append(f"结尾静音 {st['trail']:.1f}s")
        if st['pause'] > 1.3:
            flags.append(f"句中停顿 {st['pause']:.1f}s")
        if poly:
            flags.append('多音字待查 ' + ' '.join(poly))
        if cid in est and not (0.55 <= st['dur'] / est[cid] <= 1.7):
            flags.append(f"时长 {st['dur']:.1f}s（估 {est[cid]:.1f}s）")
        bad += bool(flags)
        rows.append((cid, st['dur'], cer, hyp, ops, flags))
        print(f"{cid} {st['dur']:5.1f}s CER {cer:4.0%} {'⚠ ' + '；'.join(flags) if flags else 'ok'}" + (f"\n     听到：{hyp}\n     差异：{' '.join(ops[:14])}" if flags else ''))
    out = os.path.join(a.dir, 'qa-report.md')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(f'# 配音质检（Whisper {a.model}）\n\n共 {len(rows)} 句，{bad} 句需要留意。CER = 与台词的字错率（只比汉字和字母；数字统一成汉字）。\n\n')
        f.write('| 编号 | 时长 | CER | 状态 | Whisper 听到的 | 差异 |\n|---|---|---|---|---|---|\n')
        for cid, dur, cer, hyp, ops, flags in rows:
            f.write(f"| {cid} | {dur:.1f}s | {cer:.0%} | {'；'.join(flags) if flags else 'ok'} | {hyp} | {' '.join(ops[:14])} |\n")
    print(f'>> {len(rows)} lines checked, {bad} flagged → {out}')


if __name__ == '__main__':
    main()
