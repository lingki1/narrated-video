// 时间轴 / 路线图 · one line down the screen; stops light up one by one with a time and a short card; the view follows the line
// __TITLE__ — say in two lines what this film is and who tells it.
// film.stops([{ time, title, text, at }]) is all it needs. Five to nine stops; each title six characters or so.
import { createFilm } from '../../lib/film.js';
import { timeline } from '../../lib/templates/timeline.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: timeline(), voices: { S: { tag: '她' } } });
const { vo, T, wt } = film;
T.day = vo.L03.at - 500;

film.start({
  night: (t) => t < T.day,
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    film.stops([
      { time: '23:05', title: '她发来一条消息', text: '「今天实在是太累了」', at: 200 },
      { time: '23:06', title: '我想了很久', text: '打了又删，删了又打', at: vo.L02.at },
      { time: '23:09', title: '我在', at: wt('L02', '我在'), big: true },
      { time: '07:00', title: '闹钟响了', text: '她先跟我说了一声早', at: vo.L03.at },
    ]);
    film.cue(wt('L02', '我在'), 'msg'); film.cue(T.day + 100, 'alarm');
  },
});
