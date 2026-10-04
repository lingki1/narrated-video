// Template "split" · 分屏对比
// The screen is cut in two — "what you think" above, "what happens" below (or before / after, them / us) — and the two halves
// fill in turn; a tag in the middle names the comparison. Good for: expectations against reality, two ways of doing one thing.
import { E, clamp, el, esc, seg } from '../film.js';

export function split({ top = '你以为', bottom = '实际上' } = {}) {
  return {
    name: 'split',
    others: 'none', // another voice's words go into a half as a chip — that is the point of the split
    labels: () => top + bottom,
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.sp = el('div', 'sp-frame', `<div class="sp-half sp-top"><em>${esc(top)}</em></div><div class="sp-half sp-bottom"><em>${esc(bottom)}</em></div>`); S.board.appendChild(S.sp);
      film.top = S.sp.children[0]; film.bottom = S.sp.children[1];
      /** which half is being talked about: [[time, 'top' | 'bottom' | 'both'], …] — the other half dims */
      film.focus = (keys) => { S.spFocus = keys; };
    },
    frame(t, ctx, film, S) {
      S.sp.style.display = ctx.ending ? 'none' : '';
      // pure function of t: the cut eases from the previous key's share to the current one's
      const keys = S.spFocus || []; const shareOf = (w) => (w === 'top' ? 0.56 : w === 'bottom' ? 0.44 : 0.5);
      let i = -1; keys.forEach(([at], n) => { if (t >= at) i = n; });
      const f = i >= 0 ? keys[i][1] : 'both'; const since = i >= 0 ? keys[i][0] : 0; const prev = i > 0 ? shareOf(keys[i - 1][1]) : 0.5;
      const k = E.power3Out(seg(t, since, since + 400));
      const cut = prev + (shareOf(f) - prev) * k;
      film.top.style.height = `${(cut * 100).toFixed(2)}%`; film.bottom.style.top = `${(cut * 100).toFixed(2)}%`; film.bottom.style.height = `${((1 - cut) * 100).toFixed(2)}%`;
      film.top.style.setProperty('--dim', String(f === 'bottom' ? 0.4 * k : 0)); film.bottom.style.setProperty('--dim', String(f === 'top' ? 0.55 * k : 0));
    },
  };
}
/** put something into a half: place(film.top, element, t, at) inside a shot's render — or simply append and animate yourself */
export function place(half, html, style) { const e = el('div', 'sp-item', html, style); half.appendChild(e); return e; }
export const appear = (e, t, at) => { const k = E.power3Out(seg(t, at, at + 320)); e.style.opacity = String(clamp(seg(t, at, at + 200))); e.style.transform = `translateY(${((1 - k) * 30).toFixed(1)}px)`; };
