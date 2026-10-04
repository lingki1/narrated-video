// A flat drawing kit for explainer scenes (picture template): palette, text and shapes as SVG strings, things to explain with
// (chat bubble, phone, document, the model box, role robots, a person, a horse and cart, ladder and stool), and per-frame helpers
// (rise, pop, fadeIn, place, type, count …). Scenes draw with these; lib/actor.js moves the mascot.
import { E, clamp, lerp, seg, sfx, show } from './film.js';

export const K = {
  ink: '#111112', paper: '#F2EEE8', white: '#FFFFFF', pink: '#FF3D72', pinkD: '#D81B5C', pinkL: '#FFD6E2', mute: '#8D8880', line: '#CFC6B8',
  desk: '#E7E1D8', blue: '#7FA3C9', blueL: '#DCE8F2', mint: '#9CC5A1', mintL: '#E1F0E2', yellow: '#F2C46D', yellowL: '#FBEFD2', lilac: '#B9A7D9', lilacL: '#ECE6F6',
  night: '#1E2033', red: '#E5484D', green: '#3FA36B', wood: '#C9A27A', horse: '#B98B5E', horseD: '#8E6440',
};
export const LOOK = { ink: '#F2EEE8', pupil: '#111112', body: '#26232B', outline: '#F2EEE8', limb: '#26232B', shoe: '#FF3D72', blush: '#FF3D72', eyes: 'sclera', topper: null, top: '#F2EEE8', top2: '#FF3D72', spin: false };

// ───────────────────────── text and shapes (SVG strings) ─────────────────────────
const FONT = { sans: 'Noto Sans SC', serif: 'Noto Serif SC', num: 'Inter Tight', hand: 'Ma Shan Zheng' };
/** text: f = sans | serif | num | hand */
export const tx = (x, y, s, { size = 48, color = K.ink, anchor = 'middle', f = 'sans', w = 800, attr = '', rot = 0 } = {}) =>
  `<text ${attr} x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT[f]}" font-weight="${f === 'hand' ? 400 : w}" font-size="${size}" fill="${color}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;
export const g = (attr, inner) => `<g ${attr}>${inner}</g>`;
/** the frame: its size and where its top-left is in scene coordinates (a wide film looks at the same scenes through a wider window) */
export const ST = () => (typeof window !== 'undefined' && window.STAGE) || { w: 1080, h: 1920, x: 0, y: 0 };
export const isWide = () => ST().w > ST().h;
/** left and right edge of the frame in scene coordinates; things that leave the stage go past these */
export const edge = () => ({ l: ST().x, r: ST().x + ST().w });
/** look switches a reel can turn on (lib/look.js does): a set behind every scene, a dressed floor, hard shadows under panels */
export const FX = { shadow: false, bg: null, floor: null };
/** the backdrop; with a set kit on, `set` names the set behind this scene ('room', 'server', … or '' for none) */
export const bg = (c, set) => { const f = ST(); return `<rect x="${f.x - 60}" y="${f.y - 60}" width="${f.w + 120}" height="${f.h + 120}" fill="${c}"/>${FX.bg ? FX.bg(c, set) : ''}`; };
export const floor = (y, c) => { if (FX.floor) return FX.floor(y, c); const f = ST(); return `<rect x="${f.x - 60}" y="${y}" width="${f.w + 120}" height="${f.y + f.h + 60 - y}" fill="${c}"/><path d="M ${f.x - 60} ${y} L ${f.x + f.w + 60} ${y}" stroke="${K.ink}" stroke-width="7" fill="none"/>`; };
const LIGHT = new Set(['#FFFFFF', '#FBEFD2', '#FFD6E2', '#DCE8F2', '#E1F0E2', '#ECE6F6', '#F2EEE8', '#E7E1D8']);
/** a rounded box. sh: a hard shadow under it (flat, offset down-right) — on by default for light, outlined panels when FX.shadow is on */
export const rect = (x, y, w, h, { fill = K.white, stroke = K.ink, sw = 7, r = 18, attr = '', sh } = {}) => `${(sh ?? (FX.shadow && !attr && sw >= 5 && stroke === K.ink && w >= 150 && h >= 64 && LIGHT.has(fill))) ? `<rect x="${x + 9}" y="${y + 10}" width="${w}" height="${h}" rx="${r}" fill="${K.ink}" opacity="0.14"/>` : ''}<rect ${attr} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
export const line = (x1, y1, x2, y2, { c = K.ink, w = 7, attr = '', dash = '' } = {}) => `<path ${attr} d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export const arrow = (x1, y1, x2, y2, { c = K.ink, w = 8, attr = '' } = {}) => {
  const a = Math.atan2(y2 - y1, x2 - x1); const h = 22;
  const p1 = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)]; const p2 = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
  return `<g ${attr}><path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${x2} ${y2} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
};
/** a chat bubble with grey text lines (or real text) — side 'l' (them) or 'r' (you) */
export const bubble = (x, y, w, side, { fill, text = '', size = 34, h = 70, attr = '' } = {}) => {
  const f = fill || (side === 'r' ? K.pink : K.white); const tc = side === 'r' ? K.white : K.ink;
  const bx = side === 'l' ? x : x - w;
  return `<g ${attr}>${rect(bx, y, w, h, { fill: f, r: 32, sw: 5 })}${text ? tx(bx + w / 2, y + h / 2 + size * 0.36, text, { size, color: tc, w: 700 }) : `<rect x="${bx + 26}" y="${y + h / 2 - 6}" width="${(w - 52) * 0.7}" height="12" rx="6" fill="${side === 'r' ? '#FFFFFF' : K.line}" opacity="${side === 'r' ? 0.7 : 1}"/>`}</g>`;
};
/** the model: a friendly box with one screen-eye; (x, y) = centre */
export const modelBox = (x, y, s = 1, attr = 'data-model="1"') => `<g ${attr} transform="translate(${x} ${y}) scale(${s})">
  <rect x="-120" y="-100" width="240" height="200" rx="40" fill="${K.lilacL}" stroke="${K.ink}" stroke-width="8"/>
  <rect x="-84" y="-62" width="168" height="84" rx="20" fill="${K.ink}"/><circle data-eye="1" cx="0" cy="-20" r="20" fill="${K.lilac}"/>
  <path d="M -60 60 L 60 60" stroke="${K.ink}" stroke-width="8" stroke-linecap="round"/><path d="M -20 -100 L -20 -128 M 20 -100 L 20 -128" stroke="${K.ink}" stroke-width="8" stroke-linecap="round"/>
  ${tx(0, 150, '模型', { size: 40 })}</g>`;
