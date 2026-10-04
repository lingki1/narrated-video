// Look 2 · a richer picture for explainer scenes, still flat colour: a camera that frames what is being talked about, a set
// behind every scene (tone-on-tone dressing that drifts a little and moves less than the foreground), hard shadows, object
// drawings from open icon sets in the project's palette, a heading that steps aside, and a round wipe between scenes.
// Everything is a pure function of t. Scenes keep being written as before; a reel switches the look on with:
//
//   import { look2, iconKit } from '../../lib/look.js';
//   const sc = look2(film, { set: 'room' });            // instead of makeSc(film)
//   sc(from, to, { bg, svg, set: 'server', cam: [[t0, [x0, y0, x1, y1]], [wt('L01', '词'), [x0, y0, x1, y1]]] }, render)
//
// cam: keyframes [arriveAt, rect | null, moveMs = 700]. A rect is a region of the scene (scene coordinates) the frame should
// hold; null is the whole scene. Without cam the scene gets a slow push. The frame never leaves the painted scene.
import { E, clamp, el, hash, lerp, seg, svgBox } from './film.js';
import { scene } from './templates/picture.js';
import { FX, K, ST } from './parts.js';
import { LIVE } from './actor.js';

// ───────────────────────── colour ─────────────────────────
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = rgb(a); const B = rgb(b); return `#${A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('')}`; };
/** a step darker (towards ink) / lighter (towards white): the colours of a set are derived from the scene's own background */
export const shade = (c, k) => mix(c, '#111112', k);
export const tint = (c, k) => mix(c, '#FFFFFF', k);

// ───────────────────────── shared <defs> (filters live once in the page; every inline svg can use them) ─────────────────────────
let DEFS = null; const SIL = new Set();
function defs() {
  if (DEFS || typeof document === 'undefined') return DEFS;
  const holder = svgBox(0, 0, '<defs></defs>'); holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(holder);
  DEFS = holder.querySelector('defs');
  // an ink outline round whatever is drawn (radius in the element's own units, so it scales with the drawing)
  DEFS.innerHTML = [['nv-ol', 1.1], ['nv-ol-thin', 0.7]].map(([id, r]) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="${K.ink}" result="f"/><feComposite in="f" in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`).join('');
  return DEFS;
}
/** a filter that paints a drawing as one flat colour (for set dressing made from a coloured drawing) */
function silhouette(c) {
  const id = `nv-sil-${c.slice(1)}`;
  if (!SIL.has(id) && defs()) { SIL.add(id); DEFS.insertAdjacentHTML('beforeend', `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feFlood flood-color="${c}" result="f"/><feComposite in="f" in2="SourceAlpha" operator="in"/></filter>`); }
  return id;
}

// ───────────────────────── object drawings ─────────────────────────
/**
 * iconKit(ICONS) → icon(name, x, y, size, { attr, outline, flip, tone, rot })
 * ICONS comes from tools/icons_pull.mjs (videos/<name>/icons.js). (x, y) is the bottom centre of the drawing, size its longer side.
 * outline: ink outline (default on); tone: paint it as one flat colour instead (set dressing); flip: mirror left-right.
 */
export const iconKit = (ICONS) => (name, x, y, size, { attr = '', outline = true, flip = false, tone = '', rot = 0, thin = false } = {}) => {
  const ic = ICONS[name]; if (!ic) { console.warn(`icon not pulled: ${name}`); return ''; }
  const s = size / Math.max(ic.w, ic.h); const w = ic.w * s; const h = ic.h * s; defs();
  const f = tone ? ` filter="url(#${silhouette(tone)})"` : '';
  const under = outline && !tone ? `<g stroke="${K.ink}" stroke-width="${thin ? 1.4 : 2.2}" stroke-linejoin="round" stroke-linecap="round">${ic.body.replace(/fill="(#[0-9a-fA-F]{3,8}|currentColor)"/g, `fill="${K.ink}"`).replace(/<g fill="none">/g, '<g>')}</g>` : '';
  return `<g ${attr}><g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''} translate(${flip ? w / 2 : -w / 2} ${-h}) scale(${flip ? -s : s} ${s})"${f}>${under}${ic.body}</g></g>`;
};
/** a hard-edged shadow on the floor under something standing at (x, y), w wide (flat: a darker ellipse, no blur) */
export const ground = (x, y, w, attr = '') => `<ellipse ${attr} cx="${x}" cy="${y + 4}" rx="${w / 2}" ry="${Math.max(8, w * 0.07)}" fill="${K.ink}" opacity="0.13"/>`;

