// The mascot as a character who ACTS in every scene (picture template), instead of standing in a corner and talking.
// Each scene's render calls act({...}) every frame: where the mascot stands, how it walks, where its hands are, what it holds.
// The character layer reads that after the scenes are drawn, then clears it. BLOCK / MOODS are only the fallback for frames no
// scene steers. Scenes made with makeSc() keep the camera still, so scene coordinates and character coordinates are the same.
//
//   in a reel: import { act, actor, makeSc, walkPose, hopPose, runPose, pen, penUp, drawPaths, PROPS, mood } from lib/actor.js
//   const sc = makeSc(film);  film.start({ character: actor(film, { look }), build() { … } });
//   sc(from, to, { bg, svg }, (t, s) => { let pose = walkPose(t, a, b, x0, x1, FLOOR, SIZE); …; act(pose); });
//
// The mascot is small. What it touches must be within reach (about 150 px above or below its shoulder at size 0.55) — otherwise it
// walks over, climbs a ladder or stool, hops, or throws. `node render.mjs videos/<name> --sweep` lists every moment a hand is
// further from its shoulder than that (window.__reach).
import { E, clamp, lerp, seg, sfx, show } from './film.js';
import { scene } from './templates/picture.js';
import { buddySvg, createBuddy, idleHands, shoulders, toWorld } from './buddy.js';

const K = { ink: '#111112', paper: '#F2EEE8', pink: '#FF3D72', mute: '#8D8880', wood: '#C9A27A', yellow: '#F2C46D', lilac: '#B9A7D9', blueL: '#DCE8F2' };
/** the default look: an ink body with a paper outline, pink shoes and blush, a curled page on top */
export const LOOK = { ink: '#F2EEE8', pupil: '#111112', body: '#26232B', outline: '#F2EEE8', limb: '#26232B', shoe: '#FF3D72', blush: '#FF3D72', eyes: 'sclera', topper: null, top: '#F2EEE8', top2: '#FF3D72', spin: false };

export const BLOCK = []; export const MOODS = [];
export const PROPS = { wizard: [], hat: [], detective: [] };
export const LIVE = {};
/** steer the narrator for this frame: { x, y, size, facing, rot, sx, sy, feet, floor, handF, handB, prop, propRot, tip, expr, fx, show } */
// Replaces, never merges: while two scenes cross-fade both call act(), and the incoming scene (drawn last) must win outright —
// a merge left the outgoing scene's hand target on the new pose (an arm reaching in from off stage).
export const act = (o) => { for (const k of Object.keys(LIVE)) delete LIVE[k]; Object.assign(LIVE, o); };
export const at = (t, o) => BLOCK.push([t, o]);
export const mood = (t, expr, fx) => MOODS.push([t, expr, fx]);
const on = (list, t) => list.some(([a, b]) => t >= a && t < b);
const blinkAt = (t) => { const n = Math.floor(t / 2900); const off = Math.abs((Math.sin(n * 12.9898) * 43758.5453) % 1); const ph = t - n * 2900 - off * 800; return ph >= 0 && ph < 140 ? Math.sin((ph / 140) * Math.PI) : 0; };

