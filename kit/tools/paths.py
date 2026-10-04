"""Where things are. A film is one folder: <project>/videos/<name>/ holds its scene code, and in it
vo/ (one wav per line), docs/ (script, notes, publish kit, research), out/ (soundtrack, film, stills, covers, preview package),
archive/ (kept versions). Template samples live the same way in <project>/samples/<name>/."""
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
HOMES = ('videos', 'samples')


def reel_rel(name):
    """the film's folder relative to the project root, with forward slashes: videos/<name> (or samples/<name>)"""
    name = name.replace('\\', '/').strip('/').split('/')[-1]
    for h in HOMES:
        if os.path.isdir(os.path.join(ROOT, h, name)):
            return f'{h}/{name}'
    return f'{HOMES[0]}/{name}'


def reel_dir(name):
    return os.path.join(ROOT, *reel_rel(name).split('/'))


def vo_dir(name):
    return os.path.join(reel_dir(name), 'vo')


def out_dir(name, *more):
    return os.path.join(reel_dir(name), 'out', *more)