/** a phone outline; (x, y) = centre */
export const phone = (x, y, w, h, screen = K.white, attr = '') => `<g ${attr}><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w * 0.13}" fill="${K.ink}"/>
  <rect x="${x - w / 2 + 14}" y="${y - h / 2 + 14}" width="${w - 28}" height="${h - 28}" rx="${w * 0.09}" fill="${screen}"/></g>`;
/** a document sheet with grey lines */
export const doc = (x, y, w, h, { fill = K.white, lines = 5, title = '', tsize = 34, attr = '' } = {}) => `<g ${attr}>${rect(x, y, w, h, { fill, r: 12, sw: 6 })}
  ${title ? tx(x + w / 2, y + 50, title, { size: tsize }) : ''}${Array.from({ length: lines }, (_, k) => `<rect x="${x + 24}" y="${y + (title ? 82 : 34) + k * 32}" width="${(w - 48) * (k === lines - 1 ? 0.6 : 0.95)}" height="12" rx="6" fill="${K.line}"/>`).join('')}</g>`;
/** the heading band: small kicker + title */
const units = (str) => [...str].reduce((a, ch) => a + (/[，。、：；！？·）」』”’…]/.test(ch) ? 0.5 : /[\u2e80-\uffff]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.56), 0);
/** break a string into lines of at most `max` units (a CJK character is 1): first at commas and colons, then — for a phrase that
 *  is still too long — between words (Intl.Segmenter), balanced; a line never starts with punctuation */
