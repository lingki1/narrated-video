"""完播自检扫描：逐秒截图找「画面不动」的段落，读时间轴算开口时间 / 章节长度 / 片尾长度 / 平台时长，出一份 markdown 报告。
可选：在指定帧上叠平台遮挡区（估计值），拼图检查字幕和关键画面有没有被挡。

usage:
  python tools/retention_scan.py <reel>                      # 渲染逐秒截图 + 报告
  python tools/retention_scan.py <reel> --no-render          # 复用上次的截图
  python tools/retention_scan.py <reel> --safe 6500,120000   # 另出遮挡区拼图
  options: --root <project folder, default: the folder above tools/>  --step 1000  --crop-bottom 0.22  --static 1.2

前提：先跑过 `node render.mjs videos/<name> --sound-only`（会写 videos/<name>/out/<name>.timeline.json）。
输出：videos/<name>/out/scan/（截图、report.md、safe.png）。阈值是我们自己的标准，平台规则见技能的 references/selfcheck.md。
"""
import json
import os
import shutil
import statistics
import subprocess
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

# 平台遮挡区（1080×1920，经验估计，不是官方数值；发布前以真机预览为准）
SAFE = {
    'IG': [(0, 0, 1080, 220), (0, 1500, 1080, 1920), (940, 1000, 1080, 1800)],
    '小红书': [(0, 0, 1080, 200), (0, 1560, 1080, 1920), (950, 900, 1080, 1600)],
}


def opt(name, fallback):
    return sys.argv[sys.argv.index(f'--{name}') + 1] if f'--{name}' in sys.argv else fallback


def fmt(ms):
    s = ms / 1000
    return f'{int(s // 60)}:{s % 60:04.1f}'


