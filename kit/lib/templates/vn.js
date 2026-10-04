// Template "vn" · 视觉小说对话框
// A full-screen background, a character standing in it, and a dialogue box at the bottom: name plate, text typed out as it is
// spoken, a ▼ when the line is done. Every voice speaks through the box. Good for: dialogue-heavy pieces, role-play, inner voices.
// Options: names { L: '我', S: '她' } — the name plate for each voice.
import { clamp, el, esc, show } from '../film.js';

export function vn({ names = {} } = {}) {
  let lines = null;
  return {
    name: 'vn',
    subtitles: 'none', others: 'none',
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.box = el('div', 'vn-box', '<div class="vn-name"></div><div class="vn-text"></div><i class="vn-next">▼</i>'); S.stage.appendChild(S.box);
    },
    labels: () => Object.values(names).join('') + '▼',
    built(film) {
      lines = film.VO.map((v) => ({ v, times: film.charTimes(v, [...v.text].length), html: [...v.text].map((ch) => `<span>${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('') }));
    },
    frame(t, ctx, film, S) {
      let cur = null;
      for (const l of lines) if (t >= l.v.at - 80) cur = l;
      show(S.box, !ctx.ending && !!cur);
      if (ctx.ending || !cur) return;
      const v = cur.v;
      if (S.boxCur !== v.id) {
        S.boxCur = v.id; S.box.querySelector('.vn-text').innerHTML = cur.html; S.boxChars = [...S.box.querySelectorAll('.vn-text span')];
        const nm = S.box.querySelector('.vn-name'); nm.textContent = names[v.who] || (film.voices[v.who] || {}).tag || v.who;
        S.box.classList.toggle('other', v.who !== film.narrator);
        const n = S.boxChars.length; S.box.querySelector('.vn-text').style.fontSize = n > 44 ? '50px' : n > 30 ? '56px' : '';
      }
      const since = t - v.at;
      S.boxChars.forEach((c, i) => { c.style.opacity = since >= cur.times[i] ? '1' : '0'; });
      const done = since > v.dur;
      S.box.querySelector('.vn-next').style.opacity = done ? String(0.4 + 0.6 * clamp(Math.sin(t / 180) * 0.5 + 0.5)) : '0';
    },
  };
}
