"""Contact sheet of rendered stills (4 columns of 360×640 cells, or 3 of 640×360 for a wide film; file name on top) — for checking many frames at once.

usage: python contact_sheet.py <out.png> <still1.png> <still2.png> ...
Render the stills first: node render.mjs videos/<name> --stills 1500,12000,...  (they land in videos/<name>/out/stills/)
"""
import sys

from PIL import Image, ImageDraw


def main():
    out, files = sys.argv[1], sys.argv[2:]
    wide = Image.open(files[0]).size[0] > Image.open(files[0]).size[1]   # a wide film gets 3 wide cells per row
    cols, w, h = (3, 640, 360) if wide else (4, 360, 640)
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * (h + 26)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
        x = (i % cols) * w; y = (i // cols) * (h + 26)
        sheet.paste(im, (x, y + 26)); d.text((x + 6, y + 6), f.replace('\\', '/').split('/')[-1], fill=(255, 255, 255))
    sheet.save(out)
    print(out)


if __name__ == '__main__':
    main()
