// Template "board" · 画板讲述
// Story clock on top, a framed board (inner 920×700) for small drawings, the narrator standing bottom right, strip subtitles.
// Good for: one small thing told along a clock; pieces appear on the board as they are named.
// start() options:  clock: { keys: [[filmMs, storyMinutes], …] | () => that list, date(mins) → string, chip(mins) → string }
import { E, el, hhmm, lerp, seg, show } from '../film.js';

export function board() {
  let keys = null;
  const clockAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i += 1; const [a, x] = keys[i]; const [b, y] = keys[i + 1]; return lerp(x, y, E.sineInOut(seg(t, a, b))); };
  return {
    name: 'board',
    mount(film, S) {
      S.floor = el('div', 'nv-floor'); S.stage.appendChild(S.floor);
      S.head = el('div', 'nv-head', '<div class="date"></div><div class="time nv-num"></div><div class="chip"></div>');
      S.board = el('div', 'nv-board'); S.stage.append(S.head, S.board);
      film.board = S.board; film.head = S.head;
    },
    built(film, S, o) { if (o.clock) keys = typeof o.clock.keys === 'function' ? o.clock.keys(film) : o.clock.keys; },
    labels(film, o) {
      let s = '';
      if (o.clock) for (let m = 0; m < 4 * 1440; m += 30) s += (o.clock.date ? o.clock.date(m) : '') + (o.clock.chip ? o.clock.chip(m) : '');
      return s;
    },
    frame(t, { night, ending }, film, S, o) {
      show(S.head, !ending && !!keys);
      S.board.classList.toggle('night', night);
      if (ending) return;
      if (keys) {
        const mins = clockAt(t); const h = S.head.children;
        const txt = hhmm(mins); if (h[1].textContent !== txt) h[1].textContent = txt;
        const d = o.clock.date ? o.clock.date(mins) : ''; if (h[0].textContent !== d) h[0].textContent = d;
        const c = o.clock.chip ? o.clock.chip(mins) : ''; if (h[2].textContent !== c) h[2].textContent = c;
        show(h[2], !!c);
      }
      S.board.style.transform = `scale(${(0.9 * (0.94 + 0.06 * E.power3Out(seg(t, 0, 500)))).toFixed(4)})`;
    },
    afterCard(t, ctx, film, S) { S.head.style.opacity = String(1 - 0.9 * ctx.cardOpacity); },
  };
}