export function wrap(str, max) {
  const words = (x) => {
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(x)].map((y) => y.segment) : [...x];
    const toks = [];
    for (const w of seg) { if (toks.length && (/^[，。、：；！？·)）」』”’…]+$/.test(w) || /^\s+$/.test(toks[toks.length - 1]))) toks[toks.length - 1] += w; else toks.push(w); }
    return toks;
  };
  const out = [];
  for (const phrase of str.split(/(?<=[，：；])/)) {
    if (units(phrase) <= max) { if (out.length && units(out[out.length - 1] + phrase) <= max) out[out.length - 1] += phrase; else out.push(phrase); continue; }
    const toks = words(phrase); const total = units(phrase); const n = Math.ceil(total / max); const target = total / n; let cur = ''; let made = 0;
    for (const w of toks) {
      const cw = units(cur); const ww = units(w);
      if (cur.trim() && (cw + ww > max || (made < n - 1 && cw + ww / 2 > target))) { out.push(cur); cur = ''; made++; }
      cur += w;
    }
    if (cur.trim()) out.push(cur);
  }
  return out.map((l) => l.trim().replace(/^·\s*/, '').replace(/\s*·$/, '')).filter(Boolean);
}
/** the heading: small kicker + title. Tall frame: a band across the top. Wide frame: a block in the left wing. */
export const heading = (kicker, title, { y = 300, color = K.pinkD, tcolor = K.ink, attr = 'data-head="1"' } = {}) => {
  if (!isWide()) return `<g ${attr}>${tx(80, y - 52, kicker, { size: 40, color, anchor: 'start', w: 900 })}${tx(80, y + 26, title, { size: Math.min(80, Math.floor(920 / [...title].length)), color: tcolor, anchor: 'start', f: 'serif', w: 900 })}</g>`;
  const x = ST().x + 40; const top = ST().y + 100; const kl = wrap(kicker, 12.4); const tl = wrap(title, 7.6);
  const ty = top + 24 + kl.length * 40;
  return `<g ${attr}><rect x="${x}" y="${top - 48}" width="64" height="10" rx="5" fill="${color}"/>${kl.map((l, i) => tx(x, top + 12 + i * 40, l, { size: 30, color, anchor: 'start', w: 900 })).join('')}${tl.map((l, i) => tx(x, ty + 40 + i * 66, l, { size: 50, color: tcolor, anchor: 'start', f: 'serif', w: 900 })).join('')}</g>`;
};
/** a small grey source note */
export const note = (x, y, s, { anchor = 'start', attr = 'data-src="1"' } = {}) => tx(x, isWide() && y > 1320 ? 1328 : y, s, { size: isWide() && y > 1320 ? 24 : 30, color: K.mute, anchor, w: 700, attr });

// ───────────────────────── animation helpers (call inside a scene's render) ─────────────────────────
const baseTf = (e) => { if (!('baseTf' in e.dataset)) e.dataset.baseTf = e.getAttribute('transform') || ''; return e.dataset.baseTf; };
/** soft entrance: fade + rise; keeps the element's own transform */
export const rise = (e, t, at, dy = 30, dur = 420) => { if (!e) return; const k = E.power3Out(seg(t, at, at + dur)); show(e, t >= at); e.setAttribute('opacity', String(k)); e.setAttribute('transform', `translate(0 ${((1 - k) * dy).toFixed(1)}) ${baseTf(e)}`.trim()); };
/** pop in with a little overshoot around (cx, cy) */
export const pop = (e, t, at, cx, cy, dur = 360) => { if (!e) return; if (t >= at && t < at + 400) sfx(at, 'pop', 90); show(e, t >= at); const k = E.backOut(seg(t, at, at + dur), 1.6); const s = Math.max(0.2, k); e.setAttribute('opacity', String(clamp(seg(t, at, at + 120)))); e.setAttribute('transform', `translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy}) ${baseTf(e)}`.trim()); };
export const fade = (e, t, at, dur = 300, to = 1) => { if (!e) return; const k = clamp(seg(t, at, at + dur)); show(e, t >= at || to < 1); e.setAttribute('opacity', String(k * to)); };
export const fadeOut = (e, t, at, dur = 300) => { if (!e) return; const o = +(e.getAttribute('opacity') ?? 1); e.setAttribute('opacity', String(o * (1 - clamp(seg(t, at, at + dur))))); };
/** move an element from (x0,y0) to (x1,y1) between a and b (eased), keeping its transform */
export const move = (e, t, a, b, x0, y0, x1, y1, ease = E.sineInOut) => { if (!e) return; const k = ease(seg(t, a, b)); e.setAttribute('transform', `translate(${lerp(x0, x1, k).toFixed(1)} ${lerp(y0, y1, k).toFixed(1)}) ${baseTf(e)}`.trim()); return k; };
/** reveal an SVG <text> character by character */
export const type = (e, t, at, ms = 600) => {
  if (!e) return;
  if (!e.dataset.split) { const s = e.textContent; e.textContent = ''; [...s].forEach((ch) => { const sp = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); sp.textContent = ch; e.appendChild(sp); }); e.dataset.split = '1'; }
  const n = e.childNodes.length; show(e, t >= at);
  e.childNodes.forEach((sp, i) => sp.setAttribute('opacity', t >= at + (i / n) * ms ? '1' : '0'));
};
/** a number that counts up between a and b */
export const count = (e, t, a, b, from, to, fmt = (v) => String(Math.round(v))) => { if (!e) return; const v = lerp(from, to, E.power2Out(seg(t, a, b))); const s = fmt(v); if (e.textContent !== s) e.textContent = s; };
export const thousands = (v) => Math.round(v).toLocaleString('en-US');
export const wobble = (t, period = 900, amp = 3, ph = 0) => Math.sin((t / period) * Math.PI * 2 + ph) * amp;

