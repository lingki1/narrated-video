// Template "notes" · 便签墙 / 手账拼贴
// A desk: sticky notes, taped photos and paper scraps are put down one by one, a little crooked, overlapping. The narration runs on
// a label-maker strip. Good for: lists, memories, "things I noticed", anything made of small separate pieces.
import { E, clamp, el, esc, seg, svgBox } from '../film.js';

export function notes() {
  return {
    name: 'notes',
    fonts: ['400 16px "Ma Shan Zheng"'],
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full nt-desk'); S.stage.appendChild(S.board); film.board = S.board;
      S.board.appendChild(svgBox(1080, 1920, '<defs><pattern id="nt-dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="4" fill="currentColor"/></pattern></defs><rect width="1080" height="1920" fill="url(#nt-dots)"/>', 'nt-grid'));
    },
  };
}

/** desk(film, from, to) → { put(element, at, rot) , note(), photo(), scrap(), tape() }: everything is positioned in stage pixels */
export function desk(film, from, to) {
  const node = el('div', 'nv-shot'); const parts = [];
  film.shot(from, to, node, (t) => { for (const p of parts) p(t); });
  const put = (e, at, rot = 0) => {
    node.appendChild(e);
    parts.push((t) => { const k = E.power3Out(seg(t, at, at + 380)); e.style.transform = `translateY(${((1 - k) * -70).toFixed(1)}px) rotate(${(rot + (1 - k) * 8).toFixed(2)}deg)`; e.style.opacity = String(clamp(seg(t, at, at + 160))); });
    film.cue(at, 'tick');
    return e;
  };
  return {
    node, put,
    /** run fn(t) every frame of this desk (e.g. to strike a note out) */
    each(fn) { parts.push(fn); },
    /** a sticky note. color: 'accent' | 'paper' | 'white' | 'ink'; hand: handwriting font */
    note(text, x, y, at, { w = 380, color = 'accent', rot = -3, size = 64, hand = true } = {}) {
      return put(el('div', `nt-note nt-${color}${hand ? ' nv-hand' : ''}`, text, `left:${x}px;top:${y}px;width:${w}px;font-size:${size}px`), at, rot);
    },
    /** a taped photo: svg is the picture (viewBox 0 0 300 260) */
    photo(svg, x, y, at, { rot = 4, caption = '' } = {}) {
      const e = el('div', 'nt-photo', `<i class="nt-tape"></i><svg viewBox="0 0 300 260" width="300" height="260">${svg}</svg>${caption ? `<span class="nv-hand">${esc(caption)}</span>` : ''}`, `left:${x}px;top:${y}px`);
      return put(e, at, rot);
    },
    /** a torn scrap of paper with printed text */
    scrap(text, x, y, at, { rot = 2, size = 46 } = {}) { return put(el('div', 'nt-scrap', text, `left:${x}px;top:${y}px;font-size:${size}px`), at, rot); },
  };
}
/** cross a note out at `at`: d.each((t) => strike(note, t, at)) */
export function strike(noteEl, t, at) { noteEl.classList.toggle('struck', t >= at); }