def main():
    name = sys.argv[1]
    promo = opt('root', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')))
    step = int(opt('step', 1000))
    crop_bottom = float(opt('crop-bottom', 0.22))
    static_th = float(opt('static', 1.2))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from paths import out_dir as film_out, reel_rel
    out_dir = film_out(name, 'scan')
    os.makedirs(out_dir, exist_ok=True)
    tl_file = film_out(name, f'{name}.timeline.json')
    if not os.path.exists(tl_file):
        sys.exit(f'缺 {tl_file}：先跑 node render.mjs {reel_rel(name)} --sound-only')
    tl = json.load(open(tl_file, encoding='utf-8'))
    dur = tl['duration']
    ts = list(range(step // 2, int(dur), step))
    shot = lambda t: os.path.join(out_dir, f'{t:06d}.png')

    if '--no-render' not in sys.argv:
        subprocess.run(['node', os.path.join(promo, 'render.mjs'), reel_rel(name), '--stills', ','.join(map(str, ts))],
                       check=True, cwd=promo, stdout=subprocess.DEVNULL)
        for t in ts:
            src = film_out(name, 'stills', f'{name}-{t:05d}.png')
            if os.path.exists(src):
                shutil.move(src, shot(t))

    # 1. static stretches (subtitle band cropped so talking alone does not count as motion)
    prev = None; diffs = []
    for t in ts:
        if not os.path.exists(shot(t)):
            continue
        im = Image.open(shot(t)).convert('L').resize((108, 192))
        im = im.crop((0, 0, 108, int(192 * (1 - crop_bottom))))
        if prev is not None:
            diffs.append((t, ImageStat.Stat(ImageChops.difference(im, prev[1])).mean[0]))
        prev = (t, im)
    runs = []; run = []
    for t, d in diffs + [(None, 99)]:
        if d < static_th:
            run.append(t)
        else:
            if len(run) * step >= 4000:
                runs.append((run[0] - step, run[-1]))
            run = []

    # 2. timeline facts
    vo = sorted(tl.get('vo', []), key=lambda v: v['at'])
    first_vo = vo[0]['at'] if vo else None
    last_vo_end = max((v['at'] + v['dur'] for v in vo), default=0)
    end_card = tl.get('end', dur)
    chapters = tl.get('chapters', [])
    ch_len = [(i + 1, a, (chapters[i + 1] if i + 1 < len(chapters) else end_card) - a) for i, a in enumerate(chapters)]
    gaps = [(vo[i - 1]['id'], vo[i]['id'], vo[i]['at'] - (vo[i - 1]['at'] + vo[i - 1]['dur'])) for i in range(1, len(vo))]
    gaps = [g for g in gaps if g[2] > 1500]

    def line_at(t):
        for v in vo:
            if v['at'] - 300 <= t < v['at'] + v['dur'] + 300:
                return v['id']
        return '—'

    flag = lambda ok: '✅' if ok else '❌'
    L = [f'# 完播自检扫描 · {name}', '',
         f'全片 {fmt(dur)}；逐秒截图 {len(diffs) + 1} 帧；静止阈值 {static_th}（裁掉底部 {int(crop_bottom * 100)}% 字幕带）。', '',
         '## 硬指标（我们的标准）', '', '| 项 | 标准 | 实测 | |', '|---|---|---|---|']
    if first_vo is not None:
        L.append(f'| 第一句配音开口 | ≤ 0.5 s | {first_vo / 1000:.1f} s | {flag(first_vo <= 500)} |')
    early = [r for r in runs if r[0] < 30000]
    L.append(f'| 前 30 秒静止段（≥ 4 s） | 0 段 | {len(early)} 段 | {flag(not early)} |')
    long_runs = [r for r in runs if r[1] - r[0] >= 8000]
    L.append(f'| 全片 ≥ 8 s 静止段 | 0 段 | {len(long_runs)} 段 | {flag(not long_runs)} |')
    tail = dur - last_vo_end
    L.append(f'| 最后一句配音后还剩 | ≤ 4 s | {tail / 1000:.1f} s | {flag(tail <= 4000)} |')
    if ch_len:
        longest = max(ch_len, key=lambda c: c[2])
        L.append(f'| 最长一章 | ≤ 60 s（超了要有章内反转） | 第 {longest[0]} 章 {longest[2] / 1000:.0f} s | {flag(longest[2] <= 60000)} |')
    L.append(f'| IG 推荐给新受众 | ≤ 3:00 | {fmt(dur)} | {flag(dur <= 180000)} |')
    L.append(f'| 小红书中长视频扶持 | ≥ 2:00（短片不适用） | {fmt(dur)} | {"✅" if dur >= 120000 else "—"} |')
    L += ['', '## 静止段（≥ 4 s）', '']
    L += [f'- {fmt(a)}–{fmt(b)}（{(b - a) / 1000:.0f} s）· 台词 {line_at(a)}→{line_at(b)}' for a, b in runs] or ['- 无']
    if ch_len:
        L += ['', '## 章节长度', ''] + [f'- 第 {n} 章 {fmt(a)} 起，{d / 1000:.0f} s' for n, a, d in ch_len]
    if gaps:
        L += ['', '## 台词间隔 > 1.5 s', ''] + [f'- {a}→{b} 空 {g / 1000:.1f} s' for a, b, g in gaps]
    L += ['', f'（相邻帧差中位数 {statistics.median(d for _, d in diffs):.2f}）', '',
          '人工项（开头反差、开放循环、收藏点、分享句、结尾提问、封面标题、AI 内容声明）按技能 references/selfcheck.md 的清单逐条过。']
    report = '\n'.join(L) + '\n'
    open(os.path.join(out_dir, 'report.md'), 'w', encoding='utf-8', newline='\n').write(report)
    print(report)

    # 3. optional safe-zone sheet
    safe = opt('safe', None)
    if safe:
        frames = [int(x) for x in safe.split(',')]
        w, h = 360, 640
        sheet = Image.new('RGB', (len(frames) * 2 * w, h + 26), (40, 40, 40))
        d = ImageDraw.Draw(sheet)
        try:
            font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 16)  # CJK labels
        except OSError:
            font = ImageFont.load_default()
        for i, t in enumerate(frames):
            src = shot(min(ts, key=lambda x: abs(x - t)))
            for j, (plat, boxes) in enumerate(SAFE.items()):
                im = Image.open(src).convert('RGBA')
                ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
                for b in boxes:
                    od.rectangle(b, fill=(255, 0, 0, 90), outline=(255, 0, 0, 255), width=4)
                im = Image.alpha_composite(im, ov).convert('RGB').resize((w, h))
                x = (i * 2 + j) * w
                sheet.paste(im, (x, 26)); d.text((x + 6, 3), f'{fmt(t)} · {plat}（估计）', fill=(255, 255, 255), font=font)
        path = os.path.join(out_dir, 'safe.png')
        sheet.save(path)
        print(path)


if __name__ == '__main__':
    main()
