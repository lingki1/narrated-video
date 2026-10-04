"""Measure a script against the block-writing numbers (the skill's references/writing.md, part 2):
sentence length, clause length, share of short sentences, how often another voice cuts in, how often the viewer is addressed.

usage: python tools/tts/script_measure.py videos/<reel>/lines.js        (or a plain `ID|text` file)"""
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import read_lines  # noqa: E402

lines = read_lines(sys.argv[1])
text = ''.join(t for _, t in lines)
han = lambda x: len(re.findall(r'[一-鿿A-Za-z0-9]', x))
sents = [x for x in re.split(r'[。？！]', text) if han(x)]
clauses = [x for x in re.split(r'[，。？！：；、]', text) if han(x)]
narrator = lines[0][0][0]
others = sum(1 for i, _ in lines if i[0] != narrator)
short = sum(han(x) <= 8 for x in sents) / len(sents) * 100
print(f'字数 {han(text)}（按每分钟 230–270 字估，约 {han(text) / 250:.1f} 分钟）')
print(f'句均 {han(text) / len(sents):.1f} 字（目标 20–30）｜8 字以内的句子 {short:.0f}%（目标 ≤15%）｜逗号间小句 {han(text) / len(clauses):.1f} 字（目标 ≥7）')
print(f'别的声音开口 {others} 次（目标 ≤3）｜「你」出现 {text.count("你")} 处（对观众说的至少要有 2 处，角色之间互称的不算）')