/** a walking pose between a and b from x0 to x1 on floor y: feet step, body bobs, faces the way it goes */
/** off stage means beyond the real edge: scenes written for a 1080-wide frame say -100 or 1180; a wider frame pushes those out */
export const off = (x) => { const st = (typeof window !== 'undefined' && window.STAGE) || null; if (!st || st.x >= 0) return x; return x <= -60 ? x + st.x : x >= 1140 ? x + (st.x + st.w - 1080) : x; };
export function walkPose(t, a, b, x0, x1, y, size, { stride = 64, face } = {}) {
  x0 = off(x0); x1 = off(x1);
  const k = E.sineInOut(seg(t, a, b)); const x = lerp(x0, x1, k); const moving = t > a && t < b && x0 !== x1; const dir = Math.sign(x1 - x0) || 1;
  const ph = (Math.abs(x - x0) / (stride * size)) * Math.PI;
  const feet = moving ? { L: { x: x - 34 * size + dir * Math.sin(ph) * 34 * size, y: y - Math.max(0, Math.cos(ph)) * 24 * size }, R: { x: x + 34 * size - dir * Math.sin(ph) * 34 * size, y: y - Math.max(0, -Math.cos(ph)) * 24 * size } } : undefined;
  return { x, y: y - (moving ? Math.abs(Math.sin(ph)) * 10 * size : 0), floor: y, size, facing: moving ? dir * 0.55 : (face ?? 0), feet, rot: moving ? dir * 4 : 0 };
}
/** a hop from (x0, y) to (x1, y) between a and a + dur */
export function hopPose(t, a, dur, x0, x1, y, size, h = 160) {
  const u = seg(t, a, a + dur); const x = lerp(x0, x1, E.sineInOut(u)); const up = Math.sin(u * Math.PI) * h * size;
  const sq = u <= 0 || u >= 1 ? 1 : 1 + 0.08 * Math.sin(u * Math.PI);
  return { x, y: y - up, floor: y, size, sy: sq, sx: 2 - sq, facing: x1 === x0 ? 0 : Math.sign(x1 - x0) * 0.5 };
}
/** running on the spot at x (the ground scrolls instead): feet cycle, body bobs and leans the way it runs */
export function runPose(t, x, y, size, dir = 1, speed = 1) {
  const ph = (t / 90) * speed;
  return { x, y: y - Math.abs(Math.sin(ph)) * 14 * size, floor: y, size, facing: dir * 0.55, rot: dir * 8,
    feet: { L: { x: x - 30 * size + Math.sin(ph) * 46 * size, y: y - Math.max(0, Math.cos(ph)) * 34 * size }, R: { x: x + 30 * size - Math.sin(ph) * 46 * size, y: y - Math.max(0, -Math.cos(ph)) * 34 * size } } };
}
/** draw the strokes inside `group` one after another between a and b; returns the pen tip (world point) or null */
export function drawPaths(group, t, a, b) {
  if (!group) return null;
  const parts = [...group.querySelectorAll('path, line, circle, ellipse, rect, polyline')].filter((e) => !e.hasAttribute('data-fill'));
  const each = (b - a) / Math.max(1, parts.length); let tip = null;
  parts.forEach((p, i) => {
    const k = E.sineInOut(seg(t, a + i * each, a + (i + 1) * each));
    if (!p.getAttribute('pathLength')) p.setAttribute('pathLength', '1');
    p.style.strokeDasharray = '1'; p.style.strokeDashoffset = String(1 - k); p.style.visibility = k <= 0 ? 'hidden' : 'visible';
    // getCTM() maps to the frame's pixels; scene coordinates are that plus where the frame's top-left sits (window.STAGE)
    if (k > 0 && k < 1 && p.getTotalLength) { const L = p.getTotalLength(); const pt = p.getPointAtLength(L * k); const m = p.getCTM(); const q = m ? pt.matrixTransform(m) : pt; const st = window.STAGE || { x: 0, y: 0 }; tip = { x: q.x + st.x, y: q.y + st.y }; }
  });
  for (const f of group.querySelectorAll('[data-fill], text')) f.setAttribute('opacity', String(clamp(seg(t, a + (b - a) * 0.6, b))));
  return tip ? { x: tip.x, y: tip.y } : null;
}
/** hold the pen at this tip: hand just above and to the right of it */
export const pen = (tip) => (tip ? { handF: { x: tip.x + 18, y: tip.y - 44 }, prop: 'pen', tip } : {});

/** write on a wall above the head: the pen points up, the hand is below the tip */
export const penUp = (tip) => (tip ? { handF: { x: tip.x - 14, y: tip.y + 50 }, prop: 'pen', tip, propRot: 168 } : {});

const PROP_SVG = {
  pen: `<g transform="rotate(28)"><rect x="-11" y="-150" width="22" height="118" rx="8" fill="#26232B" stroke="#F2EEE8" stroke-width="3"/><rect x="-11" y="-162" width="22" height="22" rx="6" fill="${K.pink}"/><path d="M -10 -32 L 0 0 L 10 -32 Z" fill="#26232B"/></g>`,
  scissors: `<g><circle cx="-18" cy="20" r="16" fill="none" stroke="${K.ink}" stroke-width="7"/><circle cx="18" cy="20" r="16" fill="none" stroke="${K.ink}" stroke-width="7"/><path d="M -8 8 L 40 -60 M 8 8 L -40 -60" stroke="${K.mute}" stroke-width="9" stroke-linecap="round"/></g>`,
  stamp: `<g><rect x="-18" y="-80" width="36" height="60" rx="12" fill="${K.wood}" stroke="${K.ink}" stroke-width="6"/><rect x="-40" y="-24" width="80" height="30" rx="6" fill="${K.pink}" stroke="${K.ink}" stroke-width="6"/></g>`,
  magnifier: `<g><circle cx="30" cy="-30" r="34" fill="${K.blueL}" fill-opacity="0.5" stroke="${K.ink}" stroke-width="8"/><path d="M 6 -6 L -26 26" stroke="${K.ink}" stroke-width="12" stroke-linecap="round"/></g>`,
  broom: `<g transform="rotate(-20)"><path d="M 0 -150 L 0 60" stroke="${K.wood}" stroke-width="12" stroke-linecap="round"/><path d="M -36 60 L 36 60 L 50 130 L -50 130 Z" fill="${K.yellow}" stroke="${K.ink}" stroke-width="6"/></g>`,
  tweezers: `<g transform="rotate(20)"><path d="M -6 0 L -2 -110 M 6 0 L 2 -110" stroke="${K.mute}" stroke-width="8" stroke-linecap="round"/></g>`,
  wrench: `<g transform="rotate(30)"><rect x="-10" y="-20" width="20" height="110" rx="8" fill="${K.mute}" stroke="${K.ink}" stroke-width="5"/><path d="M -30 -40 A 30 30 0 1 0 30 -40 L 14 -34 L 0 -16 L -14 -34 Z" fill="${K.mute}" stroke="${K.ink}" stroke-width="5"/></g>`,
};