// ───────────────────────── sets: what stands behind a scene ─────────────────────────
// Each returns the far layer for a background colour c: shapes one or two steps off c, no outlines. [data-par] = how much of the
// camera's move the layer follows (1 = like the foreground); [data-drift] / [data-blink] are animated by the scene wrapper.
const R = (x, y, w, h, c, r = 0, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r}" fill="${c}" ${extra}/>`;
const cloud = (x, y, s, c, drift) => `<g data-drift="${drift}" ><g transform="translate(${x} ${y}) scale(${s})"><circle cx="-60" cy="10" r="46" fill="${c}"/><circle cx="0" cy="-14" r="62" fill="${c}"/><circle cx="66" cy="12" r="44" fill="${c}"/><rect x="-104" y="10" width="212" height="46" rx="23" fill="${c}"/></g></g>`;
const SETS = {
  /** a room at home: window, shelves with books, a hanging lamp, a picture */
  room(c, f, fl) {
    const a = shade(c, 0.055); const b = shade(c, 0.11); const l = tint(c, 0.5); const wx = f.vx + f.vw - 520; const sx = f.vx + 60;
    const books = Array.from({ length: 3 }, (_, row) => Array.from({ length: 9 }, (_, k) => { const h2 = 70 + hash(row * 31 + k * 7) * 46; const bw = 20 + hash(row * 13 + k * 3) * 16; return R(sx + 24 + k * 34 + (k > 5 ? 20 : 0), fl - 560 + row * 170 + 132 - h2, bw, h2, k % 3 === 1 ? l : b, 4); }).join('')).join('');
    return `<g data-par="0.5">${R(sx, fl - 600, 360, 540, a, 14)}${[0, 1, 2].map((r2) => R(sx, fl - 600 + 130 + r2 * 170, 360, 12, b)).join('')}${books}
      ${R(wx, f.y + 90, 420, 400, b, 18)}${[0, 1].map((i) => [0, 1].map((j) => R(wx + 22 + i * 196, f.y + 112 + j * 186, 180, 170, l, 8)).join('')).join('')}<circle cx="${wx + 300}" cy="${f.y + 190}" r="38" fill="${tint(c, 0.85)}"/>
      ${R(wx - 36, f.y + 70, 492, 22, b, 11)}${R(f.x + f.w / 2 + 120, f.y + 150, 150, 190, b, 10)}${R(f.x + f.w / 2 + 136, f.y + 166, 118, 158, l, 6)}
      <path d="M ${f.x + f.w / 2 - 190} ${f.y - 10} l 0 150" stroke="${b}" stroke-width="8"/><path d="M ${f.x + f.w / 2 - 260} ${f.y + 220} l 40 -84 l 60 0 l 40 84 Z" fill="${b}"/></g>${R(f.x - 60, fl - 30, f.w + 120, 30, shade(c, 0.09))}`;
  },
  /** a workroom: pin board with notes, a clock, a shelf of boxes */
  office(c, f, fl) {
    const a = shade(c, 0.055); const b = shade(c, 0.11); const l = tint(c, 0.5); const px = f.vx + f.vw - 600;
    return `<g data-par="0.5">${R(px, f.y + 100, 470, 300, a, 16)}${[[30, 30, 110, 130, -4], [170, 44, 120, 100, 3], [320, 26, 110, 150, -2], [60, 180, 150, 90, 2], [250, 170, 170, 100, -3]].map(([x, y, w, h, r2], k) => `<g transform="rotate(${r2} ${px + x + w / 2} ${f.y + 100 + y + h / 2})">${R(px + x, f.y + 100 + y, w, h, k % 2 ? l : b, 6)}</g>`).join('')}
      <circle cx="${f.vx + 620}" cy="${f.y + 210}" r="84" fill="${b}"/><circle cx="${f.vx + 620}" cy="${f.y + 210}" r="64" fill="${l}"/><path d="M ${f.vx + 620} ${f.y + 210} l 0 -40 M ${f.vx + 620} ${f.y + 210} l 30 16" stroke="${b}" stroke-width="10" stroke-linecap="round"/>
      ${R(f.vx + 60, fl - 330, 420, 14, b)}${[0, 1, 2, 3].map((k) => R(f.vx + 84 + k * 96, fl - 330 - 70 - (k % 2) * 30, 76, 70 + (k % 2) * 30, k % 2 ? a : b, 8)).join('')}</g>${R(f.x - 60, fl - 30, f.w + 120, 30, shade(c, 0.09))}`;
  },
  /** a machine room: racks with rows of slots and small lights */
  server(c, f, fl) {
    const a = shade(c, 0.045); const b = shade(c, 0.09); const l = tint(c, 0.55); const n = Math.ceil(f.w / 250) + 1;
    return `<g data-par="0.5">${R(f.x - 60, f.y + 60, f.w + 120, 18, b)}${Array.from({ length: n }, (_, k) => { const x = f.x + 30 + k * 250; const h2 = 520 + (k % 3) * 60; return `${R(x, fl - h2, 190, h2, a, 14)}${Array.from({ length: Math.floor((h2 - 60) / 64) }, (_, j) => `${R(x + 20, fl - h2 + 28 + j * 64, 150, 40, b, 8)}<circle data-blink="${1300 + hash(k * 9 + j) * 1900},${(hash(k + j * 5) * 6).toFixed(2)}" cx="${x + 150}" cy="${fl - h2 + 48 + j * 64}" r="7" fill="${(k + j) % 4 === 0 ? K.pink : l}"/>${R(x + 34, fl - h2 + 42 + j * 64, 60, 10, l, 5)}`).join('')}<path d="M ${x + 95} ${f.y + 78} L ${x + 95} ${fl - h2}" stroke="${b}" stroke-width="10"/>`; }).join('')}</g>`;
  },
  /** an award stage: bunting, a skyline, confetti */
  stage(c, f, fl) {
    const a = shade(c, 0.055); const b = shade(c, 0.11); const l = tint(c, 0.55); const n = Math.ceil(f.w / 110);
    const sky = Array.from({ length: Math.ceil(f.w / 150) + 1 }, (_, k) => { const h2 = 180 + hash(k * 17 + 3) * 260; const w = 110 + hash(k * 5) * 50; const x = f.x - 20 + k * 150; return `${R(x, fl - h2, w, h2, k % 2 ? a : b, 6)}${Array.from({ length: Math.floor(h2 / 70) }, (_, j) => [0, 1].map((i) => R(x + 18 + i * (w / 2 - 6), fl - h2 + 22 + j * 60, w / 2 - 34, 26, k % 2 ? b : a, 4)).join('')).join('')}`; }).join('');
    return `<g data-par="0.35">${sky}</g><g data-par="0.6"><path d="M ${f.x - 60} ${f.y + 70} Q ${f.x + f.w / 2} ${f.y + 190} ${f.x + f.w + 60} ${f.y + 70}" fill="none" stroke="${b}" stroke-width="6"/>${Array.from({ length: n }, (_, k) => { const u = (k + 0.5) / n; const x = f.x + u * f.w; const y = f.y + 70 + 120 * 4 * u * (1 - u) * 0.5; return `<path d="M ${x - 30} ${y} L ${x + 30} ${y} L ${x} ${y + 58} Z" fill="${k % 3 === 0 ? K.pink : k % 3 === 1 ? l : b}" opacity="${k % 3 === 0 ? 0.55 : 1}"/>`; }).join('')}
      ${Array.from({ length: 26 }, (_, k) => `<rect data-drift="${10 + hash(k) * 14},${3400 + hash(k * 3) * 3000},${(hash(k * 7) * 6).toFixed(2)}" x="${(f.x + hash(k * 11) * f.w).toFixed(1)}" y="${(f.y + 230 + hash(k * 23) * 330).toFixed(1)}" width="14" height="14" rx="3" fill="${k % 4 === 0 ? K.pink : k % 2 ? l : b}" opacity="${k % 4 === 0 ? 0.5 : 1}" transform="rotate(${(hash(k * 5) * 90).toFixed(0)})" style="transform-box:fill-box;transform-origin:center"/>`).join('')}</g>`;
  },
  /** open country: sun, clouds, two rows of hills, a fence */
  field(c, f, fl) {
    const a = shade(c, 0.055); const b = shade(c, 0.11); const l = tint(c, 0.6);
    const hill = (y, amp, ph, col) => `<path d="M ${f.x - 80} ${fl} ${Array.from({ length: 13 }, (_, k) => { const x = f.x - 80 + (k / 12) * (f.w + 160); return `L ${x.toFixed(0)} ${(y - amp * (0.5 + 0.5 * Math.sin(k * 0.9 + ph))).toFixed(0)}`; }).join(' ')} L ${f.x + f.w + 80} ${fl} Z" fill="${col}"/>`;
    return `<g data-par="0.25"><circle cx="${f.vx + f.vw - 330}" cy="${f.y + 210}" r="92" fill="${l}"/>${cloud(f.vx + 300, f.y + 170, 1.1, l, '26,9000,0')}${cloud(f.vx + f.vw / 2 + 160, f.y + 250, 0.8, l, '20,11000,2')}${cloud(f.vx + f.vw - 120, f.y + 380, 0.7, l, '18,8000,4')}</g>
      <g data-par="0.4">${hill(fl - 190, 150, 0.6, a)}</g><g data-par="0.65">${hill(fl - 70, 110, 2.4, b)}</g>
      <g data-par="0.85">${Array.from({ length: Math.ceil(f.w / 170) + 1 }, (_, k) => R(f.x - 30 + k * 170, fl - 84, 16, 84, shade(c, 0.17), 6)).join('')}${R(f.x - 60, fl - 64, f.w + 120, 12, shade(c, 0.17))}</g>`;
  },
  /** a city street: buildings with windows, clouds */
  city(c, f, fl) {
    const a = shade(c, 0.055); const b = shade(c, 0.11); const l = tint(c, 0.55);
    const row = (seed, hmin, hvar, col, win, step) => Array.from({ length: Math.ceil(f.w / step) + 2 }, (_, k) => { const h2 = hmin + hash(k * 13 + seed) * hvar; const w = step - 26 - hash(k * 3 + seed) * 40; const x = f.x - 60 + k * step; return `${R(x, fl - h2, w, h2, col, 8)}${Array.from({ length: Math.floor((h2 - 40) / 62) }, (_, j) => Array.from({ length: Math.max(1, Math.floor((w - 30) / 46)) }, (_, i) => R(x + 20 + i * 46, fl - h2 + 26 + j * 62, 28, 34, hash(k * 7 + j * 3 + i + seed) > 0.72 ? l : win, 5)).join('')).join('')}`; }).join('');
    return `<g data-par="0.25">${cloud(f.vx + 260, f.y + 150, 1, l, '24,10000,1')}${cloud(f.vx + f.vw - 360, f.y + 210, 0.8, l, '20,12000,3')}</g><g data-par="0.4">${row(1, 420, 300, a, shade(c, 0.09), 210)}</g><g data-par="0.6">${row(5, 180, 200, b, shade(c, 0.16), 260)}</g>`;
  },
  /** a metro hall: tiled wall, a sign band, pillars */
  station(c, f, fl) {
    const a = shade(c, 0.05); const b = shade(c, 0.11); const l = tint(c, 0.5);
    return `<g data-par="0.6">${Array.from({ length: Math.ceil(f.w / 120) + 1 }, (_, k) => `<path d="M ${f.x - 60 + k * 120} ${f.y + 170} L ${f.x - 60 + k * 120} ${fl - 40}" stroke="${a}" stroke-width="5"/>`).join('')}${[0, 1, 2, 3, 4].map((j) => `<path d="M ${f.x - 60} ${f.y + 290 + j * 120} L ${f.x + f.w + 60} ${f.y + 290 + j * 120}" stroke="${a}" stroke-width="5"/>`).join('')}
      ${R(f.x - 60, f.y + 70, f.w + 120, 100, b)}${Array.from({ length: Math.ceil(f.w / 420) }, (_, k) => `${R(f.x + 120 + k * 420, f.y + 96, 200, 46, l, 23)}<path d="M ${f.x + 350 + k * 420} ${f.y + 119} l 50 0 m -20 -18 l 20 18 l -20 18" fill="none" stroke="${l}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      ${[f.vx + 110, f.vx + f.vw - 190].map((x) => R(x, f.y + 170, 80, fl - f.y - 170, b)).join('')}</g>${R(f.x - 60, fl - 40, f.w + 120, 40, shade(c, 0.1))}`;
  },
  /** nowhere in particular: a dot grid and a few big quiet shapes (for diagrams) */
  paper(c, f, fl) {
    const a = shade(c, 0.05); const b = shade(c, 0.1); const l = tint(c, 0.5);
    return `<defs><pattern id="nv-dots-${c.slice(1)}" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="28" cy="28" r="5" fill="${b}"/></pattern></defs>
      <g data-par="0.4"><rect x="${f.x - 60}" y="${f.y - 60}" width="${f.w + 120}" height="${fl - f.y + 60}" fill="url(#nv-dots-${c.slice(1)})" opacity="0.7"/></g>
      <g data-par="0.55"><circle data-drift="14,9000,1" cx="${f.vx + f.vw - 250}" cy="${f.y + 250}" r="190" fill="${a}"/><circle cx="${f.vx + f.vw - 250}" cy="${f.y + 250}" r="110" fill="${l}" data-drift="14,9000,1"/>
      ${R(f.vx + 70, fl - 430, 300, 300, a, 60, 'data-drift="12,11000,3"')}<path d="M ${f.x + f.w / 2 - 60} ${f.y + 120} l 120 0 l -60 100 Z" fill="${b}" data-drift="10,7000,2"/></g>`;
  },
};
/** the floor of a set: its colour, a darker lip under the edge, and bands that widen towards the viewer */
function floorOf(y, c) {
  const f = ST(); const d = shade(c, 0.07); const bottom = f.y + f.h + 60;
  return `<rect x="${f.x - 60}" y="${y}" width="${f.w + 120}" height="${bottom - y}" fill="${c}"/>${R(f.x - 60, y, f.w + 120, 20, shade(c, 0.12))}${[[54, 8], [92, 12], [140, 16]].map(([dy, h]) => R(f.x - 60, y + dy, f.w + 120, h, d)).join('')}<path d="M ${f.x - 60} ${y} L ${f.x + f.w + 60} ${y}" stroke="${K.ink}" stroke-width="7" fill="none"/>`;
}

