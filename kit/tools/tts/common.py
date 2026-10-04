"""Shared by the voice tools: the project's settings, the lines file, and text clean-up before synthesis.

Settings come from video.config.json in the project root (see video.config.example.json), key "tts":
  qwenBase / qwenDesign   local model folders (or leave out to load the Hugging Face ids)
  hfHome, whisperCache    cache folders
  pronounce               [[regex, replacement], …] applied to a line before it is read aloud
  aliases                 [[regex, replacement], …] spellings Whisper produces for your own names (used when checking)"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
_cfg = os.path.join(ROOT, 'video.config.json')
CFG = (json.load(open(_cfg, encoding='utf-8')).get('tts', {}) if os.path.exists(_cfg) else {})
if CFG.get('hfHome'):
    os.environ.setdefault('HF_HOME', CFG['hfHome'])

# brackets and quote marks are for the subtitles only; read aloud they turn into stray sounds
PRONOUNCE = [(r'[（）()]', ''), (r'[「」『』《》]', ''), (r'\s*[～~]+\s*$', '。'), (r'\s*[～~]+', '，')] + [tuple(x) for x in CFG.get('pronounce', [])]


def read_lines(path):
    """[(id, text)] from a reel's lines.js (`['L01', 500, '…']` rows) or from a plain `ID|text` file.
    The first letter of an id is the voice (L01, S01 …)."""
    if path.endswith('.js'):
        js = open(path, encoding='utf-8').read()
        rows = re.findall(r"\[\s*'([A-Za-z]+\d+)'\s*,\s*-?\d+\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]", js)
        return [(cid, text.replace("\\'", "'")) for cid, text in rows]
    out = []
    for raw in open(path, encoding='utf-8'):
        raw = raw.strip()
        if '|' in raw and not raw.startswith('#'):
            cid, text = raw.split('|', 1)
            out.append((cid.strip(), text.strip()))
    return out


def tts_text(text):
    t = text
    for pat, rep in PRONOUNCE:
        t = re.sub(pat, rep, t)
    t = re.sub(r'[「」『』“”《》]', '', t)  # quote marks and title marks stay on screen only: read aloud they come out as odd noises
    t = re.sub(r'(?<=[一-鿿])\s+(?=[一-鿿])', '', t)  # no spaces between Chinese characters
    t = re.sub(r'\s+(?=[，。！？；：、」）])', '', t)
    return t.strip()
