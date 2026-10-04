// 分屏对比 · the screen cut in two (你以为 / 实际上); the half being talked about grows a little, the other dims
// __TITLE__ — say in two lines what this film is and who tells it.
// place() things into film.top / film.bottom and appear() them when they are named; film.focus() says which half is speaking.
import { createFilm } from '../../lib/film.js';
import { appear, place, split } from '../../lib/templates/split.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: split({ top: '我想回的', bottom: '我发出去的' }), voices: { S: { tag: '她' } } });
const { vo, wt } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const her = place(film.top, '<div class="nv-chip" style="position:static;font-size:44px">她：今天实在是太累了</div>', 'left:40px;top:90px');
    const a = place(film.top, '<div class="nv-plate" style="position:static;font-size:52px">一、先去洗个热水澡</div>', 'left:40px;top:190px');
    const b = place(film.top, '<div class="nv-plate" style="position:static;font-size:52px">二、把明天的事写下来</div>', 'left:40px;top:290px');
    const c = place(film.top, '<div class="nv-plate" style="position:static;font-size:52px">三、十二点以前睡觉</div>', 'left:40px;top:390px');
    const me = place(film.bottom, '<div class="nv-plate accent" style="position:static;font-size:190px;line-height:1.1">我在</div>', 'left:250px;top:130px');
    const ok = place(film.bottom, '<div class="nv-chip" style="position:static;font-size:50px">她：那就好。</div>', 'left:40px;top:420px');
    film.focus([[0, 'top'], [wt('L02', '最后'), 'bottom'], [vo.L03.at, 'both']]);
    film.every((t) => {
      appear(her, t, wt('L01', '一条消息')); appear(a, t, wt('L02', '想了很久')); appear(b, t, wt('L02', '想了很久') + 500); appear(c, t, wt('L02', '该怎么回'));
      appear(me, t, wt('L02', '我在')); appear(ok, t, vo.S01.at + 100);
    });
    film.cue(wt('L02', '我在'), 'stamp'); film.cue(wt('L03', '一声早'), 'bell');
  },
});
