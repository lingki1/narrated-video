// 便签墙 / 手账拼贴 · sticky notes, taped photos and scraps put down on a desk one by one; narration on a label strip
// __TITLE__ — say in two lines what this film is and who tells it.
// One desk() per stretch; d.note / d.photo / d.scrap put a piece down when it is named. Let them overlap a little.
import { createFilm } from '../../lib/film.js';
import { desk, notes, strike } from '../../lib/templates/notes.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: notes(), voices: { S: { tag: '她' } } });
const { vo, T, wt, theme: C } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const d = desk(film, 0, T.card);
    d.scrap('周二 23:05', 80, 250, 200, { rot: -3 });
    d.note('她说：<br>今天实在是太累了', 90, 360, wt('L01', '一条消息'), { color: 'white', w: 520, rot: -2, size: 66 });
    const a = d.note('先去洗个热水澡？', 560, 520, wt('L02', '想了很久'), { color: 'paper', w: 420, rot: 5, size: 54 });
    const b = d.note('明天会好的', 150, 760, wt('L02', '想了很久') + 600, { color: 'paper', w: 360, rot: -6, size: 54 });
    d.note('我在', 520, 860, wt('L02', '我在'), { color: 'accent', w: 360, rot: 3, size: 150 });
    d.photo(`<circle cx="150" cy="150" r="70" fill="${C.accent}"/><path d="M 0 210 L 300 210" stroke="${C.ink}" stroke-width="10"/>`, 110, 1040, vo.L03.at + 200, { rot: -4, caption: '周三 7:00' });
    d.note('早', 600, 1150, wt('L03', '一声早'), { color: 'ink', w: 260, rot: 4, size: 150 });
    d.each((t) => { strike(a, t, wt('L02', '最后')); strike(b, t, wt('L02', '最后') + 150); });
    film.cue(wt('L02', '我在'), 'msg'); film.cue(wt('L03', '一声早'), 'bell');
  },
});
