"""Start a new reel from one of the picture templates.

usage: python tools/new_reel.py <name> ["标题"] [--template board]
       python tools/new_reel.py --list
e.g.   python tools/new_reel.py 01-keep-warm "保温" --template picture

Creates videos/<name>/ (index.html, style.css, lines.js, scene.js, vo.py, sound.py, vo-d.js, cover.html, cover.js) with vo/ docs/ out/ in it.
Every template's starter is a tiny working film: it renders as it is, with estimated timing, before any audio exists.
Which template for which kind of film: the skill's references/templates.md."""
import os
import re
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TPL = os.path.join(ROOT, 'templates')
names = sorted(d for d in os.listdir(TPL) if not d.startswith('_') and os.path.isdir(os.path.join(TPL, d)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if '--list' in sys.argv:
    for n in names:
        first = open(os.path.join(TPL, n, 'scene.js'), encoding='utf-8').readline().strip().lstrip('/ ')
        print(f'{n:10s} {first}')
    sys.exit(0)
template = 'board'
if '--template' in sys.argv:
    template = sys.argv[sys.argv.index('--template') + 1]
    args = [a for a in args if a != template]
if not args or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', args[0]):
    sys.exit('usage: python tools/new_reel.py <name: letters, digits, - and _> ["title"] [--template <one of: ' + ', '.join(names) + '>]')
if template not in names:
    sys.exit(f'no template "{template}". Available: ' + ', '.join(names))
name = args[0]
title = args[1] if len(args) > 1 else name
dst = os.path.join(ROOT, 'videos', name)
if os.path.exists(dst):
    sys.exit(f'videos/{name} already exists')
shutil.copytree(os.path.join(TPL, '_common'), dst)
shutil.copytree(os.path.join(TPL, template), dst, dirs_exist_ok=True)
for f in ('index.html', 'scene.js'):
    p = os.path.join(dst, f)
    s = open(p, encoding='utf-8').read().replace('__TITLE__', title)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)
for sub in ('vo', 'docs', 'out'):
    os.makedirs(os.path.join(dst, sub), exist_ok=True)
print(f'videos/{name} created from template "{template}". Next: write videos/{name}/docs/{name}.md and videos/{name}/lines.js, then')
print(f'  python tools/tts/script_measure.py videos/{name}/lines.js')
print(f'  node render.mjs videos/{name} --stills 0,3000')
