// 假界面 / 录屏感 · the frame is a made-up device screen: windows open, text is typed and deleted, notifications drop in
// __TITLE__ — say in two lines what this film is and who tells it.
// One ui() per stretch. Other voices arrive as notifications or typed text — the pinned card is off in this template.
import { createFilm, hhmm, lerp, seg } from '../../lib/film.js';
import { screen, ui } from '../../lib/templates/screen.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

let day = 0;
const film = createFilm({
  lines: LINES, durations: D, voices: { S: { tag: '她' } },
  template: screen({ clock: (t) => (t < day ? hhmm(lerp(23 * 60 + 5, 23 * 60 + 9, seg(t, 0, day))) : '07:00') }), // the status-bar clock
});
const { vo, T, wt } = film;
T.day = day = vo.L03.at - 500;

film.start({
  night: (t) => t < T.day,
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const a = ui(film, 0, T.day);
    a.toast({ title: '她', text: '今天实在是太累了', at: wt('L01', '一条消息'), hold: 3600, y: 330 });
    const draft = a.win({ title: '回复草稿', x: 80, y: 640, w: 920, h: 620, at: vo.L02.at });
    const d1 = wt('L02', '想了很久'); const d2 = wt('L02', '该怎么回'); const fin = wt('L02', '最后');
    a.typeLine(draft, '先去洗个热水澡，再把明天的事写下来', { at: d1, cps: 16, erase: d2 - 100 });
    a.typeLine(draft, '明天会好起来的', { at: d2 + 300, cps: 14, erase: fin - 100 });
    a.typeLine(draft, '我在', { at: wt('L02', '我在') - 250, cps: 6, cls: 'big' });
    a.toast({ title: '她', text: '那就好。', at: vo.S01.at + 100, hold: 2400, y: 330 });
    const b = ui(film, T.day, T.card);
    b.toast({ title: '闹钟', text: '07:00 · 已关闭', at: wt('L03', '关掉闹钟'), hold: 2200, y: 330 });
    const w = b.win({ title: '她', x: 80, y: 640, w: 920, h: 460, at: wt('L03', '先跟我') });
    b.typeLine(w, '早', { at: wt('L03', '一声早') - 100, cps: 5, cls: 'big' });
    film.cue(T.day + 100, 'alarm'); film.cue(wt('L03', '一声早'), 'bell');
  },
});
