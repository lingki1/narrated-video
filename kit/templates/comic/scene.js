// 漫画分镜 · a page of panels that appear one by one, with balloons and sound-effect words; narration in caption boxes below
// __TITLE__ — say in two lines what this film is and who tells it.
// One sheet() per page (3–5 panels). What other voices say goes into balloons — the pinned card is off in this template.
import { createFilm } from '../../lib/film.js';
import { comic, halftone, sheet } from '../../lib/templates/comic.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: comic(), voices: { S: { tag: '她' } } });
const { vo, T, wt, theme: C } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const pg = sheet(film, 0, T.card);
    // panel 1 · night: the phone lights up
    pg.panel({ x: 0, y: 0, w: 960, h: 400, at: 100, bg: C.night, svg: `${halftone('h1', C.floorNight)}<rect width="960" height="400" fill="url(#h1)"/>
      <rect x="380" y="70" width="170" height="290" rx="26" fill="${C.ink}" stroke="${C.paper}" stroke-width="8"/><rect x="398" y="96" width="134" height="230" rx="8" fill="${C.paper}"/>
      <path d="M 300 60 L 250 20 M 330 30 L 310 -10 M 620 60 L 680 20 M 600 30 L 620 -10" stroke="${C.accent}" stroke-width="10" stroke-linecap="round"/>` });
    pg.box('周二 23:05', 24, 24, 300);
    pg.balloon('今天太累了', 520, 60, wt('L01', '一条消息'), { tail: 'left', size: 60 });
    // panel 2 · he thinks
    pg.panel({ x: 0, y: 424, w: 470, h: 330, at: vo.L02.at, svg: `<circle cx="150" cy="200" r="76" fill="${C.ink}"/><circle cx="124" cy="186" r="13" fill="${C.paper}"/><circle cx="176" cy="186" r="13" fill="${C.paper}"/>
      <circle cx="236" cy="150" r="11" fill="${C.ink}"/><circle cx="262" cy="116" r="15" fill="${C.ink}"/>
      <text x="358" y="112" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="60" fill="${C.ink}">回什么</text><text x="376" y="186" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="60" fill="${C.ink}">好？</text>` });
    // panel 3 · two characters
    pg.panel({ x: 490, y: 424, w: 470, h: 330, at: wt('L02', '最后'), bg: C.accent, tilt: 1.5 });
    pg.sfx('我在', 560, 500, wt('L02', '我在'), { size: 170, rot: -6 });
    pg.balloon('那就好。', 230, 650, vo.S01.at + 100, { tail: 'right', size: 56 });
    // panel 4 · morning
    pg.panel({ x: 0, y: 778, w: 960, h: 342, at: vo.L03.at, svg: `<circle cx="190" cy="180" r="90" fill="${C.accent}" stroke="${C.ink}" stroke-width="10"/>
      <circle cx="560" cy="190" r="100" fill="#FFFFFF" stroke="${C.ink}" stroke-width="12"/><path d="M 560 190 L 560 120 M 560 190 L 610 190" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="486" cy="96" r="30" fill="${C.accent}" stroke="${C.ink}" stroke-width="10"/><circle cx="634" cy="96" r="30" fill="${C.accent}" stroke="${C.ink}" stroke-width="10"/>` });
    pg.box('周三 07:00', 24, 802, vo.L03.at + 200);
    pg.sfx('叮！', 690, 800, wt('L03', '闹钟响了'), { size: 110, rot: 8, color: C.accent });
    pg.balloon('早', 760, 960, wt('L03', '一声早'), { tail: 'left', size: 100 });
    film.cue(wt('L02', '我在'), 'stamp'); film.cue(wt('L03', '闹钟响了'), 'alarm');
  },
});