// ───────────────────────── things the narrator stands on (it is small; high things need a step) ─────────────────────────
/** a step ladder whose top step is at (x, top) on floor y */
export const ladder = (x, top, y = 1300, attr = '') => `<g ${attr}><path d="M ${x - 70} ${y} L ${x - 40} ${top} M ${x + 70} ${y} L ${x + 40} ${top}" stroke="${K.wood}" stroke-width="14" stroke-linecap="round"/>
  ${[0.25, 0.5, 0.75].map((f) => `<path d="M ${x - 70 + 30 * f} ${y - (y - top) * f} L ${x + 70 - 30 * f} ${y - (y - top) * f}" stroke="${K.wood}" stroke-width="10"/>`).join('')}<rect x="${x - 60}" y="${top - 14}" width="120" height="20" rx="6" fill="${K.wood}" stroke="${K.ink}" stroke-width="5"/></g>`;
/** a stool with its seat at (x, top) */
export const stool = (x, top, y = 1300, attr = '') => `<g ${attr}><rect x="${x - 80}" y="${top - 16}" width="160" height="26" rx="8" fill="${K.wood}" stroke="${K.ink}" stroke-width="6"/><path d="M ${x - 60} ${top + 10} L ${x - 70} ${y} M ${x + 60} ${top + 10} L ${x + 70} ${y}" stroke="${K.ink}" stroke-width="10" stroke-linecap="round"/></g>`;

/** a flat horse facing right; origin = under its belly on the ground line. The tack ([data-tack="saddle|reins|shaft"]) is drawn on it; hide what is not on yet. */
export const horse = (attr = 'data-horse="1"') => `<g ${attr}>
  <path d="M -40 -270 Q -60 -340 -10 -360 L 40 -330 Q 30 -300 20 -270 Z" fill="${K.horseD}" stroke="${K.ink}" stroke-width="7"/>
  <rect data-leg="0" x="-150" y="-140" width="34" height="140" rx="12" fill="${K.horseD}" stroke="${K.ink}" stroke-width="6"/><rect data-leg="1" x="-100" y="-140" width="34" height="140" rx="12" fill="${K.horse}" stroke="${K.ink}" stroke-width="6"/>
  <rect data-leg="2" x="70" y="-140" width="34" height="140" rx="12" fill="${K.horseD}" stroke="${K.ink}" stroke-width="6"/><rect data-leg="3" x="120" y="-140" width="34" height="140" rx="12" fill="${K.horse}" stroke="${K.ink}" stroke-width="6"/>
  <ellipse cx="0" cy="-170" rx="200" ry="90" fill="${K.horse}" stroke="${K.ink}" stroke-width="8"/>
  <path d="M 150 -210 Q 190 -300 230 -330 L 330 -290 Q 350 -270 330 -250 L 260 -250 Q 220 -220 200 -160 Z" fill="${K.horse}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M 160 -230 Q 180 -300 225 -335 L 210 -300 Q 190 -260 180 -220 Z" fill="${K.horseD}"/><circle cx="275" cy="-295" r="9" fill="${K.ink}"/><path d="M 236 -330 L 246 -370 L 262 -330" fill="${K.horse}" stroke="${K.ink}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M -195 -190 Q -260 -150 -240 -60" fill="none" stroke="${K.horseD}" stroke-width="22" stroke-linecap="round"/>
  <g data-tack="saddle"><path d="M -70 -258 Q 0 -300 70 -258 L 60 -205 L -60 -205 Z" fill="${K.pink}" stroke="${K.ink}" stroke-width="7"/></g>
  <g data-tack="reins"><path d="M 320 -262 Q 220 -170 40 -235" fill="none" stroke="${K.pinkD}" stroke-width="9"/><circle cx="318" cy="-262" r="10" fill="${K.paper}" stroke="${K.ink}" stroke-width="5"/></g>
  <g data-tack="shaft"><path d="M -190 -170 L -460 -150" stroke="${K.wood}" stroke-width="18" stroke-linecap="round"/></g>
</g>`;
/** swing the horse's legs; speed 0 = standing */
export const legs = (root, t, speed) => root.querySelectorAll('[data-leg]').forEach((l, i) => l.setAttribute('transform', `rotate(${(Math.sin(t / (180 / Math.max(0.01, speed)) + i * 1.6) * 18 * Math.min(1, speed)).toFixed(1)} ${+l.getAttribute('x') + 17} -140)`));
/** the cart, in the horse's coordinates (so the same translate/scale lines it up behind the horse); label on its side */
export const cart = (attr = 'data-cart="1"', label = '', fill = K.wood) => `<g ${attr}>${rect(-760, -260, 300, 170, { fill, r: 12 })}${label ? tx(-610, -160, label, { size: 44, color: K.white, f: 'serif', w: 900 }) : ''}<circle cx="-610" cy="-60" r="62" fill="${K.paper}" stroke="${K.ink}" stroke-width="8"/><circle cx="-610" cy="-60" r="12" fill="${K.ink}"/></g>`;

