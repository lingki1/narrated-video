// Template "data" · 数据图表
// One conclusion per screen: a number that counts up, bars that grow and overtake, a line that draws itself. Good for: anything whose
// point is a number — and only with real numbers: say where each one comes from, on screen.
import { E, clamp, drawn, el, esc, lerp, seg, svgBox } from '../film.js';

export function data() {
  return {
    name: 'data',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/** panel(film, from, to, { title, source }) → a screen with a headline and a source line; add charts to panel.body (920 × 900) */
export function panel(film, from, to, { title = '', source = '' } = {}) {
  const node = el('div', 'nv-shot dt-panel', `<h2>${title}</h2><div class="dt-body"></div><div class="dt-src">${esc(source)}</div>`);
  const parts = [];
  film.shot(from, to, node, (t) => { node.style.opacity = String(clamp(seg(t, from, from + 300))); for (const p of parts) p(t); });
  return { node, body: node.querySelector('.dt-body'), each: (fn) => parts.push(fn) };
}
/** a number that counts from `from` to `value` starting at `at` */
export function bigNumber(p, { value, from = 0, unit = '', label = '', at, ms = 900, decimals = 0, top = 0 }) {
  const e = el('div', 'dt-num', `<b class="nv-num"></b><i>${esc(unit)}</i><span>${esc(label)}</span>`, `top:${top}px`); p.body.appendChild(e);
  const b = e.querySelector('b');
  p.each((t) => { const k = E.power3Out(seg(t, at, at + ms)); const v = lerp(from, value, k).toFixed(decimals); if (b.textContent !== v) b.textContent = v; e.style.opacity = String(clamp(seg(t, at - 150, at + 100))); });
  return e;
}
/** horizontal bars: rows [{ label, value, at, hot }] grow to their value; max sets the full width */
export function bars(p, rows, { max, top = 0, unit = '' } = {}) {
  const m = max || Math.max(...rows.map((r) => r.value));
  const e = el('div', 'dt-bars', rows.map((r) => `<div class="dt-bar${r.hot ? ' hot' : ''}"><span>${esc(r.label)}</span><div><i></i></div><b class="nv-num"></b></div>`).join(''), `top:${top}px`); p.body.appendChild(e);
  const els = [...e.querySelectorAll('.dt-bar')];
  p.each((t) => els.forEach((b, i) => { const r = rows[i]; const k = E.power3Out(seg(t, r.at, r.at + 700)); b.style.opacity = String(clamp(seg(t, r.at - 100, r.at + 150)));
    b.querySelector('i').style.width = `${(r.value / m * 100 * k).toFixed(2)}%`; const v = `${Math.round(r.value * k)}${unit}`; const n = b.querySelector('b'); if (n.textContent !== v) n.textContent = v; }));
  return e;
}
/** a line chart that draws itself: points [[x, y], …] in data units; labels along x optional */
export function line(p, points, { at, ms = 1200, top = 0, h = 420, xLabels = [] } = {}) {
  const xs = points.map((q) => q[0]); const ys = points.map((q) => q[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(0, ...ys); const y1 = Math.max(...ys);
  const X = (x) => 40 + (x - x0) / (x1 - x0 || 1) * 840; const Y = (y) => h - 60 - (y - y0) / (y1 - y0 || 1) * (h - 110);
  const d = points.map((q, i) => `${i ? 'L' : 'M'} ${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const svg = svgBox(920, h, `<path d="M 40 ${h - 60} L 880 ${h - 60}" stroke="currentColor" stroke-width="6"/><path data-l="1" pathLength="1" d="${d}" fill="none" stroke="var(--accent-deep)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle data-e="1" cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="18" fill="var(--accent-deep)"/>
    ${xLabels.map((l, i) => `<text x="${(40 + i / Math.max(1, xLabels.length - 1) * 840).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-family="Inter Tight" font-weight="800" font-size="34" fill="currentColor">${esc(l)}</text>`).join('')}`, 'dt-line');
  svg.style.top = `${top}px`; p.body.appendChild(svg);
  const path = svg.querySelector('[data-l]'); const end = svg.querySelector('[data-e]');
  p.each((t) => { const k = E.sineInOut(seg(t, at, at + ms)); drawn(path, k); end.setAttribute('opacity', k >= 1 ? '1' : '0'); svg.style.opacity = String(clamp(seg(t, at - 200, at))); });
  return svg;
}
