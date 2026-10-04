// 文字快闪 · the words are the picture: every clause fills the screen in huge type, the ground colour flips clause by clause
// __TITLE__ — say in two lines what this film is and who tells it.
// The template builds everything from lines.js. Short clauses work best here: this is the one template where terse is right.
import { createFilm } from '../../lib/film.js';
import { kinetic } from '../../lib/templates/kinetic.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({
  lines: LINES, durations: D,
  template: kinetic({ emphasize: ['太累了', '我在', '早'] }), // words set in the accent colour
  voices: { S: { tag: '她' } },
});

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    film.cue(film.wt('L02', '我在'), 'stamp'); film.hit(film.wt('L02', '我在'), 22);
    film.cue(film.wt('L03', '一声早'), 'bell');
  },
});
