// Deterministic timeline helpers. Every scene exposes `window.renderAt(ms)`; nothing animates on its own,
// so the renderer can seek to any frame and get the exact same pixels.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** 0→1 progress of `t` inside [start, end]. */
export const seg = (t, start, end) => clamp((t - start) / (end - start));
export const lerp = (a, b, p) => a + (b - a) * p;

// src/motion/easing.ts: powerIn(n) = t^(n+1), powerOut(n) = 1-(1-t)^(n+1).
export const ease = {
  linear: (t) => t,
  power2In: (t) => t ** 3,
  power2Out: (t) => 1 - (1 - t) ** 3,
  power3Out: (t) => 1 - (1 - t) ** 4,
  power4Out: (t) => 1 - (1 - t) ** 5,
  power3InOut: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (1 - t) ** 4),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t, s = 1.70158) => { const p = t - 1; return p * p * ((s + 1) * p + s) + 1; },
};

/** Characters of `text` visible at time t when typed from `start` at `cps` chars/second. */
export function typed(text, t, start, cps) {
  if (t < start) return '';
  return text.slice(0, Math.floor((t - start) / 1000 * cps));
}

/**
 * Real-time preview: open the page with ?play (loops) — the renderer never passes it.
 * If render.mjs has already written <film>/out/<scene>.wav, a click turns the sound on and from then on the audio clock
 * drives the picture (so they cannot drift apart). Click / Space = pause, ← → = ∓1 s, Home = back to the start.
 */
export function autoplay(renderAt, durationMs) {
  const params = new URLSearchParams(location.search);
  if (params.has('t')) { renderAt(Number(params.get('t'))); return; }
  if (!params.has('play')) { renderAt(0); return; }

  const scene = location.pathname.split('/').filter(Boolean).slice(-2, -1)[0];
  const audio = new Audio(`./out/${scene}.wav`);
  audio.preload = 'auto';
  audio.loop = true;
  let withSound = false; // true once the user has clicked and the audio clock has taken over
  let paused = false;
  let clock = 0; let last = performance.now();

  // Phones do not preload audio (canplaythrough never comes before a tap), so there the tap itself starts the loading.
  const touch = matchMedia('(pointer: coarse)').matches;
  let starting = false;

  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;left:12px;top:12px;z-index:99;padding:8px 14px;border-radius:99px;background:rgba(0,0,0,.72);'
    + `color:#fff;font:600 ${touch ? 15 : 13}px/1.3 system-ui,sans-serif;cursor:pointer;user-select:none;display:none`;
  hint.textContent = touch ? '🔊 点一下屏幕开声音 · 再点暂停' : '🔊 点击开启声音 · 空格暂停 · ←→ 快退快进';
  document.body.appendChild(hint);
  if (touch) hint.style.display = '';
  audio.addEventListener('canplaythrough', () => { if (!withSound) hint.style.display = ''; }, { once: true });

  const seek = (ms) => {
    clock = ((ms % durationMs) + durationMs) % durationMs;
    if (withSound) audio.currentTime = clock / 1000;
  };
  const soundOn = () => {
    withSound = true; paused = false;
    audio.currentTime = clock / 1000;
    hint.textContent = touch ? '🔊 有声播放中 · 点屏幕暂停 · 拖底下的条跳转' : '🔊 有声播放中 · 空格暂停 · ←→ 快退快进';
    setTimeout(() => { hint.style.display = 'none'; }, 2500);
  };
  const toggle = () => {
    if (!withSound && audio.readyState >= 3) { soundOn(); audio.play(); return; }
    if (!withSound && touch) {
      if (starting) return;
      starting = true; hint.textContent = '🔊 正在加载声音…';
      audio.play().then(soundOn, () => { hint.textContent = '没有声音文件 · 无声播放'; }).finally(() => { starting = false; });
      return;
    }
    paused = !paused;
    if (withSound) { if (paused) audio.pause(); else audio.play(); }
  };
  addEventListener('click', toggle);

  // touch screens have no arrow keys: a scrub bar with the time, so a mistimed line can be reported by its second
  let bar = null; let stamp = null; let shown = -1;
  if (touch) {
    const row = document.createElement('div');
    row.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99;display:flex;align-items:center;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));'
      + 'background:rgba(0,0,0,.72);color:#fff;font:600 14px/1 ui-monospace,monospace;user-select:none';
    stamp = document.createElement('span'); stamp.style.minWidth = '9ch';
    bar = document.createElement('input'); bar.type = 'range'; bar.min = '0'; bar.max = String(durationMs); bar.step = '100'; bar.value = '0';
    bar.style.cssText = 'flex:1;height:28px;accent-color:#FF3D72';
    bar.addEventListener('input', () => seek(Number(bar.value)));
    row.addEventListener('click', (e) => e.stopPropagation());
    row.append(stamp, bar); document.body.appendChild(row);
  }
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowLeft') seek(clock - 1000);
    if (e.code === 'ArrowRight') seek(clock + 1000);
    if (e.code === 'Home') seek(0);
  });

  const tick = (now) => {
    if (withSound) clock = audio.currentTime * 1000;
    else if (!paused) clock = (clock + (now - last)) % durationMs;
    last = now;
    renderAt(clock);
    if (bar && Math.floor(clock / 500) !== shown) {
      shown = Math.floor(clock / 500);
      stamp.textContent = `${mmss(clock)} / ${mmss(durationMs)}`;
      if (document.activeElement !== bar) bar.value = String(clock);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
