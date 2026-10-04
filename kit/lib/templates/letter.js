// Template "letter" · 信纸 / 日记手写
// A sheet of lined paper; the narration writes itself on it, character by character, in a handwriting face, and the page moves up
// as it fills. Almost nothing else on screen. Good for: monologues, letters, the quiet piece where people should just listen.
// Options: date (header), perRow (characters per row, default 13), underline: ['词', …] words underlined in the accent colour.
import { E, clamp, el, esc, seg, show } from '../film.js';

export function letter({ date = '', perRow = 13, underline = [] } = {}) {
  const ROW = 104; const SIZE = 64; const LEFT = 120; const TOP = 190;
  const cells = []; let rows = 0; const breaks = [];
  return {
    name: 'letter',
    subtitles: 'none', others: 'none',
    fonts: ['400 16px "Ma Shan Zheng"'],
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.sheet = el('div', 'lt-sheet', `<div class="lt-date nv-hand">${esc(date)}</div><div class="lt-scroll"><div class="lt-lines"></div><div class="lt-text nv-hand"></div></div><i class="lt-margin"></i>`);
      S.stage.appendChild(S.sheet);
    },
    labels: () => date,
    built(film, S) {
      const text = S.sheet.querySelector('.lt-text'); let r = 0; let c = 0;
      for (const v of film.VO) {
        const other = v.who !== film.narrator; const times = film.charTimes(v, [...v.text].length);
        if (c > 0) { r += 1; c = 0; } // every line of the script starts a new row; a blank row between paragraphs
        c = other ? 0 : 2; // indent the narrator's paragraphs, the other voice sits flush left in the accent colour
        const str = v.text; const hot = new Set();
        for (const w of underline) { let i = str.indexOf(w); while (i >= 0) { const base = [...str.slice(0, i)].length; for (let k = 0; k < [...w].length; k++) hot.add(base + k); i = str.indexOf(w, i + 1); } }
        [...str].forEach((ch, i) => {
          if (c >= perRow && !/[，。！？：；、」）]/.test(ch)) { r += 1; c = 0; }
          const s = el('span', `${other ? 'other' : ''}${hot.has(i) ? ' hot' : ''}`, ch === ' ' ? '&nbsp;' : esc(ch), `left:${LEFT + c * SIZE}px;top:${TOP + r * ROW}px`);
          text.appendChild(s); cells.push({ el: s, at: v.at + times[i], row: r }); c += 1;
        });
        breaks.push({ at: v.at, row: r });
      }
      rows = r + 1;
      S.sheet.querySelector('.lt-lines').style.height = `${TOP + (rows + 12) * ROW}px`;
    },
    frame(t, ctx, film, S) {
      show(S.sheet, !ctx.ending);
      if (ctx.ending) return;
      let row = 0; let since = 0;
      for (const c of cells) { const k = clamp(seg(t, c.at, c.at + 140)); c.el.style.opacity = String(k); if (t >= c.at && c.row >= row) { if (c.row > row) since = c.at; row = c.row; } }
      // keep the row being written around the 9th line of the sheet
      const target = Math.max(0, row - 8) * ROW; const prev = Math.max(0, row - 9) * ROW;
      const off = row <= 8 ? 0 : prev + (target - prev) * E.power3Out(seg(t, since, since + 500));
      S.sheet.querySelector('.lt-scroll').style.transform = `translateY(${(-off).toFixed(1)}px)`;
    },
  };
}
