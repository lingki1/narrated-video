// The film core: everything a narrated film needs that does not depend on how it LOOKS.
// It chains the timeline from the real voice-over lengths, knows when every character of every line is spoken, keeps the shots,
// sound cues and camera hits, runs the render loop, and exposes window.renderAt / DURATION / TIMELINE / sceneReady for render.mjs.
// How the film looks comes from a template (lib/templates/*.js): the template builds the stage, decides how the narrator's words
// and the other voices appear, and offers its own drawing helpers. Every visual is a pure function of t.
import { autoplay, clamp, ease, lerp, seg } from './motion.js';

export { clamp, ease, lerp, seg };
export const E = { ...ease };
export const NS = 'http://www.w3.org/2000/svg';
export const DEFAULT_THEME = { ink: '#111112', paper: '#F2EEE8', accent: '#FF3D72', accentDeep: '#D81B5C', desk: '#E7E1D8', night: '#17161B', floorNight: '#232127', mute: '#8d8880' };

// ───────────────────────── small helpers ─────────────────────────
/** Ask for a sound at `at` ms (a kind lib/sfx.py knows). Things that move call this for themselves while they are drawn —
 *  a footstep, a pop — and render.mjs walks the whole timeline once before building the sound, so every one of them lands in
 *  TIMELINE.stamps. Asking twice for the same kind within `grid` ms counts once. */
export function sfx(at, kind, grid = 60) {
  const T = typeof window !== 'undefined' && window.TIMELINE; if (!T) return;
  const seen = (window.__sfxSeen ||= new Set()); const key = `${kind}@${Math.round(at / grid)}`; if (seen.has(key)) return;
  seen.add(key); T.stamps.push([Math.round(at), kind]);
}
export const show = (e, v) => { const d = v ? '' : 'none'; if (e.style.display !== d) e.style.display = d; };
export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export function el(tag, cls, html = '', style = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) e.style.cssText = style;
  e.innerHTML = html;
  return e;
}
export function svgBox(w, h, html = '', cls = '', vx = 0, vy = 0) {
  const v = document.createElementNS(NS, 'svg');
  if (cls) v.setAttribute('class', cls);
  v.setAttribute('viewBox', `${vx} ${vy} ${w} ${h}`); v.setAttribute('width', String(w)); v.setAttribute('height', String(h));
  v.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  v.innerHTML = html; return v;
}
/** scale-in with a little overshoot, 0 before `at` */
export const pop = (t, at, dur = 260) => (t < at ? 0 : E.backOut(seg(t, at, at + dur), 1.7));
export const fade = (t, at, dur = 200) => seg(t, at, at + dur);
/**
 * Place an element. A scale of (almost) zero hides it with display:none instead of shrinking it, and a visible element is never
 * drawn smaller than 0.2: Chromium lays SVG <text> out at the scale it first sees and does not redo it when an HTML ancestor's
 * transform changes, so words laid out at scale 0.0001 stay invisible for good. Use this (or display:none) for anything that
 * appears — never scale(0) as a way to hide.
 */
