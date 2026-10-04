// Template "podcast" · 播客体（audiogram）
// The narrator in the middle, the real waveform of the voice under them, and the words lighting up as they are said. Nothing else.
// The cheapest template to make and the fallback when a piece is mostly for listening. Options: title (top line).
import { clamp, el, esc, show } from '../film.js';

export function podcast({ title = '', bars = 44 } = {}) {
  let lines = null;
  return {
    name: 'podcast',
    subtitles: 'none', others: 'none',
    labels: () => title,
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.pc = el('div', 'pc-wrap', `<div class="pc-title">${esc(title)}</div><div class="pc-wave">${'<i></i>'.repeat(bars)}</div><div class="pc-who"></div><div class="pc-words"></div>`); S.stage.appendChild(S.pc);
      S.pcBars = [...S.pc.querySelectorAll('.pc-wave i')];
    },
    built(film) {
      lines = [];
      for (const v of film.VO) for (const c of film.clauses(v, 12)) lines.push({ v, from: v.at + c.from - 80, to: v.at + c.to - 80, chars: c.chars, html: c.chars.map((x) => `<span>${x.ch === ' ' ? '&nbsp;' : esc(x.ch)}</span>`).join('') });
    },
    frame(t, ctx, film, S) {
      show(S.pc, !ctx.ending);
      if (ctx.ending) return;
      // the waveform: the loudness of whoever is speaking over the last second and a half, newest on the right
      const who = (film.lineAt(t) || {}).who;
      S.pcBars.forEach((b, i) => { const back = (S.pcBars.length - 1 - i) * 36; const v = film.lineAt(t - back); const a = v ? film.talk(t - back, v.who) : 0; b.style.height = `${(8 + a * 230 * (0.75 + 0.25 * Math.sin(i * 1.7))).toFixed(1)}px`; });
      S.pc.classList.toggle('other', !!who && who !== film.narrator);
      let cur = null;
      for (const l of lines) if (t >= l.from && t < l.to) cur = l;
      const words = S.pc.querySelector('.pc-words');
      if (!cur) { words.style.opacity = '0'; return; }
      if (S.pcCur !== cur) { S.pcCur = cur; words.innerHTML = cur.html; S.pcChars = [...words.children]; const n = cur.chars.length; words.style.fontSize = n > 11 ? `${Math.floor(960 / n)}px` : ''; S.pc.querySelector('.pc-who').textContent = cur.v.who === film.narrator ? '' : (film.voices[cur.v.who] || {}).tag || ''; }
      words.style.opacity = '1';
      S.pcChars.forEach((c, i) => { c.classList.toggle('said', t - cur.v.at >= cur.chars[i].at); });
      void clamp;
    },
  };
}
