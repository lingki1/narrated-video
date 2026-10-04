"""Set up a video project from the kit that ships with this skill.

usage: python new_project.py <project folder> [--update]
Copies kit/ (renderer, engine, tools, template) into the folder and creates PROFILE.md, videos/ (one folder per film: scene code, vo/, docs/, out/) and assets/voice-ref/.
An existing project is left alone unless --update is given; --update refreshes render.mjs, lib/, tools/ and templates/ only
(your videos, assets, PROFILE.md, voices.json and video.config.json are never touched)."""
import os
import shutil
import sys

KIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kit')
if len(sys.argv) < 2:
    sys.exit(__doc__)
dst = os.path.abspath(sys.argv[1])
update = '--update' in sys.argv
fresh = not os.path.exists(os.path.join(dst, 'render.mjs'))
if not fresh and not update:
    sys.exit(f'{dst} already has a project. Use --update to refresh the engine and tools.')
os.makedirs(dst, exist_ok=True)
for name in ('render.mjs', 'README.md', 'video.config.example.json', 'voices.example.json'):
    shutil.copy(os.path.join(KIT, name), os.path.join(dst, name))
for folder in ('lib', 'tools', 'templates'):
    shutil.copytree(os.path.join(KIT, folder), os.path.join(dst, folder), dirs_exist_ok=True, ignore=shutil.ignore_patterns('__pycache__'))
for folder in ('videos', 'assets/voice-ref'):
    os.makedirs(os.path.join(dst, folder), exist_ok=True)
if not os.path.exists(os.path.join(dst, 'PROFILE.md')):
    shutil.copy(os.path.join(KIT, 'PROFILE.template.md'), os.path.join(dst, 'PROFILE.md'))
print(('created ' if fresh else 'updated ') + dst)
if fresh:
    print('next: fill in PROFILE.md; copy video.config.example.json → video.config.json and voices.example.json → voices.json; then python tools/new_reel.py <name> "标题"')
