"""Maintainer tool: (re)write kit/templates/<name>/index.html and an empty style.css for every template listed below."""
import io
import os

KIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kit')
TEMPLATES = ['board', 'picture', 'doodle', 'kinetic', 'chat', 'comic', 'notes', 'cards', 'data', 'vn', 'letter', 'screen', 'timeline', 'mindmap', 'split', 'podcast']
PAGE = '''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover">
<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@500;700;800;900&display=block" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;800;900&family=Noto+Serif+SC:wght@700;900&family=Ma+Shan+Zheng&display=block" rel="stylesheet">
<link rel="stylesheet" href="../../lib/film.css">
<link rel="stylesheet" href="../../lib/templates/%s.css">
<link rel="stylesheet" href="./style.css">
</head>
<body>
<div id="viewport"></div>
<script type="module" src="./scene.js"></script>
</body>
</html>
'''
STYLE = "/* This film's own pieces. The stage and the common pieces come from lib/film.css and lib/templates/%s.css;\n   colours are the theme variables (--ink --paper --accent --accent-deep --night --mute). Prefix your classes so nothing collides. */\n"
for name in TEMPLATES:
    d = os.path.join(KIT, 'templates', name)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='\n').write(PAGE % name)
    p = os.path.join(d, 'style.css')
    if not os.path.exists(p) or name != 'board':
        io.open(p, 'w', encoding='utf-8', newline='\n').write(STYLE % name)
print('index.html written for', ', '.join(TEMPLATES))