// ───────────────────────── the scene wrapper ─────────────────────────
const SAFE = { cx: 0.5, cy: 0.43, w: 0.94, h: 0.78 };   // where a framed region sits in the frame (the bottom is for words)
/**
 * look2(film, { set, shadow = true, wipe = true, zmax = 2.2 }) → sc(from, to, { bg, svg, set, cam, wipe, head }, render)
 * A drop-in for makeSc(film): same scenes, but each is seen through a camera, stands in a set, and opens with a round wipe that
 * grows from wherever the narrator is. The heading and the source note stay on the glass (they do not move with the camera).
 */
export function look2(film, opts = {}) {
  const W = film.W; const H = film.H; const [VX, VY] = film.view; const zmax = opts.zmax || 2.2; const state = { set: opts.set || '' };
  FX.shadow = opts.shadow !== false;
  const icon = opts.icon; const FURN = { room: [['potted-plant', -310, 250]], office: [['file-cabinet', -300, 230], ['potted-plant', -150, 170]], field: [['deciduous-tree', -300, 340], ['deciduous-tree', 1430, 250]], city: [['deciduous-tree', -310, 280]], stage: [['party-popper', -300, 190]], ...(opts.furniture || {}) };
  FX.bg = (c, o) => {
    const name = (o && (typeof o === 'string' ? o : o.set)) ?? state.set; const st = ST(); const f = { x: st.x - 260, w: st.w + 520, y: st.y, h: st.h, vx: st.x, vw: st.w }; const fl = (o && o.floor) || 1300;
    if (!name || !SETS[name]) return '';
    const furn = icon && !(o && o.bare) && st.w > st.h ? (FURN[name] || []).map(([n, x, size]) => `${ground(x, fl, size * 0.7)}${icon(n, x, fl + size * 0.04, size)}`).join('') : '';
    return `<g data-set="${name}">${SETS[name](c, f, fl)}</g>${furn ? `<g data-furn="1">${furn}</g>` : ''}`;
  };
  FX.floor = floorOf;
  defs();
  // the character layer follows whichever scene set the camera last on this frame; with no scene (the closing card) it rests
  let camT = -1; film.layer.style.transformOrigin = '0 0';
  film.every((t) => { if (camT !== t) film.layer.style.transform = ''; });
  const fit = (r) => {
    if (!r) return { x: VX + W / 2, y: VY + H / 2, z: 1 };
    const z = clamp(Math.min((W * SAFE.w) / (r[2] - r[0]), (H * SAFE.h) / (r[3] - r[1])), 1, zmax);
    return { x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2, z, framed: true };
  };
  const sc = (from, to, o, render) => {
    const keys = (o.cam || []).map(([at, r, move]) => ({ at, c: fit(r), move: move ?? 700 }));
    const camAt = (t) => {
      if (!keys.length) { const k = E.sineInOut(seg(t, from, to)); return { x: VX + W / 2, y: VY + H * 0.62, z: 1 + 0.04 * k, framed: true, anchorY: 0.62 }; }
      let a = keys[0].c; for (let i = 0; i < keys.length; i++) { const kf = keys[i]; if (t >= kf.at) { a = kf.c; continue; } const u = E.sineInOut(seg(t, kf.at - kf.move, kf.at)); if (u > 0) { const b = kf.c; a = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), framed: a.framed || b.framed }; } break; }
      const drift = 1 + 0.025 * seg(t, from, to); return { ...a, z: a.z * drift };
    };
    const s = scene(film, from, to + 560, { drift: false, ...o }, null);
    s.cam.style.transformOrigin = '0 0';
    // the heading and the source note move to a layer that does not follow the camera
    const hud = svgBox(W, H, '', 'nv-hud', VX, VY); s.node.appendChild(hud);
    for (const e of s.svg.querySelectorAll('[data-head], [data-src], [data-hud]')) hud.appendChild(e);
    // furniture stands on the floor: it was written with the backdrop, so lift it above the floor (right after the floor's edge line)
    const furn = s.svg.querySelector('[data-furn]'); if (furn) { const edge = [...s.svg.children].find((e) => e.tagName === 'path' && e.getAttribute('stroke') === K.ink && e.getAttribute('stroke-width') === '7'); if (edge) edge.after(furn); }
    // source notes sit top-right on the glass, on a plate of the scene's own colour
    const SVGNS = 'http://www.w3.org/2000/svg'; const plateOf = (e) => { const r = document.createElementNS(SVGNS, 'rect'); r.setAttribute('fill', o.bg || K.paper); r.setAttribute('rx', '14'); hud.insertBefore(r, e); return r; };
    const notes = [...hud.querySelectorAll('[data-src]')].map((e) => {
      const txt = e.textContent; const X = VX + W - 40; e.setAttribute('x', String(X)); e.setAttribute('y', String(VY + 42)); e.setAttribute('text-anchor', 'end'); e.setAttribute('font-size', '20');
      // a long note breaks in two at the separator nearest its middle
      if ([...txt].length > 30) { const cuts = [...txt.matchAll(/[·，（]/g)].map((m) => m.index); const mid = txt.length / 2; const at = cuts.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0]; if (at) { const a = txt.slice(0, at).trim(); const b = txt.slice(txt[at] === '（' ? at : at + 1).trim(); e.textContent = ''; for (const [k, part] of [a, b].entries()) { const sp = document.createElementNS(SVGNS, 'tspan'); sp.setAttribute('x', String(X)); sp.setAttribute('dy', k ? '26' : '0'); sp.textContent = part; e.appendChild(sp); } } }
      return { e, plate: plateOf(e), w: 0 };
    });
    const q0 = s.q; s.q = (sel) => q0(sel) || hud.querySelector(sel); s.hud = hud;
    const head = hud.querySelector('[data-head]'); const headPlate = head ? plateOf(head) : null; let headBox = null; const small = o.head === 'small' || (o.head === undefined && keys.length && keys[0].c.z > 1.05);
    const pars = [...s.svg.querySelectorAll('[data-par]')].map((e) => [e, +e.dataset.par]);
    const drifts = [...s.svg.querySelectorAll('[data-drift]')].map((e) => { const [amp, per, ph] = e.dataset.drift.split(',').map(Number); return [e, amp, per, ph || 0, e.getAttribute('transform') || '']; });
    const blinks = [...s.svg.querySelectorAll('[data-blink]')].map((e) => { const [per, ph] = e.dataset.blink.split(',').map(Number); return [e, per, ph || 0]; });
    film.shot(from, to + 560, el('i'), (t) => {
      if (render) render(t, s);
      // camera
      const c = camAt(t); const z = c.z; const ax = W * SAFE.cx; const ay = H * (c.anchorY ?? SAFE.cy);
      const tx = clamp(ax - z * (c.x - VX), W * (1 - z), 0); const ty = clamp(ay - z * (c.y - VY), H * (1 - z), 0);
      const tfm = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(4)})`;
      s.cam.style.transform = tfm; film.layer.style.transform = tfm; camT = t;
      // what the frame's centre looks at, in scene coordinates — far layers follow it only partly
      const fx = VX + (W / 2 - tx) / z; const fy = VY + (H / 2 - ty) / z; const dx = fx - (VX + W / 2); const dy = fy - (VY + H / 2);
      for (const [e, p] of pars) e.setAttribute('transform', `translate(${(dx * (1 - p)).toFixed(1)} ${(dy * (1 - p) * 0.6).toFixed(1)}) translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${Math.pow(z, (p - 1) * 0.6).toFixed(4)}) translate(${(-fx).toFixed(1)} ${(-fy).toFixed(1)})`);
      for (const [e, amp, per, ph, base] of drifts) e.setAttribute('transform', `translate(${(Math.sin((t / per) * Math.PI * 2 + ph) * amp).toFixed(1)} ${(Math.cos((t / per) * Math.PI * 2 + ph * 1.7) * amp * 0.35).toFixed(1)}) ${base}`.trim());
      for (const [e, per, ph] of blinks) e.setAttribute('opacity', Math.sin((t / per) * Math.PI * 2 + ph) > 0.2 ? '1' : '0.35');
      for (const nt of notes) { const on = nt.e.style.display !== 'none'; nt.plate.style.display = on ? '' : 'none'; if (!on) continue; if (!nt.w) { const b = nt.e.getBBox(); nt.w = b.width; nt.plate.setAttribute('x', String(b.x - 14)); nt.plate.setAttribute('y', String(b.y - 8)); nt.plate.setAttribute('width', String(b.width + 28)); nt.plate.setAttribute('height', String(b.height + 16)); } nt.plate.setAttribute('opacity', String(0.85 * +(nt.e.getAttribute('opacity') ?? 1))); }
      // the heading: full size while it is read, then it steps back into the corner
      if (head) {
        if (!headBox && head.style.display !== 'none') { headBox = head.getBBox(); for (const [a, v] of [['x', headBox.x - 18], ['y', headBox.y - 14], ['width', headBox.width + 36], ['height', headBox.height + 28]]) headPlate.setAttribute(a, String(v)); headPlate.setAttribute('opacity', '0.8'); }
        const k = o.head === 'keep' ? 0 : small ? 1 : E.sineInOut(seg(t, from + 2600, from + 3100)); const hs = 1 - 0.32 * k; const tfh = `translate(${VX + 40} ${VY + 52}) scale(${hs.toFixed(3)}) translate(${-(VX + 40)} ${-(VY + 52)})`;
        const ho = 1 - clamp((z - 1.12) / 0.2); head.setAttribute('transform', tfh); headPlate.setAttribute('transform', tfh); head.setAttribute('opacity', String(ho)); headPlate.setAttribute('opacity', String(0.8 * ho));
      }
      // the scene opens with a round wipe that grows from the narrator (a scene that starts the film just appears)
      s.node.style.opacity = '1';
      const wipe = o.wipe ?? opts.wipe ?? true; const u = seg(t, from, from + 520);
      if (wipe && from > 0 && u < 1) { const px = LIVE.x !== undefined ? tx + z * (LIVE.x - VX) : W / 2; const py = LIVE.y !== undefined ? ty + z * (LIVE.y - 120 - VY) : H * 0.6; s.node.style.clipPath = `circle(${(E.power2In(u) * Math.hypot(W, H) * 1.05 + (u > 0 ? 40 : 0)).toFixed(1)}px at ${px.toFixed(1)}px ${py.toFixed(1)}px)`; } else s.node.style.clipPath = '';
    });
    return s;
  };
  sc.set = (name) => { state.set = name; };
  // a line worth keeping goes up on the glass while it is spoken: sc.gold(lineId, itsFirstWords, text, { top, dx, size, untilWord })
  // — a plate near the top of the frame, from the moment its first words are said until a moment after the line ends (or until
  // `untilWord` is said, when the line goes on). top / dx move it clear of what the scene has up there. Call it inside build().
  const golds = []; let goldEl = null;
  sc.gold = (id, word, text, { hold = 700, top = 104, dx = 0, size = 52, untilWord = '' } = {}) => {
    if (!goldEl) {
      goldEl = el('div', 'nv-gold', '<div class="in"></div>', `position:absolute;left:0;right:0;top:104px;display:none;justify-content:center;pointer-events:none;z-index:6`);
      goldEl.firstChild.style.cssText = `background:${K.ink};color:${K.paper};font:900 52px/1.3 "Noto Serif SC",serif;padding:16px 44px 22px;border-radius:18px;box-shadow:9px 9px 0 ${film.theme.accent};white-space:nowrap;letter-spacing:2px;transform-origin:50% 50%`;
      film.viewport.appendChild(goldEl);
      film.every((t, { ending }) => {
        const gl = golds.find((x) => t >= x.at && t < x.to); const on = !!gl && !ending; goldEl.style.display = on ? 'flex' : 'none'; if (!on) return;
        const box = goldEl.firstChild; if (box.textContent !== gl.text) { box.textContent = gl.text; box.style.fontSize = `${Math.min(gl.size, Math.floor(1500 / [...gl.text].length))}px`; goldEl.style.top = `${gl.top}px`; }
        const k = Math.max(0.2, E.backOut(seg(t, gl.at, gl.at + 340), 1.6)); box.style.transform = `translateX(${gl.dx}px) rotate(-1.2deg) scale(${k.toFixed(3)})`;
        goldEl.style.opacity = String(clamp(seg(t, gl.at, gl.at + 120)) * (1 - clamp(seg(t, gl.to - 300, gl.to))));
      });
    }
    const v = film.vo[id]; const at = film.wt(id, word) - 150; golds.push({ at, to: untilWord ? film.wt(id, untilWord) - 150 : v.at + v.dur + hold, text, top, dx, size }); film.cue(at, 'stamp');
    // the fonts are requested per character: every character of the plate has to be in the page before that
    const pre = el('span', '', text, 'display:none'); goldEl.appendChild(pre);
  };
  return sc;
}
