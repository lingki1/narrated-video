// Template "screen" · 假界面 / 录屏感
// The whole frame is a made-up device screen: windows open, text is typed and deleted, notifications drop in, a list gets ticked.
// Good for: stories that happen on a phone or a computer — searching, drafting, deleting, waiting for a reply.
// The interface is generic on purpose: do not imitate a real app or system (their look is theirs) unless it is your own product.
import { E, clamp, el, esc, seg, show } from '../film.js';

export function screen({ clock = null } = {}) {
  return {
    name: 'screen',
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full sc-desk'); S.stage.appendChild(S.board); film.board = S.board;
      S.bar = el('div', 'sc-bar', '<b class="nv-num"></b><span><i></i><i></i><i></i></span>'); S.stage.appendChild(S.bar);
    },
    labels: () => '0123456789:',
    frame(t, ctx, film, S) { const txt = clock ? clock(t) : ''; const b = S.bar.firstChild; if (b.textContent !== txt) b.textContent = txt; S.bar.style.display = ctx.ending ? 'none' : ''; },
  };
}

/** ui(film, from, to) → the things on the screen between two times: win(), toast(), each() */
export function ui(film, from, to) {
  const node = el('div', 'nv-shot'); const parts = [];
  film.shot(from, to, node, (t) => { for (const p of parts) p(t); });
  return {
    node, each: (fn) => parts.push(fn),
    /** a window; returns its body element (fill it with your own html, or use typeLine / todo below) */
    win({ title, x, y, w, h, at, until = Infinity }) {
      const e = el('div', 'sc-win', `<div class="sc-title"><i></i><i></i><i></i><b>${esc(title)}</b></div><div class="sc-body"></div>`, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`); node.appendChild(e);
      parts.push((t) => { const k = E.backOut(seg(t, at, at + 320), 1.3); const z = Number.isFinite(until) ? seg(t, until, until + 220) : 0; show(e, t >= at && z < 1); e.style.transform = `scale(${(0.85 + 0.15 * k - z * 0.1).toFixed(4)})`; e.style.opacity = String(clamp(seg(t, at, at + 120)) * (1 - z)); });
      return e.querySelector('.sc-body');
    },
    /** a notification that drops in from the top and leaves after `hold` ms */
    toast({ title, text, at, hold = 2600, y = 300 }) {
      const e = el('div', 'sc-toast', `<b>${esc(title)}</b><span>${esc(text)}</span>`, `top:${y}px`); node.appendChild(e); film.cue(at, 'msg');
      parts.push((t) => { const k = E.power3Out(seg(t, at, at + 320)); const z = E.power2In(seg(t, at + hold, at + hold + 300)); e.style.transform = `translateY(${((1 - k) * -260 - z * 260).toFixed(1)}px)`; e.style.opacity = String(t < at ? 0 : 1 - z); });
      return e;
    },
    /**
     * a line of text typed into `body` from `at` at `cps` characters per second, with a caret; if `erase` is set, it is deleted
     * again starting at that time (people draft and delete — that is what makes a screen feel lived in)
     */
    typeLine(body, text, { at, cps = 9, erase = null, cls = '' } = {}) {
      const e = el('div', `sc-line ${cls}`, `<span></span><i class="sc-caret"></i>`); body.appendChild(e);
      const span = e.firstChild; const chars = [...text]; const done = at + chars.length / cps * 1000;
      parts.push((t) => {
        let n = Math.floor(clamp((t - at) / 1000 * cps, 0, chars.length));
        if (erase !== null && t >= erase) n = Math.max(0, chars.length - Math.floor((t - erase) / 1000 * cps * 4));
        const s = chars.slice(0, n).join(''); if (span.textContent !== s) span.textContent = s;
        const active = t >= at && (t < done + 400 || (erase !== null && t >= erase && n > 0));
        e.style.display = t >= at && (erase === null || n > 0 || t < erase) ? '' : 'none';
        e.querySelector('.sc-caret').style.opacity = active && Math.floor(t / 400) % 2 === 0 ? '1' : '0';
      });
      return e;
    },
    /** a checklist inside `body`: items [{ text, at, done }] appear at `at`, get ticked at `done` */
    todo(body, items) {
      const els = items.map((it) => { const r = el('div', 'sc-todo', `<i></i><span>${esc(it.text)}</span>`); body.appendChild(r); return r; });
      parts.push((t) => els.forEach((r, i) => { r.style.opacity = String(clamp(seg(t, items[i].at, items[i].at + 200))); r.classList.toggle('done', items[i].done != null && t >= items[i].done); }));
      return els;
    },
  };
}
