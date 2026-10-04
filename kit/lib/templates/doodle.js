// Template "doodle" · 白板手绘 / 简笔画
// A sheet of paper, a black marker: every line draws itself as it is talked about; stick figures, arrows, handwritten labels,
// an accent highlighter. Good for: explaining how something works or went, step by step, with a light tone.
// Draw with <path pathLength="1" …> (and circles / lines given pathLength="1"); sketch() draws them in order.
import { E, clamp, drawn, el, seg, svgBox } from '../film.js';

export function doodle() {
  return {
    name: 'doodle',
    fonts: ['400 16px "Ma Shan Zheng"'],
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/** marker defaults for an SVG group: <g ${PEN}> … </g> */
export const PEN = 'fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"';

/**
 * page(film, from, to, svgMarkup) → { node, svg, q, qa }: one sheet (viewBox 0 0 1080 1920) between two times.
 * Give every group you want drawn a data-d="name"; then sketch(page.q('[data-d="name"]'), t, at, ms) inside film.shot's render.
 */
export function page(film, from, to, markup, render) {
  const node = el('div', 'nv-shot dd-page');
  const svg = svgBox(1080, 1920, markup); node.appendChild(svg);
  for (const p of svg.querySelectorAll('path, line, circle, ellipse, rect, polyline')) if (!p.hasAttribute('data-fill')) p.setAttribute('pathLength', '1');
  const pg = { node, svg, q: (sel) => svg.querySelector(sel), qa: (sel) => [...svg.querySelectorAll(sel)] };
  film.shot(from, to, node, (t) => render && render(t, pg));
  return pg;
}
/** draw every stroke inside `group`, one after another, starting at `at` and taking `ms` in total */
export function sketch(group, t, at, ms = 900) {
  const parts = [...group.querySelectorAll('[pathLength]')];
  const each = ms / Math.max(1, parts.length);
  parts.forEach((p, i) => drawn(p, E.sineInOut(seg(t, at + i * each, at + (i + 1) * each))));
  for (const f of group.querySelectorAll('[data-fill], text')) f.setAttribute('opacity', String(clamp(seg(t, at + ms * 0.7, at + ms))));
}
/** handwriting that appears character by character: <text data-w="1">…</text> is split into tspans once, then revealed */
export function write(textEl, t, at, ms = 600) {
  if (!textEl.dataset.split) { const s = textEl.textContent; textEl.textContent = ''; [...s].forEach((ch) => { const sp = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); sp.textContent = ch; textEl.appendChild(sp); }); textEl.dataset.split = '1'; }
  const n = textEl.childNodes.length;
  textEl.childNodes.forEach((sp, i) => sp.setAttribute('opacity', t >= at + (i / n) * ms ? '1' : '0'));
  textEl.setAttribute('opacity', '1');
}
/** a stick figure: head at (x, y), about 300 tall. pose: 'stand' | 'lie' | 'sit' | 'wave' */
export function stick(x, y, pose = 'stand') {
  const P = {
    stand: `<circle cx="0" cy="0" r="38"/><path d="M 0 38 L 0 170"/><path d="M 0 80 L -56 130"/><path d="M 0 80 L 56 130"/><path d="M 0 170 L -44 280"/><path d="M 0 170 L 44 280"/>`,
    wave: `<circle cx="0" cy="0" r="38"/><path d="M 0 38 L 0 170"/><path d="M 0 80 L -56 130"/><path d="M 0 80 L 70 20"/><path d="M 0 170 L -44 280"/><path d="M 0 170 L 44 280"/>`,
    sit: `<circle cx="0" cy="0" r="38"/><path d="M 0 38 L 0 160"/><path d="M 0 80 L 60 110"/><path d="M 0 160 L 90 160"/><path d="M 90 160 L 90 270"/>`,
    lie: `<circle cx="0" cy="0" r="38"/><path d="M 40 6 L 200 16"/><path d="M 90 10 L 130 -40"/><path d="M 200 16 L 330 6"/>`,
  };
  return `<g transform="translate(${x} ${y})">${P[pose] || P.stand}</g>`;
}
