// Template "comic" · 漫画分镜（动态漫）
// A page of panels that appear one by one: each panel is a small drawing with a speech balloon or a sound-effect word; the
// narration runs in caption boxes under the page. Good for: a story with beats and a last-panel reveal.
import { E, clamp, el, esc, seg, show, svgBox } from '../film.js';

export function comic() {
  return {
    name: 'comic',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/**
 * sheet(film, from, to) → a page. Then page.panel({ x, y, w, h, at, svg, bg, tilt }) → { node, svg, q }, positions in page pixels
 * (the page is 960 wide × 1120 tall), and page.balloon / page.sfx / page.box to put words on top.
 */
export function sheet(film, from, to) {
  const node = el('div', 'nv-shot cm-sheet'); const page = el('div', 'cm-page'); node.appendChild(page);
  const parts = [];
  film.shot(from, to, node, (t) => { for (const p of parts) p(t); });
  const add = (e, at, kind, rot = 0) => {
    page.appendChild(e);
    parts.push((t) => {
      show(e, t >= at); if (t < at) return; // hidden with display:none, never scale(0) — see tf() in film.js
      const k = seg(t, at, at + 260);
      const s = kind === 'sfx' ? 1 + 0.8 * (1 - E.power3Out(k)) : 0.92 + 0.08 * E.backOut(k, 1.6);
      e.style.transform = `rotate(${rot}deg) scale(${s.toFixed(4)})`; e.style.opacity = String(clamp(k * 3));
    });
    return e;
  };
  return {
    node, page,
    panel({ x, y, w, h, at, svg = '', bg = '', tilt = 0 }) {
      const e = el('div', 'cm-panel', '', `left:${x}px;top:${y}px;width:${w}px;height:${h}px;${bg ? `background:${bg};` : ''}`);
      const s = svgBox(w, h, svg); e.appendChild(s); add(e, at, 'panel', tilt);
      return { node: e, svg: s, q: (sel) => s.querySelector(sel) };
    },
    /** a speech balloon; tail: 'left' | 'right' | 'none' */
    balloon(text, x, y, at, { tail = 'left', size = 64 } = {}) { return add(el('div', `cm-balloon tail-${tail}`, esc(text), `left:${x}px;top:${y}px;font-size:${size}px`), at, 'balloon', tail === 'left' ? -2 : 2); },
    /** a sound-effect word: big, outlined, tilted */
    sfx(text, x, y, at, { size = 150, rot = -8, color = '' } = {}) { film.hit(at, 14); return add(el('div', 'cm-sfx', esc(text), `left:${x}px;top:${y}px;font-size:${size}px;${color ? `color:${color}` : ''}`), at, 'sfx', rot); },
    /** a narration box inside the page (time, place) */
    box(text, x, y, at) { return add(el('div', 'cm-box', esc(text), `left:${x}px;top:${y}px`), at, 'box', 0); },
  };
}
/** halftone dots as an SVG pattern (flat): put ${halftone('h1', color)} in a panel's svg, then fill="url(#h1)" */
export const halftone = (id, color, step = 22, r = 5) => `<defs><pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step / 2}" cy="${step / 2}" r="${r}" fill="${color}"/></pattern></defs>`;
