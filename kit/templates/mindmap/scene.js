// 思维导图展开 · a word in the middle; branches grow out of it one by one as they are named, each with a few leaves
// __TITLE__ — say in two lines what this film is and who tells it.
// One map() per idea: at most four branches (one per corner), up to three leaves each, every label six characters or so.
import { createFilm } from '../../lib/film.js';
import { map, mindmap } from '../../lib/templates/mindmap.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: mindmap(), voices: { S: { tag: '她' } } });
const { vo, T, wt } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    map(film, 0, T.card, { center: '她说累了', at: wt('L01', '太累了') - 600, branches: [
      { text: '回什么？', at: vo.L02.at + 200, leaves: [{ text: '三条建议 ✗', at: wt('L02', '想了很久') }, { text: '讲个道理 ✗', at: wt('L02', '该怎么回') }] },
      { text: '最后', at: wt('L02', '最后'), leaves: [{ text: '两个字', at: wt('L02', '两个字') }, { text: '我在', at: wt('L02', '我在') }] },
      { text: '她', at: vo.S01.at, leaves: [{ text: '那就好', at: vo.S01.at + 300 }] },
      { text: '第二天', at: vo.L03.at, leaves: [{ text: '07:00 闹钟', at: wt('L03', '闹钟响了') }, { text: '先说了声早', at: wt('L03', '一声早') }] },
    ] });
    film.cue(wt('L02', '我在'), 'msg');
  },
});