export const actor = (film, { look = LOOK } = {}) => {
  let rig = null; let G = null; const P = {}; const HP = {}; const PREV = { up: {}, air: false, sq: false, t: -1 };
  return {
    mount(layer) {
      layer.innerHTML = `<g data-lk="1">${buddySvg('lk', look)}
        <g data-p="wizard"><path d="M -120 0 L 120 0 L 26 -230 Q 10 -250 0 -236 Z" fill="${K.lilac}" stroke="${K.ink}" stroke-width="9" stroke-linejoin="round"/><path d="M -150 0 Q 0 -30 150 0 Q 0 26 -150 0 Z" fill="${K.lilac}" stroke="${K.ink}" stroke-width="9"/><circle cx="-20" cy="-90" r="12" fill="${K.yellow}"/></g>
        <g data-p="hat"><path d="M -168 0 L 168 0 Q 170 -18 146 -22 L 134 -22 Q 124 -150 0 -158 Q -124 -150 -134 -22 L -146 -22 Q -170 -18 -168 0 Z" fill="${K.yellow}" stroke="${K.ink}" stroke-width="9" stroke-linejoin="round"/><path d="M -24 -154 L -24 -22 M 24 -154 L 24 -22" stroke="${K.ink}" stroke-width="7"/></g>
        <g data-p="detective"><path d="M -150 0 Q 0 -40 150 0 Q 0 20 -150 0 Z" fill="#8E6440" stroke="${K.ink}" stroke-width="8"/><path d="M -100 -10 Q -90 -140 0 -150 Q 90 -140 100 -10 Z" fill="#8E6440" stroke="${K.ink}" stroke-width="8"/><path d="M -98 -40 L 98 -40" stroke="${K.ink}" stroke-width="14"/></g>
        ${Object.entries(PROP_SVG).map(([k, svg]) => `<g data-hp="${k}">${svg}</g>`).join('')}
      </g>`;
      G = layer.querySelector('[data-lk]'); rig = createBuddy(layer.querySelector('[data-buddy]'), look);
      for (const k of ['wizard', 'hat', 'detective']) P[k] = layer.querySelector(`[data-p="${k}"]`);
      for (const k of Object.keys(PROP_SVG)) HP[k] = layer.querySelector(`[data-hp="${k}"]`);
    },
    render(t, f, { ending }) {
      let i = 0; for (let k = 0; k < BLOCK.length; k++) if (t >= BLOCK[k][0]) i = k;
      const cur = (BLOCK[i] || [0, { x: 540, y: 1700, size: 0.4, hide: true }])[1];
      const L = { ...LIVE }; for (const k of Object.keys(LIVE)) delete LIVE[k];
      const hide = !ending && !L.show && L.x === undefined && !!cur.hide;
      show(G, !hide); if (hide) return;
      const p = { x: cur.x, y: cur.y, floor: cur.y, size: cur.size, facing: cur.facing ?? 0, expr: 'smile' };
      for (const k of ['x', 'y', 'size', 'facing', 'rot', 'sx', 'sy', 'feet', 'floor']) if (L[k] !== undefined) p[k] = L[k];
      if (L.y !== undefined && L.floor === undefined) p.floor = L.y;
      let m = MOODS[0] || [0, 'smile']; for (const x of MOODS) if (t >= x[0]) m = x;
      p.expr = L.expr || m[1]; const fxName = L.fx !== undefined ? L.fx : m[2]; const since = t - m[0]; const up = Math.min(1, Math.max(0, since / 260)) || 0.01;
      if (fxName) p.fx = fxName === 'sweat' ? { sweat: 1 } : fxName === 'hearts' ? { hearts: since / 900 } : { [fxName]: up };
      const sh = shoulders(p); const idle = idleHands(p, t);
      if (f.speaking(t) && !ending && !L.handB) p.handB = { x: idle.B.x + (sh.B.x - 70 * p.size - idle.B.x) * 0.9, y: idle.B.y + (sh.B.y - 40 * p.size + Math.sin(t / 300) * 8 - idle.B.y) * 0.9 };
      if (L.handF) p.handF = L.handF; if (L.handB) p.handB = L.handB;
      // reach check: a hand far from its shoulder means the arm is stretched across the scene — log it for the still checks
      if (typeof window !== 'undefined') for (const [k, h] of [['F', L.handF], ['B', L.handB]]) {
        if (!h) continue; const d = Math.hypot(h.x - sh[k].x, h.y - sh[k].y) / p.size;
        if (d > 300) { const R = (window.__reach ||= {}); const key = Math.floor(t / 500) * 500; if (!R[key] || R[key] < d) R[key] = Math.round(d); }
      }
      if (ending) { const w = Math.sin(((t - film.T.card) / 1000) * Math.PI * 4); const wide = film.W > film.H; const ey = wide ? film.view[1] + film.H - 60 : 1600; Object.assign(p, { x: 540, y: ey, floor: ey, size: wide ? 0.72 : 0.8, facing: 0, rot: 0, sx: 1, sy: 1, feet: undefined }); const s2 = shoulders(p); p.handF = { x: s2.F.x + 30 + w * 14, y: s2.F.y - 70 }; p.handB = undefined; p.expr = 'happy'; p.fx = null; }
      if (!['happy', 'joy', 'starry', 'sleepy', 'wink'].includes(p.expr)) p.blink = blinkAt(t);
      p.talk = f.talk(t);
      rig.render(p, t);
      // sounds of what it is doing (collected when render.mjs walks the timeline for the soundtrack)
      if (!ending && t > PREV.t && t - PREV.t < 200) {
        const fl = p.floor ?? p.y;
        if (L.feet) for (const k of ['L', 'R']) { const up = L.feet[k].y < fl - 3; if (PREV.up[k] && !up) sfx(t, 'step', 280); PREV.up[k] = up; } else PREV.up = {};
        const air = p.y < fl - 30; if (air && !PREV.air && t > 150) sfx(t, 'jump', 200); if (!air && PREV.air) sfx(t, 'land', 200); PREV.air = air;
        const sq = (p.sy ?? 1) < 0.86; if (sq && !PREV.sq) sfx(t, 'squish', 300); PREV.sq = sq;
        if (L.prop === 'pen' && L.tip) sfx(Math.floor(t / 140) * 140, 'write', 140);
        if (L.prop === 'scissors') sfx(Math.floor(t / 230) * 230, 'snip', 230);
        if (L.prop === 'wrench') sfx(Math.floor(t / 300) * 300, 'ratchet', 300);
      }
      PREV.t = t;
      const put = (el, lx, ly) => { const w = toWorld(p, lx, ly); el.setAttribute('transform', `translate(${w.x.toFixed(1)} ${w.y.toFixed(1)}) rotate(${(p.rot || 0).toFixed(1)}) scale(${(p.size * (p.sx ?? 1)).toFixed(4)} ${(p.size * (p.sy ?? 1)).toFixed(4)})`); };
      for (const k of ['wizard', 'hat', 'detective']) { const live = !ending && on(PROPS[k], t); show(P[k], live); if (live) put(P[k], 0, k === 'wizard' ? -440 : -436); }
      for (const k of Object.keys(HP)) {
        const live = !ending && L.prop === k && p.handF; show(HP[k], !!live);
        if (live) { const w = k === 'pen' && L.tip ? L.tip : p.handF; HP[k].setAttribute('transform', `translate(${w.x.toFixed(1)} ${w.y.toFixed(1)}) rotate(${(L.propRot || 0).toFixed(1)}) scale(${(p.size * 1.6).toFixed(3)})`); }
      }
    },
  };
};

/** a scene with a still camera (scene coordinates = character coordinates); the next scene fades in over it */
export const makeSc = (film) => (from, to, o, render) => scene(film, from, to + 380, { drift: false, ...o }, render);
