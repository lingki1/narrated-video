// 视觉小说对话框 · a background, a character standing in it, and a dialogue box where every voice's words are typed out
// __TITLE__ — say in two lines what this film is and who tells it.
// Backgrounds are film.shot()s (full screen); the character is the buddy (or your own). The box needs no code.
import { createFilm, el, fade, svgBox } from '../../lib/film.js';
import { buddyCharacter } from '../../lib/buddy.js';
import { vn } from '../../lib/templates/vn.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: vn({ names: { L: '我', S: '她' } }) });
const { vo, T, theme: C } = film;
T.day = vo.L03.at - 500;

film.start({
  night: (t) => t < T.day,
  character: buddyCharacter({ x: 540, y: 1080, size: 1.25, facing: 0, moods: () => [[0, 'curious'], [vo.L02.at, 'thinking'], [vo.S01.at, 'touched'], [T.day, 'happy']] }),
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const bg = (from, to, color, svg) => { const n = el('div', 'nv-shot', '', `background:${color}`); n.appendChild(svgBox(1080, 1920, svg)); film.shot(from, to, n, (t) => { n.style.opacity = String(from ? fade(t, from, 400) : 1); }); };
    bg(0, T.day, C.night, `<rect x="0" y="1080" width="1080" height="840" fill="${C.floorNight}"/><rect x="110" y="260" width="330" height="430" rx="12" fill="#232a44" stroke="${C.paper}" stroke-width="12"/>
      <path d="M 275 260 L 275 690 M 110 475 L 440 475" stroke="${C.paper}" stroke-width="9"/><circle cx="360" cy="360" r="42" fill="${C.paper}"/>
      <rect x="700" y="420" width="260" height="14" fill="${C.paper}"/><rect x="730" y="300" width="60" height="120" fill="${C.accent}"/><rect x="800" y="330" width="50" height="90" fill="${C.paper}"/>`);
    bg(T.day, T.card, C.paper, `<rect x="0" y="1080" width="1080" height="840" fill="${C.desk}"/><rect x="110" y="260" width="330" height="430" rx="12" fill="#FFFFFF" stroke="${C.ink}" stroke-width="12"/>
      <path d="M 275 260 L 275 690 M 110 475 L 440 475" stroke="${C.ink}" stroke-width="9"/><circle cx="360" cy="380" r="60" fill="${C.accent}"/>
      <rect x="700" y="420" width="260" height="14" fill="${C.ink}"/><rect x="730" y="300" width="60" height="120" fill="${C.accent}"/><rect x="800" y="330" width="50" height="90" fill="${C.ink}"/>`);
    film.cue(T.day + 100, 'alarm');
  },
});
