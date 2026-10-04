// 2D 绘本 · full-screen flat illustrations with a slow camera drift, caption band at the bottom, other voices in a bubble
// __TITLE__ — say in two lines what this film is and who tells it.
// One scene() per stretch of the story. Draw with simple shapes: thick outlines, flat fills, one accent colour.
import { createFilm, fade, seg } from '../../lib/film.js';
import { bob, picture, rise, scene } from '../../lib/templates/picture.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: picture(), voices: { S: { tag: '她' } } });
const { vo, T, wt, theme: C } = film;
T.day = vo.L03.at - 500;

film.start({
  night: (t) => t < T.day,
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    // scene 1 · her room at night: a window with the moon, the bed, the phone lit up
    scene(film, 0, T.day, {
      bg: C.night, night: true,
      svg: `<rect x="0" y="1180" width="1080" height="740" fill="${C.floorNight}"/>
        <rect x="130" y="330" width="360" height="460" rx="14" fill="#232a44" stroke="${C.paper}" stroke-width="12"/><path d="M 310 330 L 310 790 M 130 560 L 490 560" stroke="${C.paper}" stroke-width="9"/>
        <circle data-moon="1" cx="400" cy="440" r="46" fill="${C.paper}"/>
        <rect x="170" y="1010" width="820" height="230" rx="40" fill="${C.paper}" stroke="${C.ink}" stroke-width="10"/><rect x="200" y="950" width="230" height="120" rx="44" fill="#FFFFFF" stroke="${C.ink}" stroke-width="10"/>
        <path data-blanket="1" d="M 420 1010 Q 640 900 960 1010 L 990 1200 L 420 1200 Z" fill="${C.accent}" stroke="${C.ink}" stroke-width="10" stroke-linejoin="round"/>
        <g data-phone="1"><rect x="560" y="820" width="150" height="250" rx="24" fill="${C.ink}" stroke="${C.paper}" stroke-width="8"/><rect x="576" y="844" width="118" height="196" rx="8" fill="${C.paper}"/>
          <circle cx="616" cy="930" r="9" fill="${C.ink}"/><circle cx="654" cy="930" r="9" fill="${C.ink}"/><path d="M 618 962 Q 635 976 652 962" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/></g>
        <g data-msg="1"><rect x="560" y="610" width="430" height="130" rx="34" fill="#FFFFFF" stroke="${C.ink}" stroke-width="8"/><text x="775" y="696" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="58" fill="${C.ink}">今天太累了</text></g>
        <g data-me="1"><rect x="170" y="800" width="300" height="150" rx="38" fill="${C.accent}" stroke="${C.ink}" stroke-width="8"/><text x="320" y="904" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="92" fill="${C.ink}">我在</text></g>`,
    }, (t, s) => {
      s.q('[data-moon]').setAttribute('cy', String(440 + bob(t, 6000, 5)));
      s.q('[data-phone]').style.transform = `translateY(${bob(t, 2600, 4).toFixed(1)}px)`;
      rise(s.q('[data-msg]'), t, wt('L01', '一条消息')); rise(s.q('[data-me]'), t, wt('L02', '我在'));
    });
    film.cue(wt('L01', '一条消息'), 'msg'); film.cue(wt('L02', '我在'), 'msg');
    // scene 2 · morning: the sun in the window, the alarm clock ringing
    scene(film, T.day, T.card, {
      bg: C.paper,
      svg: `<rect x="0" y="1180" width="1080" height="740" fill="${C.desk}"/>
        <rect x="130" y="330" width="360" height="460" rx="14" fill="#FFFFFF" stroke="${C.ink}" stroke-width="12"/><path d="M 310 330 L 310 790 M 130 560 L 490 560" stroke="${C.ink}" stroke-width="9"/>
        <circle data-sun="1" cx="400" cy="640" r="70" fill="${C.accent}"/>
        <g data-clock="1"><circle cx="760" cy="980" r="150" fill="#FFFFFF" stroke="${C.ink}" stroke-width="14"/><path d="M 760 980 L 760 880 M 760 980 L 830 980" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/>
          <circle cx="650" cy="840" r="46" fill="${C.accent}" stroke="${C.ink}" stroke-width="12"/><circle cx="870" cy="840" r="46" fill="${C.accent}" stroke="${C.ink}" stroke-width="12"/>
          <path d="M 680 1110 L 650 1170 M 840 1110 L 870 1170" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/></g>
        <text data-zao="1" x="300" y="1420" text-anchor="middle" font-family="Noto Serif SC" font-weight="900" font-size="260" fill="${C.ink}">早</text>`,
    }, (t, s) => {
      s.q('[data-sun]').setAttribute('cy', String(640 - 150 * seg(t, T.day, T.day + 4000)));
      const ring = t < wt('L03', '关掉闹钟') ? Math.sin(t / 26) * 9 : 0;
      s.q('[data-clock]').style.transform = `translateX(${ring.toFixed(1)}px)`;
      s.q('[data-zao]').setAttribute('opacity', String(fade(t, wt('L03', '一声早'), 400)));
    });
    film.cue(T.day + 100, 'alarm'); film.cue(wt('L03', '一声早'), 'bell');
  },
});
