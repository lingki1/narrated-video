// Template "timeline" · 时间轴 / 路线图
// One line down the screen; the stops light up one by one as the story reaches them, each with a time and a short card, and the
// view follows the line. Good for: a day, a journey, a history, a process — anything whose spine is "then … then …".
import { E, clamp, el, esc, seg, show } from '../film.js';

export function timeline() {
  let stops = []; let laid = false;
  return {
    name: 'timeline',
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.tl = el('div', 'tl-view', '<div class="tl-track"><i class="tl-line"></i><i class="tl-fill"></i></div>'); S.stage.appendChild(S.tl);
      /** stops: [{ time, title, text, at, big }] — `at` is when the story reaches it */
      film.stops = (list) => {
        stops = list.map((s) => { const node = el('div', `tl-stop${s.big ? ' big' : ''}`, `<i></i><b class="nv-num">${esc(s.time)}</b><div class="tl-card"><h3>${s.title || ''}</h3>${s.text ? `<p>${s.text}</p>` : ''}</div>`); S.tl.firstChild.appendChild(node); film.cue(s.at, 'tick'); return { ...s, node }; });
      };
    },
    frame(t, ctx, film, S) {
      show(S.tl, !ctx.ending);
      if (ctx.ending || !stops.length) return;
      if (!laid) { let y = 60; for (const s of stops) { s.y = y; s.node.style.top = `${y}px`; s.h = s.node.offsetHeight; y += s.h + 70; } laid = true; }
      let cur = stops[0]; let prev = null;
      for (const s of stops) { const k = E.power3Out(seg(t, s.at, s.at + 420)); s.node.style.opacity = String(0.0 + k); s.node.style.transform = `translateX(${((1 - k) * 60).toFixed(1)}px)`; s.node.classList.toggle('on', t >= s.at);
        if (t >= s.at) { prev = cur; cur = s; } }
      const k = E.power3Out(seg(t, cur.at, cur.at + 600));
      const fillTo = (prev && prev !== cur ? prev.y : 0) + ((cur.y - (prev && prev !== cur ? prev.y : 0)) * k) + 34;
      S.tl.querySelector('.tl-fill').style.height = `${fillTo.toFixed(1)}px`;
      // keep the current stop about a third of the way down the view
      const want = (s) => Math.max(0, s.y - 260);
      const off = want(prev || cur) + (want(cur) - want(prev || cur)) * k;
      S.tl.firstChild.style.transform = `translateY(${(-off).toFixed(1)}px)`;
      for (const s of stops) s.node.classList.toggle('past', t >= s.at && s !== cur);
    },
  };
}