// ───────────────────────── small per-frame helpers shared by the blocks ─────────────────────────
export { sfx };
export const vis = (e, v) => { if (e) e.style.display = v ? '' : 'none'; };
export const fadeIn = (e, t, at, dur = 400) => { if (!e) return; e.style.display = t >= at ? '' : 'none'; e.setAttribute('opacity', String(clamp(seg(t, at, at + dur)))); };
export const fadeAway = (e, t, at, dur = 400) => { if (!e) return; const o = 1 - clamp(seg(t, at, at + dur)); e.style.display = o > 0 ? '' : 'none'; e.setAttribute('opacity', String(o)); };
/** put a group whose own drawing is centred on (0, 0) at (x, y) */
export const place = (e, x, y, s = 1, r = 0) => { if (e) e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s.toFixed(3)})`); };
/** one <text> with coloured parts: parts = [[string, colour], …] */
export const txParts = (x, y, parts, { size = 48, anchor = 'middle', f = 'sans', w = 800, attr = '' } = {}) =>
  `<text ${attr} x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT[f]}" font-weight="${w}" font-size="${size}" xml:space="preserve">${parts.map(([s, c]) => `<tspan fill="${c || K.ink}">${s}</tspan>`).join('')}</text>`;
/** a plain person (no face): head and shoulders; (x, base) = bottom centre */
export const person = (x, base, c = K.blue, attr = '') => `<g ${attr}><rect x="${x - 58}" y="${base - 150}" width="116" height="150" rx="40" fill="${c}" stroke="${K.ink}" stroke-width="7"/><circle cx="${x}" cy="${base - 196}" r="46" fill="${K.paper}" stroke="${K.ink}" stroke-width="7"/></g>`;
/** a numbered category tag: ①②③ in a pink circle + words */
export const badge = (x, y, n, words, attr = '') => { if (isWide()) { x = ST().x + 78; y = ST().y + 96; } return `<g ${attr}><circle cx="${x}" cy="${y}" r="34" fill="${K.pink}" stroke="${K.ink}" stroke-width="6"/>${tx(x, y + 16, String(n), { size: 44, color: K.white, f: 'num' })}${tx(x + 54, y + 16, words, { size: 44, anchor: 'start', f: 'serif', w: 900 })}</g>`; };
/** hats for the three roles, in the model box's own coordinates (its top edge is y = -100) */
export const HAT = {
  plan: `<path d="M -92 -98 Q -92 -176 0 -176 Q 92 -176 92 -98 Z" fill="${K.blue}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><path d="M 70 -104 L 160 -104" stroke="${K.ink}" stroke-width="16" stroke-linecap="round"/>`,
  work: `<path d="M -100 -100 Q -100 -186 0 -186 Q 100 -186 100 -100 Z" fill="${K.yellow}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><rect x="-124" y="-116" width="248" height="24" rx="12" fill="${K.yellow}" stroke="${K.ink}" stroke-width="8"/>`,
  pick: `<path d="M -84 -108 Q -76 -196 0 -202 Q 76 -196 84 -108 Z" fill="${K.horseD}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><path d="M -134 -100 Q 0 -134 134 -100 Q 0 -84 -134 -100 Z" fill="${K.horseD}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><path d="M -80 -134 L 80 -134" stroke="${K.ink}" stroke-width="12"/>`,
};
/** a model with a role: (x, y) = centre of its box; hat = plan | work | pick | '' ; label under it */
export const bot = (x, y, s, label = '', attr = '', hat = '') => `<g ${attr} transform="translate(${x} ${y}) scale(${s})">
  <rect x="-120" y="-100" width="240" height="200" rx="40" fill="${K.lilacL}" stroke="${K.ink}" stroke-width="8"/>
  <rect x="-84" y="-62" width="168" height="84" rx="20" fill="${K.ink}"/><circle data-eye="1" cx="0" cy="-20" r="20" fill="${K.lilac}"/>
  <path d="M -60 60 L 60 60" stroke="${K.ink}" stroke-width="8" stroke-linecap="round"/>${hat ? `<g data-hat="1">${HAT[hat]}</g>` : ''}${label ? tx(0, 152, label, { size: 46 }) : ''}</g>`;
