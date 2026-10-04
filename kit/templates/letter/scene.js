// 信纸 / 日记手写 · the narration writes itself on lined paper, character by character; almost nothing else on screen
// __TITLE__ — say in two lines what this film is and who tells it.
// The template builds everything from lines.js. build() is only for small margin drawings, if any.
import { createFilm } from '../../lib/film.js';
import { letter } from '../../lib/templates/letter.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({
  lines: LINES, durations: D,
  template: letter({ date: '10 月 8 日 · 晴', underline: ['我在', '一声早'] }),
  voices: { S: { tag: '她' } },
});

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() { film.cue(film.wt('L03', '一声早'), 'bell'); },
});
