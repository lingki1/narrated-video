"""See a cover the way it will be seen: small, in a row of others, in grey, and blurred.

  python tools/cover_check.py <reel>                 a check sheet per cover → videos/<reel>/out/cover/_check-<cover>.png, plus _lineup.png
  python tools/cover_check.py <reel> --only a,b

The check sheet for one cover:
  the wide cover at the sizes a feed shows it (480, 320, 168 px wide) on a light and on a dark page;
  the same at 320 px in grey (does it still read without colour?) and blurred (the squint test: what is left is the hierarchy);
  the tall crop, if there is one, at grid-tile size (240 px wide).
The lineup puts every cover side by side at 320 px, light and dark — the one the eye goes to first is doing its job.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LIGHT, DARK, INK = (255, 255, 255), (15, 15, 15), (120, 120, 120)

def font(size):
    for f in ('msyh.ttc', 'NotoSansSC-Regular.otf', 'arial.ttf'):
        try: return ImageFont.truetype(f, size)
        except OSError: pass
    return ImageFont.load_default()

def fit(im, w): return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

def strip(im, frac, text):
    """what a feed card lays over the bottom of a cover: a dark fade with counts on it (B 站: about 28% of the height)"""
    im = im.copy().convert('RGBA'); w, h = im.size; n = round(h * frac); fade = Image.new('RGBA', (w, n))
    for y in range(n): ImageDraw.Draw(fade).line([(0, y), (w, y)], fill=(0, 0, 0, round(190 * (y / max(1, n - 1)) ** 0.8)))
    im.alpha_composite(fade, (0, h - n)); d = ImageDraw.Draw(im); f = font(max(10, round(h * 0.075)))
    d.text((round(w * 0.03), h - round(h * 0.115)), text[0], fill=(255, 255, 255, 255), font=f); tw = d.textlength(text[1], font=f)
    d.text((w - round(w * 0.03) - tw, h - round(h * 0.115)), text[1], fill=(255, 255, 255, 255), font=f)
    return im.convert('RGB')

def badge(im, text='12:24'):
    """YouTube's duration badge, bottom-right"""
    im = im.copy(); d = ImageDraw.Draw(im); w, h = im.size; f = font(max(9, round(h * 0.07))); tw = d.textlength(text, font=f); bh = round(h * 0.1); pad = round(h * 0.025)
    d.rounded_rectangle([w - tw - pad * 3, h - bh - pad, w - pad, h - pad], radius=3, fill=(0, 0, 0)); d.text((w - tw - pad * 2, h - bh - pad + bh * 0.12), text, fill=(255, 255, 255), font=f)
    return im

def row(items, bgc, pad=24, label_h=26):
    """items: [(label, image)] → one strip on a page colour"""
    h = max(i.height for _, i in items) + pad * 2 + label_h; w = sum(i.width for _, i in items) + pad * (len(items) + 1)
    strip = Image.new('RGB', (w, h), bgc); d = ImageDraw.Draw(strip); x = pad
    for label, im in items:
        strip.paste(im, (x, pad)); d.text((x, pad + im.height + 4), label, fill=INK, font=font(16)); x += im.width + pad
    return strip

def stack(strips, bgc=(40, 40, 40)):
    w = max(s.width for s in strips); h = sum(s.height for s in strips) + 8 * (len(strips) - 1)
    sheet = Image.new('RGB', (w, h), bgc); y = 0
    for s in strips: sheet.paste(s, (0, y)); y += s.height + 8
    return sheet

def main():
    args = sys.argv[1:]; reel = next(a for a in args if not a.startswith('--'))
    only = args[args.index('--only') + 1].split(',') if '--only' in args else None
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from paths import out_dir
    d = out_dir(reel, 'cover')
    wides = sorted(f for f in os.listdir(d) if f.endswith('-wide.png') and not f.startswith('_'))
    ids = [f[:-len('-wide.png')] for f in wides]; ids = [i for i in ids if not only or i in only]
    for i in ids:
        wide = Image.open(os.path.join(d, f'{i}-wide.png')).convert('RGB'); strips = []
        sizes = [(480, '480 px · 电脑首页'), (320, '320 px · 手机信息流'), (168, '168 px · 侧栏 / 搜索小图')]
        for bgc in (LIGHT, DARK): strips.append(row([(lab, fit(wide, w)) for w, lab in sizes], bgc))
        strips.append(row([('B 站首页卡：底部 28% 是信息条', strip(fit(wide, 360), 0.28, ('▶ 12.3万  ≡ 456', '12:24'))), ('B 站手机双列 173 px', strip(fit(wide, 173), 0.28, ('▶ 12万', '12:24'))),
                           ('YouTube：右下时长', badge(fit(wide, 320))), ('YouTube 侧栏 168 px', badge(fit(wide, 168)))], LIGHT))
        small = fit(wide, 320)
        strips.append(row([('灰度：没有颜色还读得出吗', ImageOps.grayscale(small).convert('RGB')), ('模糊：眯眼只剩层级', small.filter(ImageFilter.GaussianBlur(5))), ('极小 120 px', fit(wide, 120))], LIGHT))
        tall = os.path.join(d, f'{i}-tall.png')
        if os.path.exists(tall):
            t = Image.open(tall).convert('RGB')
            sq = t.crop((0, (t.height - t.width) // 2, t.width, (t.height + t.width) // 2))
            strips.append(row([('3:4 · 作品网格 240 px（底部是播放量）', strip(fit(t, 240), 0.10, ('▷ 1.2万', ''))), ('3:4 · 120 px', fit(t, 120)), ('主页裁成 1:1 时', fit(sq, 200)), ('3:4 灰度', ImageOps.grayscale(fit(t, 240)).convert('RGB'))], LIGHT))
        out = os.path.join(d, f'_check-{i}.png'); stack(strips).save(out); print(out)
    if len(ids) > 1:
        imgs = [(i, fit(Image.open(os.path.join(d, f'{i}-wide.png')).convert('RGB'), 320)) for i in ids]
        out = os.path.join(d, '_lineup.png'); stack([row(imgs, LIGHT), row(imgs, DARK)]).save(out); print(out)

if __name__ == '__main__':
    main()
