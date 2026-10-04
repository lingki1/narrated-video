// Template "mindmap" · 思维导图展开
// A word in the middle; branches grow out of it one by one as they are named, each with a few leaves. Good for: explaining how a
// thing breaks down — causes, kinds, parts — when the relations matter more than the order.
import { E, clamp, drawn, el, esc, seg, show, svgBox } from '../film.js';

export function mindmap() {
  return {
    name: 'mindmap',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/**
 * map(film, from, to, { center, at, branches: [{ text, at, leaves: [{ text, at }] }] })
 * Up to four branches, one per corner around the centre (top right, top left, bottom right, bottom left — the order they are given);
 * up to three leaves each, stacked away from the centre. More than four branches is a second map().
 */
export function map(film, from, to, m) {
  const node = el('div', 'nv-shot mm-map'); const svg = svgBox(1080, 1920, ''); node.appendChild(svg);
  const CX = 540; const CY = 800;
  const c = el('div', 'mm-center', esc(m.center), `left:${CX}px;top:${CY}px`); node.appendChild(c);
  const items = m.branches.slice(0, 4).map((b, i) => {
    const right = i % 2 === 0; const up = i < 2;
    const x = right ? 790 : 290; const y = CY + (up ? -190 : 190); const ly = y + (up ? -56 : 56); // ly: the middle of the branch label
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${CX} ${CY} C ${CX} ${CY + (up ? -150 : 150)}, ${x} ${ly + (up ? 170 : -170)}, ${x} ${ly}`);
    path.setAttribute('pathLength', '1'); path.setAttribute('class', 'mm-link'); svg.appendChild(path);
    const e = el('div', `mm-branch ${up ? 'up' : 'down'}`, `<b>${esc(b.text)}</b>${(b.leaves || []).slice(0, 3).map((l) => `<span>${esc(l.text)}</span>`).join('')}`, `left:${x}px;top:${y}px`); node.appendChild(e);
    film.cue(b.at, 'tick');
    return { b, path, e, leaves: [...e.querySelectorAll('span')] };
  });
  film.shot(from, to, node, (t) => {
    const kc = E.backOut(seg(t, m.at ?? from, (m.at ?? from) + 360), 1.5); show(c, t >= (m.at ?? from)); c.style.transform = `translate(-50%, -50%) scale(${Math.max(0.2, kc).toFixed(4)})`;
    for (const it of items) {
      drawn(it.path, E.sineInOut(seg(t, it.b.at - 350, it.b.at)));
      const k = E.backOut(seg(t, it.b.at, it.b.at + 320), 1.4); show(it.e, t >= it.b.at); it.e.style.transform = `translate(-50%, ${it.e.classList.contains('up') ? '-100%' : '0'}) scale(${Math.max(0.2, k).toFixed(4)})`;
      it.leaves.forEach((s, i) => { const at = it.b.leaves[i].at; show(s, t >= at - 20); s.style.opacity = String(clamp(seg(t, at, at + 220))); });
    }
  });
  return node;
}
