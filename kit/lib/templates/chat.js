// Template "chat" · 聊天记录
// The story happens in a message thread: bubbles arrive with a "typing…" beat, time stamps mark the jumps, the list scrolls by
// itself; the narrator comments in a caption under the thread. Good for: anything that really happened as messages.
// The look is generic on purpose — do not copy a real app's interface (colours, icons, layout) unless it is your own app.
import { E, el, esc, seg, show } from '../film.js';

export function chat({ name = '她', avatar = '她', me = '我' } = {}) {
  const items = []; // { node, at, kind, typing }
  let laid = false; let viewH = 0;
  const tpl = {
    name: 'chat',
    others: 'none',
    mount(film, S) {
      S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board;
      S.chat = el('div', 'ch-app', `<div class="ch-head"><span class="ch-av">${esc(avatar)}</span><b>${esc(name)}</b></div><div class="ch-view"><div class="ch-list"></div></div>`);
      S.stage.appendChild(S.chat); S.chatList = S.chat.querySelector('.ch-list'); S.chatView = S.chat.querySelector('.ch-view');
      /** a message. side: 'them' | 'me'. typing: ms of "typing…" shown before it arrives (0 = none) */
      film.msg = (side, text, at, typing = 900) => {
        const node = el('div', `ch-row ch-${side}`, `${side === 'them' ? `<span class="ch-av">${esc(avatar)}</span>` : ''}<div class="ch-b">${esc(text)}</div>${side === 'me' ? `<span class="ch-av me">${esc(me)}</span>` : ''}`);
        const dots = typing ? el('div', `ch-row ch-${side} ch-typing`, `${side === 'them' ? `<span class="ch-av">${esc(avatar)}</span>` : ''}<div class="ch-b"><i></i><i></i><i></i></div>${side === 'me' ? `<span class="ch-av me">${esc(me)}</span>` : ''}`) : null;
        S.chatList.appendChild(node); items.push({ node, at, kind: 'msg', dots, typing }); film.cue(at, 'msg');
        return node;
      };
      /** a time stamp or a system note between messages */
      film.stamp = (text, at) => { const node = el('div', 'ch-time', esc(text)); S.chatList.appendChild(node); items.push({ node, at, kind: 'time' }); return node; };
    },
    frame(t, ctx, film, S) {
      show(S.chat, !ctx.ending);
      if (ctx.ending) return;
      if (!laid) { // measure once (fonts are in); positions never change, so any frame can be rendered on its own
        viewH = S.chatView.clientHeight; let y = 30;
        for (const it of items) { it.y = y; it.h = it.node.offsetHeight; y += it.h + (it.kind === 'time' ? 34 : 26); it.node.style.top = `${it.y}px`; if (it.dots) { S.chatList.appendChild(it.dots); it.dots.style.top = `${it.y}px`; it.dh = it.dots.offsetHeight; } }
        laid = true;
      }
      let bottom = 0;
      for (const it of items) {
        const k = E.power3Out(seg(t, it.at, it.at + 260));
        it.node.style.opacity = String(k); it.node.style.transform = `translateY(${((1 - k) * 30).toFixed(1)}px)`;
        if (it.dots) {
          const on = t >= it.at - it.typing && t < it.at;
          show(it.dots, on);
          if (on) { [...it.dots.querySelectorAll('i')].forEach((d, i) => { d.style.transform = `translateY(${(-8 * Math.max(0, Math.sin((t - it.at) / 110 + i * 1.1))).toFixed(1)}px)`; }); bottom = Math.max(bottom, it.y + it.dh + 40); }
        }
        if (t >= it.at) bottom = Math.max(bottom, it.y + it.h + 40);
      }
      // scroll so the newest thing is visible; eased towards the target of the latest item
      let target = 0; let from = 0; let since = 0;
      for (const it of items) {
        const start = it.dots ? it.at - it.typing : it.at;
        if (t >= start) { const need = Math.max(0, it.y + Math.max(it.h, it.dh || 0) + 40 - viewH); if (need > target) { from = target; target = need; since = start; } }
      }
      const off = from + (target - from) * E.power3Out(seg(t, since, since + 420));
      S.chatList.style.transform = `translateY(${(-off).toFixed(1)}px)`;
    },
  };
  return tpl;
}
