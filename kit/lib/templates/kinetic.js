// Template "kinetic" · 文字快闪
// No drawings: the words are the picture. Every clause fills the screen in huge type, character by character as it is spoken, and
// the ground colour flips from clause to clause. Good for: short, punchy pieces, opinions, lists of lines people will quote.
// It builds itself from the lines; build() is only for extras. Options: emphasize: ['词', …] words set in the accent colour.
import { E, clamp, el, esc, seg, show } from '../film.js';

export function kinetic({ emphasize = [], perRow = 5 } = {}) {
  const slides = [];
  return {
    name: 'kinetic',
    subtitles: 'none', others: 'none',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; S.kin = el('div', 'kn-layer'); S.stage.appendChild(S.kin); },
    built(film, S) {
      let n = 0;
      for (const v of film.VO) {
        const other = v.who !== film.narrator;
        for (const c of film.clauses(v, 0)) {
          const chars = c.chars.filter((x) => !/[，。！？：；、\s]/.test(x.ch));
          if (!chars.length) continue;
          const rows = Math.max(1, Math.ceil(chars.length / perRow)); const per = Math.ceil(chars.length / rows);
          const size = Math.min(330, Math.floor(960 / per));
          const text = chars.map((x) => x.ch).join('');
          const hot = new Set(); for (const w of emphasize) { let i = text.indexOf(w); while (i >= 0) { for (let k = 0; k < [...w].length; k++) hot.add(i + k); i = text.indexOf(w, i + 1); } }
          const node = el('div', `kn-slide kn-${other ? 'other' : ['a', 'b', 'c'][n % 3]}`, '', `font-size:${size}px`);
          const spans = [];
          for (let r = 0; r < rows; r++) {
            const row = el('div', 'kn-row');
            chars.slice(r * per, (r + 1) * per).forEach((x, i) => { const s = el('span', hot.has(r * per + i) ? 'hot' : '', esc(x.ch)); row.appendChild(s); spans.push({ el: s, at: v.at + x.at }); });
            node.appendChild(row);
          }
          if (other) node.insertBefore(el('div', 'kn-who', esc((film.voices[v.who] || {}).tag || '')), node.firstChild);
          S.kin.appendChild(node);
          slides.push({ node, spans, from: v.at + c.from - 60, to: v.at + c.to - 60, rot: [-2, 1.5, -1][n % 3] });
          n += 1;
        }
      }
      // hold each slide until the next one starts, so the screen is never empty between lines
      slides.forEach((s, i) => { if (slides[i + 1]) s.to = slides[i + 1].from; else s.to = film.T.card; });
    },
    frame(t, ctx, film, S) {
      show(S.kin, !ctx.ending);
      for (const s of slides) {
        const on = t >= s.from && t < s.to;
        show(s.node, on);
        if (!on) continue;
        for (const c of s.spans) {
          const k = seg(t, c.at - 30, c.at + 170);
          c.el.style.opacity = String(clamp(k * 3)); c.el.style.transform = `scale(${(1 + 0.55 * (1 - E.power3Out(k))).toFixed(3)})`;
        }
        s.node.style.transform = `rotate(${s.rot}deg) scale(${(1 + 0.03 * seg(t, s.from, s.to)).toFixed(4)})`;
      }
    },
  };
}