export function tf(e, x, y, s = 1, r = 0, o = 1) {
  const on = s > 0.001; show(e, on); if (!on) return;
  e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${Math.max(0.2, s).toFixed(4)})`;
  e.style.opacity = String(clamp(o));
}
/** quiet entrance: rise a little and fade in, no bounce — the default for narrated pieces */
export const soft = (e, t, at, x = 0, y = 0, r = 0, o = 1) => tf(e, x, y + (1 - E.power3Out(seg(t, at, at + 320))) * 26, 1, r, fade(t, at, 260) * o);
/** loud entrance: slams down from oversize — keep it for the one or two moments that deserve it */
export function slam(e, t, at, rot = 0, big = 1.3, o = 1) {
  const k = seg(t, at, at + 180);
  tf(e, 0, 0, t < at ? 0.0001 : 1 + big * (1 - E.power3Out(k)), rot, clamp(k * 3) * o);
}
/** a line that draws itself: give the path pathLength="1"; k goes 0 → 1 */
export function drawn(path, k) { path.style.strokeDasharray = '1'; path.style.strokeDashoffset = String(1 - clamp(k)); path.style.visibility = k <= 0 ? 'hidden' : 'visible'; }
export const hhmm = (mins) => { const m = ((Math.floor(mins) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

/**
 * createFilm({ lines, durations, template, theme, narrator, voices, endGap, tail, envUrl })
 *   lines      [[id, gapBeforeMs, text], …] — the first letter of an id is the voice (L01, S01 …)
 *   durations  { id: ms } from vo-d.js (written by vo.py); missing ids fall back to an estimate, so a scene runs before any audio exists
 *   template   a template object (lib/templates/*.js): how the film looks
 *   narrator   the voice whose lines are the narration (default: the voice of the first line)
 *   voices     { S: { tag: '她' } } — the other voices
 *   theme      colours (see DEFAULT_THEME); the template may bring its own defaults
 *   size       [w, h] of the frame in px (default [1080, 1920]; [1920, 1080] for a wide film — #viewport gets the class `wide`)
 *   view       [x, y]: which point of the scene coordinates sits at the frame's top-left (default [0, 0]). A wide film made from
 *              scenes drawn 1080 wide uses view [-420, 396]: the same drawing, seen through a wider, shorter window
 * Returns the film: { vo, VO, T, wt(), wtAll(), endOf(), clauses(), shot(), cue(), hit(), talk(), board, stage, start() … }
 */
export function createFilm(opts) {
  const { lines, durations = {}, voices = {}, endGap = 900, tail = 2600, envUrl = './vo-env.json' } = opts;
  const tpl = opts.template || {};
  const [W, H] = opts.size || [1080, 1920]; const VIEW = opts.view || [0, 0];
  if (typeof window !== 'undefined') window.STAGE = { w: W, h: H, x: VIEW[0], y: VIEW[1] };
  const TH = { ...DEFAULT_THEME, ...(tpl.theme || {}), ...(opts.theme || {}) };
  const narrator = opts.narrator || lines[0][0][0];
  const VO = [];
  {
    let cur = 0;
    for (const [id, gap, text] of lines) {
      const dur = durations[id] ?? Math.round([...text].length * 215 + 400);
      const at = Math.max(0, cur + gap);
      VO.push({ id, at, dur, text, who: id[0] });
      cur = at + dur;
    }
  }
  const vo = Object.fromEntries(VO.map((v) => [v.id, v]));
  const endOf = (id) => vo[id].at + vo[id].dur;
  const lastEnd = Math.max(...VO.map((v) => v.at + v.dur));
  const T = { end: lastEnd + endGap, card: lastEnd + endGap + 400 };
  const DURATION = T.card + tail;

  // voice envelope → when each character of a line is spoken (available once start() has loaded vo-env.json, i.e. inside build())
  let VOENV = null;
  function charTimes(v, n) {
    const envl = VOENV && VOENV.env[v.id]; const pre = VOENV ? VOENV.pre * 1000 : 0;
    if (!envl) return Array.from({ length: n }, (_, k) => (k / n) * v.dur * 0.9);
    const voiced = envl.map((x) => x > 0.3); const total = voiced.filter(Boolean).length || 1;
    const out = []; let acc = 0; let k = 0;
    for (let i = 0; i < envl.length && k < n; i++) {
      if (!voiced[i]) continue;
      while (k < n && (k / n) * total <= acc) { out.push(Math.max(0, i * 20 - pre)); k += 1; }
      acc += 1;
    }
    while (out.length < n) out.push(v.dur * 0.9);
    return out;
  }
  const CT = {};
  const ct = (id) => { if (!CT[id]) CT[id] = charTimes(vo[id], [...vo[id].text].length); return CT[id]; };
  /** absolute time at which `word` starts being spoken inside line `id` (k-th occurrence); the line start if the word is not found */
  function wt(id, word, k = 0) {
    const v = vo[id];
    let i = -1;
    for (let n = 0; n <= k; n++) i = v.text.indexOf(word, i + 1);
    if (i < 0) console.warn(`wt: 「${word}」 is not in ${id}`);
    return v.at + (i < 0 ? 0 : ct(id)[[...v.text.slice(0, i)].length]);
  }
  /** absolute times of every occurrence of one character in line `id` */
  function wtAll(id, ch) {
    const v = vo[id]; const out = [];
    [...v.text].forEach((c, i) => { if (c === ch) out.push(v.at + ct(id)[i]); });
    return out;
  }
  /**
   * a line cut into clauses at the punctuation, with times relative to the line start:
   * [{ text, from, to, chars: [{ ch, at }] }] — what subtitles are built from, and what a template uses to show the words its own way
   */
  function clauses(v, maxMerge = 16) {
    const raw = v.text.match(/[^，。！？：；]+[，。！？：；]*/g) || [v.text];
    const parts = [];
    raw.forEach((ph, k) => {
      const last = parts[parts.length - 1];
      const bare = (x) => [...x.replace(/[，。！？：；\s]/g, '')].length;
      // a short clause that opens a new sentence ("……它也行。十天，美区……") waits for the clause after it, rather than hanging on the end of the sentence before
      const opens = last && /[。！？；]$/.test(last) && bare(last) > 2 && bare(ph) <= 2 && k + 1 < raw.length;
      if (last && !opens && (bare(last) <= 2 || bare(ph) <= 2) && [...last].length + [...ph].length <= maxMerge) parts[parts.length - 1] += ph;
      else parts.push(ph);
    });
    const times = ct(v.id); let idx = 0;
    const out = parts.map((ph) => { const n = [...ph].length; const c = { text: ph, from: times[idx], chars: [...ph].map((ch, i) => ({ ch, at: times[idx + i] })) }; idx += n; return c; });
    out.forEach((c, i) => { c.to = i + 1 < out.length ? out[i + 1].from : v.dur + 260; });
    return out;
  }

  const HITS = []; const STAMPS = []; const SHOTS = []; const EVERY = []; const S = {};
  function shake(t) {
    let x = 0; let y = 0; let r = 0;
    for (const [at, s] of HITS) {
      const d = t - at; if (d < 0 || d > 600) continue;
      const k = s * Math.exp(-d / 120);
      x += k * Math.sin(d / 16 + at); y += k * Math.cos(d / 21 + at * 1.3); r += k * 0.03 * Math.sin(d / 27 + at);
    }
    return { x, y, r };
  }

  const viewport = document.getElementById('viewport');
  viewport.classList.add(`tpl-${tpl.name || 'plain'}`); viewport.classList.toggle('wide', W > H);
  viewport.style.width = `${W}px`; viewport.style.height = `${H}px`;
  for (const [k, v] of Object.entries(TH)) viewport.style.setProperty(`--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v);
  S.stage = el('div', 'nv-stage', '', `width:${W}px;height:${H}px;transform-origin:${W / 2}px ${H / 2}px`); viewport.appendChild(S.stage);
  S.bg = el('div', 'nv-bg'); S.stage.appendChild(S.bg);

  const film = {
    VO, vo, T, DURATION, theme: TH, narrator, voices, wt, wtAll, endOf, charTimes, clauses,
    stage: S.stage, viewport, S, board: null, layer: null, W, H, view: VIEW,
    /** a shot lives on the board between two times; render(t) positions its pieces */
    shot(from, to, node, render) { SHOTS.push({ from, to, el: node, render }); film.board.appendChild(node); return node; },
    /** run fn(t, { night, ending }) on every frame — for pieces that live outside a shot */
    every(fn) { EVERY.push(fn); },
    /** sound cue for sound.py: kinds are whatever your sound.py handles (msg, tick, bell, stamp …) */
    cue(at, kind) { STAMPS.push([at, kind]); },
    /** camera shake at `at` (strength 10–35) */
    hit(at, strength = 20) { HITS.push([at, strength]); },
    /** is `who` (default: the narrator) speaking at t */
    speaking(t, who = narrator) { return VO.some((x) => x.who === who && t >= x.at && t < x.at + x.dur); },
    /** the line being spoken at t (any voice), or null */
    lineAt(t) { return VO.find((x) => t >= x.at && t < x.at + x.dur) || null; },
    /** 0…1 loudness of a voice at t — drive a mouth, a lid, a light with it */
    talk(t, who = narrator) {
      const v = VO.find((x) => x.who === who && t >= x.at && t < x.at + x.dur);
      if (!v) return 0;
      const envl = VOENV && VOENV.env[v.id];
      if (envl) { const i = Math.floor((t - v.at + VOENV.pre * 1000) / 20); return clamp((envl[i] ?? 0) * 1.15); }
      return 0.5 + 0.5 * Math.sin(t / 60);
    },
  };

  // the template builds the stage: it must leave film.board (where shots go); it may set film.layer (an svg for the character)
  if (tpl.mount) tpl.mount(film, S);
  if (!film.board) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; }
  if (!film.layer) { S.layer = svgBox(W, H, '', 'nv-layer', VIEW[0], VIEW[1]); S.stage.appendChild(S.layer); film.layer = S.layer; }
  S.card = el('div', 'nv-card', '<div class="tag"></div><div class="say"></div>'); S.stage.appendChild(S.card);
  S.endcard = el('div', 'nv-end'); S.stage.appendChild(S.endcard);
  S.subs = el('div', 'nv-subs'); viewport.appendChild(S.subs);
  const subsMode = tpl.subtitles ?? 'strips'; // 'strips' | 'none' (the template shows the words itself)
  const othersMode = tpl.others ?? 'card'; // 'card' | 'none'

  // ── subtitles: one clause at a time, characters appear as they are spoken (templates restyle them with CSS) ──
  function buildSub(v) {
    const block = el('div', 'nv-sblock');
    const plates = clauses(v).map((c, pi) => {
      const plate = el('div', 'plate', '', `--rot:${[-1.2, 0.9, -0.5][pi % 3]}deg`);
      // a subtitle does not end in punctuation: the marks that close a clause (，。？！：；、…) are spoken as a pause, not shown
      let n = c.chars.length; while (n > 1 && /[，。！？：；、,.!?:;…\s]/.test(c.chars[n - 1].ch)) n--;
      const fit = W > H ? 34 : 15;   // how many characters fit on one strip at full size
      if (n > fit) plate.style.fontSize = `calc(var(--sub-size, 54px) * ${(fit / n).toFixed(3)})`;
      const chars = c.chars.map((x, i) => { const s = el('span', 'c', x.ch === ' ' ? '&nbsp;' : esc(x.ch)); if (i >= n) s.style.display = 'none'; plate.appendChild(s); return { el: s, at: x.at }; });
      block.appendChild(plate);
      return { plate, chars, start: chars.length ? Math.max(c.from, chars[0].at) : c.from, to: c.to };
    });
    S.subs.appendChild(block);
    return { v, block, plates };
  }
  function renderSubs(t, night) {
    for (const sb of S.subBlocks) {
      const v = sb.v; const on = t >= v.at - 120 && t < v.at + v.dur + 300;
      show(sb.block, on);
      if (!on) continue;
      const since = t - v.at;
      for (let i = 0; i < sb.plates.length; i++) {
        // a plate comes in with its first spoken character (never an empty plate over a pause) and stays until the next one starts
        const p = sb.plates[i]; const next = sb.plates[i + 1];
        const vis = since >= p.start - 30 && since < (next ? next.start - 30 : p.to - 60);
        show(p.plate, vis);
        if (!vis) continue;
        const k = E.power3Out(seg(since, p.start - 30, p.start + 140));
        p.plate.style.transform = `rotate(var(--rot)) scaleX(${Math.max(0.001, k).toFixed(3)})`;
        p.plate.classList.toggle('dark', night);
        const kara = film.options && film.options.subs === 'karaoke';
        for (const c of p.chars) { const q = E.power3Out(seg(since, c.at, c.at + 110)); c.el.style.opacity = String(kara ? 0.42 + 0.58 * q : q); c.el.style.transform = kara ? '' : `translateY(${((1 - q) * 0.3).toFixed(3)}em)`; }
      }
    }
  }
  // ── the pinned card: a line spoken by anyone but the narrator, typed as it is said ──
  function renderCard(t) {
    let cur = null;
    for (const b of S.cardLines) if (t >= b.v.at - 60) cur = b;
    const vis = cur && t < T.card && t < cur.until;
    show(S.card, !!vis);
    if (!vis) return 0;
    const v = cur.v; const since = t - v.at; const who = voices[v.who] || {};
    if (S.cardCur !== v.id) {
      S.cardCur = v.id; S.card.querySelector('.tag').textContent = who.tag || v.who;
      const say = S.card.querySelector('.say');
      // lines break between words, never inside one, and never before a closing punctuation mark (each character is its own
      // span for the typing effect, so the browser would otherwise break anywhere — 「第 / 一」, or a comma starting a line)
      const sp = (ch) => `<span class="c">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`;
      const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(v.text)].map((x) => x.segment) : [...v.text];
      const toks = []; for (const w of seg) { if (toks.length && /^[，。！？；：、」』”’）》…]+$/.test(w)) toks[toks.length - 1] += w; else toks.push(w); }
      const html = toks.map((w) => `<span style="white-space:nowrap">${[...w].map(sp).join('')}</span>`).join('');
      say.innerHTML = html; S.cardChars = [...say.querySelectorAll('.c')];
      const n = [...v.text].length; say.style.fontSize = n > 16 ? '52px' : n >= 14 ? `${Math.floor(880 / n)}px` : '';
      S.card.classList.toggle('plain', !!who.plain);
    }
    S.cardChars.forEach((c, i) => { c.style.opacity = since >= cur.times[i] ? '1' : '0'; });
    const k = seg(t, v.at - 60, v.at + 260); const o = clamp(k * 2) * (1 - fade(t, cur.until - 300, 300));
    S.card.style.transform = `translateY(${((1 - E.power3Out(k)) * 30).toFixed(1)}px) rotate(-2deg)`;
    S.card.style.opacity = String(o);
    return o;
  }

  // ── the chapter bar: the film's progress along the bottom, cut into chapters ──
  function buildProgress(chapters) {
    const starts = chapters.map(([, id], k) => { if (k === 0) return 0; const i = VO.indexOf(vo[id]); const prev = VO[i - 1]; return prev ? (prev.at + prev.dur + vo[id].at) / 2 : vo[id].at; });
    const total = T.end;
    const segs = chapters.map(([label, , tag], k) => { const from = starts[k]; const to = k + 1 < starts.length ? starts[k + 1] : total; return { label, tag, from, to, x: (from / total) * W, w: ((to - from) / total) * W }; });
    const row = () => segs.map((g) => `<div class="seg" style="left:${g.x.toFixed(1)}px;width:${g.w.toFixed(1)}px"><span>${g.tag ? `<i>${esc(g.tag)}</i>` : ''}${esc(g.label)}</span></div>`).join('');
    S.progress = el('div', 'nv-progress', `<div class="row track" style="width:${W}px">${row()}</div><div class="fill"><div class="row" style="width:${W}px">${row()}</div></div><div class="head"></div>`);
    viewport.appendChild(S.progress); viewport.classList.add('has-progress');
    S.progSegs = segs; S.progTrack = [...S.progress.querySelectorAll('.track .seg')]; S.progFill = S.progress.querySelector('.fill'); S.progHead = S.progress.querySelector('.head');
    film.chapters = segs;
  }
  /** once the fonts are in: a label wider than its chapter is set smaller (both copies), never cut */
  function fitProgress() {
    if (!S.progress) return;
    const rows = [...S.progress.querySelectorAll('.row')].map((r) => [...r.querySelectorAll('.seg')]);
    S.progSegs.forEach((g, k) => {
      const span = rows[0][k].firstElementChild; const need = span.offsetWidth + 22;
      if (need > g.w) for (const r of rows) r[k].style.fontSize = `${Math.max(12, Math.floor(23 * (g.w / need)))}px`;
    });
  }
  function renderProgress(t, ending) {
    if (!S.progress) return;
    const from = film.T.open ?? 0; const o = clamp(seg(t, from, from + 400)) * (1 - clamp(seg(t, T.end, T.card)));
    show(S.progress, o > 0 && !ending); if (o <= 0 || ending) return;
    S.progress.style.opacity = String(o);
    const x = clamp(t / T.end) * W;
    S.progFill.style.width = `${x.toFixed(1)}px`; S.progHead.style.left = `${(x - 2).toFixed(1)}px`;
    S.progSegs.forEach((g, k) => { S.progTrack[k].classList.toggle('later', t < g.from); S.progTrack[k].classList.toggle('now', t >= g.from && t < g.to); });
  }

  /**
   * start({ build, night, character, endcard, fonts, onRender, …template options })
   *   build(film)   add the shots (wt() works here: the voice envelope is loaded)
   *   night(t)      → true while the night palette is on
   *   character     { mount(svgLayer, film), render(t, film, { night, ending }) } — see buddy.js, or draw your own
   *   endcard       HTML for the closing card (shown from T.card)
   *   fonts         extra CSS font shorthands to wait for
 *   chapters      [[label, firstLineId], …] — a progress bar along the bottom of a wide film, cut into chapters whose widths are
 *                 their share of the running time; the chapter being played is lit, a thin accent line runs to the playhead
 *   subs          'karaoke': a clause is on its plate from its first word, dim, and lights up character by character
   *   anything else is for the template (e.g. the board template's `clock`)
   */
  film.start = (o = {}) => {
    film.options = o;
    let renderAt = () => {};
    // nothing may be laid out before the fonts are in: Chromium lays SVG <text> out once with the blank placeholder face
    // and never redoes it (the words of a drawing just stay missing), so the stage stays undisplayed until then
    S.stage.style.display = 'none';
    const ready = (async () => {
      VOENV = await fetch(envUrl).then((r) => r.json()).catch(() => null);
      if (o.endcard) S.endcard.innerHTML = o.endcard;
      if (o.character) o.character.mount(film.layer, film);
      if (tpl.prepare) tpl.prepare(film, S, o);
      if (o.build) o.build(film);
      if (tpl.built) tpl.built(film, S, o);
      if (o.chapters && o.chapters.length) buildProgress(o.chapters);
      // the pinned card stays 1.6 s after its line, or until shortly after the next line starts — whichever comes first
      const cardUntil = (v) => { const next = VO[VO.indexOf(v) + 1]; const end = v.at + v.dur + 1600; return next ? Math.min(end, Math.max(next.at + 200, v.at + v.dur + 500)) : end; };
      S.cardLines = othersMode === 'card' ? VO.filter((v) => v.who !== narrator).map((v) => ({ v, until: cardUntil(v), times: charTimes(v, [...v.text].length) })) : [];
      for (const v of VO) if (v.who !== narrator) STAMPS.push([v.at + 40, 'card']);
      S.subBlocks = subsMode === 'strips' ? VO.filter((v) => v.who === narrator).map(buildSub) : [];
      // every character that will ever be on screen has to be known before the fonts are requested (they load per character range)
      const labels = (tpl.labels ? tpl.labels(film, o) : '') + Object.values(voices).map((x) => x.tag || '').join('');
      const all = document.body.textContent + VO.map((v) => v.text).join('') + labels + '0123456789:·';
      const faces = ['500 16px "Noto Sans SC"', '800 16px "Noto Sans SC"', '900 16px "Noto Sans SC"', '900 16px "Noto Serif SC"', '900 16px "Inter Tight"', '800 16px "Inter Tight"', 'italic 400 16px "Instrument Serif"',
        ...(tpl.fonts || []), ...(o.fonts || [])];
      await Promise.all(faces.map((f) => document.fonts.load(f, all).catch(() => null)));
      await document.fonts.ready;
      S.stage.style.display = '';
      fitProgress();
      renderAt(0);
    })();
    renderAt = (t) => {
      const sh = shake(t);
      S.stage.style.transform = `translate(${sh.x.toFixed(2)}px, ${sh.y.toFixed(2)}px) rotate(${sh.r.toFixed(3)}deg)`;
      const ending = t >= T.card; const night = o.night ? !!o.night(t) : false;
      const ctx = { night, ending };
      S.stage.classList.toggle('night', night); viewport.classList.toggle('night', night);
      show(film.board, !ending);
      if (tpl.frame) tpl.frame(t, ctx, film, S, o);
      for (const s of SHOTS) { const on = t >= s.from && t < s.to; show(s.el, on); if (on) s.render(t); }
      for (const f of EVERY) f(t, ctx);
      ctx.cardOpacity = renderCard(t);
      if (tpl.afterCard) tpl.afterCard(t, ctx, film, S, o);
      if (o.character) o.character.render(t, film, ctx);
      show(S.endcard, ending && !!o.endcard);
      if (ending) { const k = E.power3Out(seg(t, T.card, T.card + 600)); S.endcard.style.transform = `scale(${(0.94 + 0.06 * k).toFixed(4)})`; S.endcard.style.opacity = String(clamp(seg(t, T.card, T.card + 400))); }
      renderSubs(t, night);
      renderProgress(t, ending);
      if (o.onRender) o.onRender(t, ctx);
    };
    window.renderAt = (t) => renderAt(t);
    window.DURATION = DURATION;
    window.TIMELINE = { duration: DURATION, T, vo: VO.map((v) => ({ id: v.id, at: v.at, dur: v.dur, who: v.who })), hits: HITS, stamps: STAMPS };
    window.sceneReady = ready;
    ready.then(() => autoplay(window.renderAt, DURATION));
    if (!new URLSearchParams(location.search).has('render')) {
      const fit = () => { viewport.style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
      fit(); addEventListener('resize', fit);
    }
    return ready;
  };
  return film;
}
