// 白板手绘 · marker lines that draw themselves on a white sheet, stick figures, handwriting, an accent highlighter
// __TITLE__ — say in two lines what this film is and who tells it.
// Put each thing in a <g data-d="name"> and sketch() it when it is named. Keep to a dozen strokes per thing.
import { createFilm, fade } from '../../lib/film.js';
import { PEN, doodle, page, sketch, stick, write } from '../../lib/templates/doodle.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: doodle(), voices: { S: { tag: '她说' } } });
const { vo, T, wt, theme: C } = film;
T.p2 = vo.L03.at - 500;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    // sheet 1 · her in bed with the phone; the message; his two characters
    page(film, 0, T.p2, `<g ${PEN}>
      <g data-d="bed"><path d="M 150 980 L 930 980"/><path d="M 150 980 L 150 820"/><path d="M 930 980 L 930 900"/><path d="M 150 1040 L 150 980"/><path d="M 930 1040 L 930 980"/></g>
      <g data-d="her">${stick(300, 900, 'lie')}</g>
      <g data-d="phone"><rect x="470" y="700" width="110" height="170" rx="16"/><path d="M 500 735 L 550 735"/></g>
      <g data-d="clock"><circle cx="820" cy="420" r="120"/><path d="M 820 420 L 820 330"/><path d="M 820 420 L 795 360"/></g>
      <g data-d="arrow" stroke="${C.accentDeep}"><path d="M 600 760 Q 760 700 800 1160"/><path d="M 770 1120 L 800 1162 L 838 1128"/></g>
      <g data-d="box"><rect x="560" y="1170" width="400" height="200" rx="30"/></g></g>
      <text data-w="time" x="820" y="610" text-anchor="middle" font-size="84">晚上 11:05</text>
      <text data-w="tired" x="160" y="700" font-size="92">“太累了”</text>
      <text data-w="me" x="760" y="1310" text-anchor="middle" font-size="150" style="fill:${C.accentDeep}">我在</text>`, (t, p) => {
      sketch(p.q('[data-d="clock"]'), t, 200, 800); write(p.q('[data-w="time"]'), t, wt('L01', '十一点'), 500);
      sketch(p.q('[data-d="bed"]'), t, wt('L01', '她给我'), 700); sketch(p.q('[data-d="her"]'), t, wt('L01', '她给我') + 500, 700);
      sketch(p.q('[data-d="phone"]'), t, wt('L01', '一条消息'), 500); write(p.q('[data-w="tired"]'), t, wt('L01', '太累了') - 200, 500);
      sketch(p.q('[data-d="arrow"]'), t, wt('L02', '怎么回'), 700); sketch(p.q('[data-d="box"]'), t, wt('L02', '最后'), 600);
      write(p.q('[data-w="me"]'), t, wt('L02', '我在'), 300);
    });
    film.cue(wt('L02', '我在'), 'msg');
    // sheet 2 · the next morning
    page(film, T.p2, T.card, `<g ${PEN}>
      <g data-d="sun" stroke="${C.accentDeep}"><circle cx="540" cy="560" r="130"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M ${540 + 170 * Math.cos(a * Math.PI / 180)} ${560 + 170 * Math.sin(a * Math.PI / 180)} L ${540 + 230 * Math.cos(a * Math.PI / 180)} ${560 + 230 * Math.sin(a * Math.PI / 180)}"/>`).join('')}</g>
      <g data-d="her2">${stick(330, 950, 'wave')}</g>
      <g data-d="phone2"><rect x="640" y="960" width="130" height="210" rx="18"/><path d="M 675 1000 L 735 1000"/></g></g>
      <text data-w="seven" x="540" y="300" text-anchor="middle" font-size="110">第二天 7:00</text>
      <text data-w="zao" x="705" y="900" text-anchor="middle" font-size="170" style="fill:${C.accentDeep}">早</text>`, (t, p) => {
      p.node.style.opacity = String(fade(t, T.p2, 300));
      sketch(p.q('[data-d="sun"]'), t, T.p2 + 200, 900); write(p.q('[data-w="seven"]'), t, wt('L03', '早上七点'), 500);
      sketch(p.q('[data-d="her2"]'), t, wt('L03', '她关掉'), 700); sketch(p.q('[data-d="phone2"]'), t, wt('L03', '先跟我'), 500);
      write(p.q('[data-w="zao"]'), t, wt('L03', '一声早'), 200);
    });
    film.cue(T.p2 + 200, 'alarm'); film.cue(wt('L03', '一声早'), 'bell');
  },
});
