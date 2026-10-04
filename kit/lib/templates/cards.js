// Template "cards" · 知识卡片
// One card at a time in the middle of the screen: a number, a title, a few rows that tick in as they are said; the card is put
// aside and the next one comes up. Good for: lists, steps, "three things about …" — each card is something people screenshot.
import { E, clamp, el, esc, seg, show } from '../film.js';

export function cards() {
  return {
    name: 'cards',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/**
 * card(film, from, to, { no, total, kicker, title, rows: [{ text, at, mark }], big })
 *   mark: '✓' | '✗' | '·' | a number;  big: { text, at } one huge word instead of rows
 * The card comes up at `from` and is put aside at `to`. Returns the element.
 */
export function card(film, from, to, c) {
  const node = el('div', 'nv-shot');
  const rows = (c.rows || []).map((r) => `<div class="cd-row"><b class="${r.mark === '✗' ? 'no' : ''}">${esc(String(r.mark ?? '·'))}</b><span>${r.text}</span></div>`).join('');
  const e = el('div', 'cd-card', `<div class="cd-top">${c.no ? `<i class="nv-num">${String(c.no).padStart(2, '0')}</i>` : ''}${c.kicker ? `<em>${esc(c.kicker)}</em>` : ''}</div>
    <h2>${c.title || ''}</h2>${rows}${c.big ? `<div class="cd-big">${c.big.text}</div>` : ''}`);
  const dots = el('div', 'cd-dots', Array.from({ length: c.total || 0 }, (_, i) => `<i class="${i + 1 === c.no ? 'on' : ''}"></i>`).join(''));
  node.append(e, dots);
  const rowEls = [...e.querySelectorAll('.cd-row')]; const big = e.querySelector('.cd-big');
  film.shot(from, to + 400, node, (t) => {
    const a = E.power3Out(seg(t, from, from + 420)); const z = E.power2In(seg(t, to, to + 400));
    e.style.transform = `translate(${(-z * 900).toFixed(1)}px, ${((1 - a) * 500).toFixed(1)}px) rotate(${(-2 + (1 - a) * 6 - z * 10).toFixed(2)}deg)`;
    e.style.opacity = String(clamp(a * 2) * (1 - z)); dots.style.opacity = String(1 - z);
    rowEls.forEach((r, i) => { const k = E.power3Out(seg(t, c.rows[i].at, c.rows[i].at + 300)); r.style.opacity = String(k); r.style.transform = `translateX(${((1 - k) * 40).toFixed(1)}px)`; });
    if (big) { const k = seg(t, c.big.at, c.big.at + 200); big.style.opacity = String(clamp(k * 3)); show(big, t >= c.big.at); big.style.transform = `scale(${(1 + 0.5 * (1 - E.power3Out(k))).toFixed(3)})`; }
  });
  for (const r of c.rows || []) film.cue(r.at, 'tick');
  return e;
}
