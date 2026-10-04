// Buddy — a ready-made 2D character for the narrator: a gumdrop body with eyes, rubber-hose limbs and an optional topper.
// Pure SVG in WORLD coordinates (the scene's 1080×1920 world), so hands and feet can be pinned to exact targets.
// render(pose) is a pure function of the pose; the scene computes poses from t.
// Give it your own look (colours, eyes, topper) — or skip it and draw your own narrator: the engine only asks for mount() and render().
//
// Local frame: origin = centre between the feet on the floor, y up is negative. Height to the top of the head ≈ 470.

export const INK = '#111112';
export const PAPER = '#F2EEE8';
export const PINK = '#FF3D72';

const BODY = 'M 0 -470 C 88 -470 136 -392 138 -280 C 140 -200 140 -150 128 -122 C 112 -98 70 -94 0 -94 '
  + 'C -70 -94 -112 -98 -128 -122 C -140 -150 -140 -200 -138 -280 C -136 -392 -88 -470 0 -470 Z';
const SPARK_Y = -528;
const HEART = 'M 0 6 C -10 -2 -14 -8 -14 -13 C -14 -19 -9 -22 -5 -22 C -2 -22 0 -20 0 -17 C 0 -20 2 -22 5 -22 C 9 -22 14 -19 14 -13 C 14 -8 10 -2 0 6 Z';

/** A look: body / outline / limb / shoe / blush colours, face ink, pupil, eyes: 'plain' | 'sclera', topper: 'quill' | 'star' | null. */
export const LOOK_DEFAULT = { ink: '#F2EEE8', pupil: '#111112', body: '#26232B', outline: '#F2EEE8', limb: '#26232B', shoe: '#FF3D72',
  blush: '#FF3D72', belly: null, eyes: 'sclera', topper: null, top: '#F2EEE8', top2: '#FF3D72', spin: false };
function topperSvg(L) {
  if (L.topper === 'quill') return `<g transform="rotate(18) translate(0 10)">
      <path d="M 0 52 C -30 10 -26 -58 22 -104 C 40 -48 30 10 0 52 Z" fill="${L.top}"/>
      <path d="M 2 50 C 6 0 12 -50 20 -96" fill="none" stroke="${L.top2}" stroke-width="5" stroke-linecap="round"/>
      <path d="M -9 46 L 9 46 L 0 70 Z" fill="${INK}"/></g>
      <path d="M 52 -52 L 57 -38 L 71 -33 L 57 -28 L 52 -14 L 47 -28 L 33 -33 L 47 -38 Z" fill="${L.top2}"/>`;
  if (L.topper === 'star') return `<path d="M 0 -44 L 11 -11 L 44 0 L 11 11 L 0 44 L -11 11 L -44 0 L -11 -11 Z" fill="${L.top}"/>
      <path d="M 44 -46 L 49 -34 L 61 -29 L 49 -24 L 44 -12 L 39 -24 L 27 -29 L 39 -34 Z" fill="${L.top2}"/>`;
  return '';
}

export function buddySvg(id = 'ck', look = {}) {
  const L = { ...LOOK_DEFAULT, ...look };
  const eye = (side) => `<g data-eye="${side}">
      <ellipse data-e="white" cx="0" cy="0" rx="25" ry="30" fill="#FFFFFF" style="display:none"/>
      <ellipse data-e="dot" cx="0" cy="0" rx="16" ry="24" fill="${L.pupil}"/>
      <circle data-e="hi" cx="5" cy="-8" r="5.5" fill="#fff"/>
      <circle data-e="hi2" cx="-5" cy="8" r="3" fill="#fff" style="display:none"/>
      <path data-e="arc" d="M -16 4 Q 0 -18 16 4" fill="none" stroke="${L.ink}" stroke-width="7" stroke-linecap="round" style="display:none"/>
      <path data-e="lid" d="M -17 -4 L 17 -4" fill="none" stroke="${L.ink}" stroke-width="6" stroke-linecap="round" style="display:none"/>
      <path data-e="heart" d="${HEART}" transform="scale(1.35) translate(0 8)" fill="${PINK}" style="display:none"/>
      <path data-e="star" d="M 0 -20 L 5 -5 L 20 0 L 5 5 L 0 20 L -5 5 L -20 0 L -5 -5 Z" fill="${L.ink}" style="display:none"/>
    </g>`;
  return `<g class="buddy" data-buddy="${id}">
  <ellipse data-shadow cx="0" cy="0" rx="120" ry="14" fill="${INK}" opacity="0.08"/>
  <g data-back>
    <path data-arm="B" fill="none" stroke="${L.limb}" stroke-width="18" stroke-linecap="round"/>
    <circle data-hand="B" r="17" fill="${L.limb}"/>
  </g>
  <path data-leg="L" fill="none" stroke="${L.limb}" stroke-width="20" stroke-linecap="round"/>
  <path data-leg="R" fill="none" stroke="${L.limb}" stroke-width="20" stroke-linecap="round"/>
  <ellipse data-shoe="L" rx="31" ry="15" fill="${L.shoe}"/>
  <ellipse data-shoe="R" rx="31" ry="15" fill="${L.shoe}"/>
  <g data-backfront></g>
  <g data-body>
    <path data-bodypath d="${BODY}" fill="${L.body}"${L.outline ? ` stroke="${L.outline}" stroke-width="7" stroke-linejoin="round"` : ''}/>
    ${L.belly ? `<ellipse cx="0" cy="-190" rx="92" ry="78" fill="${L.belly}"/>` : ''}
    <g data-face>
      <ellipse data-blush="L" cx="-86" cy="-290" rx="22" ry="12" fill="${L.blush}"/>
      <ellipse data-blush="R" cx="86" cy="-290" rx="22" ry="12" fill="${L.blush}"/>
      <g data-eyepos="L" transform="translate(-50 -335)">${eye('L')}</g>
      <g data-eyepos="R" transform="translate(50 -335)">${eye('R')}</g>
      <path data-brow="L" fill="none" stroke="${L.ink}" stroke-width="6.5" stroke-linecap="round"/>
      <path data-brow="R" fill="none" stroke="${L.ink}" stroke-width="6.5" stroke-linecap="round"/>
      <g data-mouthpos transform="translate(0 -292)">
        <clipPath id="${id}-mclip"><path data-mclip/></clipPath>
        <path data-mouth fill="none" stroke="${L.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse data-tongue cx="0" cy="14" rx="13" ry="8" fill="${PINK}" clip-path="url(#${id}-mclip)"/>
      </g>
    </g>
    <g data-spark transform="translate(0 ${SPARK_Y})"><g data-sparkrot>${topperSvg(L)}</g></g>
  </g>
  <g data-front>
    <path data-arm="F" fill="none" stroke="${L.limb}" stroke-width="18" stroke-linecap="round"/>
    <g data-pencil style="display:none">
      <rect x="-7" y="-92" width="14" height="78" rx="3" fill="${INK}"/>
      <rect x="-7" y="-104" width="14" height="14" rx="4" fill="${PINK}"/>
      <path d="M -7 -14 L 7 -14 L 0 6 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M -2.5 -2 L 2.5 -2 L 0 6 Z" fill="${INK}"/>
    </g>
    <circle data-hand="F" r="17" fill="${L.limb}"/>
  </g>
  <g data-fx>
    <g data-fx-bang><rect x="-7" y="-58" width="14" height="40" rx="7" fill="${INK}"/><circle cx="0" cy="-4" r="8" fill="${INK}"/></g>
    <g data-fx-q><path d="M -14 -44 C -14 -64 14 -64 14 -46 C 14 -32 0 -32 0 -16" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="0" r="6.5" fill="${INK}"/></g>
    <g data-fx-sweat><path d="M 0 -26 C 8 -12 13 -4 13 4 C 13 12 7 17 0 17 C -7 17 -13 12 -13 4 C -13 -4 -8 -12 0 -26 Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>
    ${[0, 1, 2].map((i) => `<path data-fx-heart="${i}" d="${HEART}" fill="${PINK}"/>`).join('')}
    ${[0, 1, 2].map((i) => `<path data-fx-sparkle="${i}" d="M 0 -16 L 4 -4 L 16 0 L 4 4 L 0 16 L -4 4 L -16 0 L -4 -4 Z" fill="${INK}"/>`).join('')}
    ${[0, 1, 2].map((i) => `<text data-fx-z="${i}" font-family="Inter Tight, sans-serif" font-weight="900" font-size="34" fill="${INK}">z</text>`).join('')}
    ${[0, 1].map((i) => `<g data-fx-note="${i}"><ellipse cx="-6" cy="0" rx="9" ry="7" fill="${INK}" transform="rotate(-20 -6 0)"/><path d="M 2 -2 L 2 -34 L 16 -28" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g>`).join('')}
    ${[0, 1, 2].map((i) => `<circle data-fx-think="${i}" r="${6 + i * 4}" fill="#fff" stroke="${INK}" stroke-width="4"/>`).join('')}
    ${[0, 1, 2, 3].map((i) => `<circle data-fx-dust="${i}" r="14" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`).join('')}
  </g>
</g>`;
}

// Expression presets → face parameters. Anything can be overridden per pose.
const EXPR = {
  neutral: { eyes: 'dot', eyeS: 1, mouth: 'smile', curve: 0.35, open: 0, blush: 0.55, brow: null },
  smile: { eyes: 'dot', eyeS: 1, mouth: 'smile', curve: 0.8, open: 0, blush: 0.75, brow: null },
  happy: { eyes: 'arc', mouth: 'grin', open: 0.55, blush: 0.9, brow: null },
  joy: { eyes: 'arc', mouth: 'grin', open: 1, blush: 1, brow: null },
  surprised: { eyes: 'dot', eyeS: 1.22, mouth: 'o', open: 1, blush: 0.5, brow: 'up' },
  curious: { eyes: 'dot', eyeS: 1.05, mouth: 'o', open: 0.35, blush: 0.5, brow: 'quirk' },
  thinking: { eyes: 'dot', eyeS: 0.95, mouth: 'side', open: 0, blush: 0.45, brow: 'quirk' },
  shy: { eyes: 'arc', mouth: 'cat', open: 0, blush: 1, brow: 'worried' },
  touched: { eyes: 'shine', eyeS: 1.15, mouth: 'wobble', open: 0, blush: 1, brow: 'worried' },
  soft: { eyes: 'half', eyeS: 1, mouth: 'smile', curve: 0.25, open: 0, blush: 0.55, brow: 'worried' },
  nervous: { eyes: 'dot', eyeS: 0.92, mouth: 'wavy', open: 0, blush: 0.7, brow: 'worried' },
  determined: { eyes: 'dot', eyeS: 1, mouth: 'smile', curve: 0.55, open: 0, blush: 0.55, brow: 'down' },
  bored: { eyes: 'half', eyeS: 1, mouth: 'flat', open: 0, blush: 0.4, brow: null },
  love: { eyes: 'heart', mouth: 'grin', open: 0.6, blush: 1, brow: null },
  starry: { eyes: 'shine', eyeS: 1.22, mouth: 'grin', open: 0.8, blush: 0.9, brow: 'up' },
  sleepy: { eyes: 'closed', mouth: 'o', open: 0.25, blush: 0.4, brow: null },
  wink: { eyes: 'wink', mouth: 'grin', open: 0.45, blush: 0.8, brow: null },
};

const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, p) => a + (b - a) * p;

/** Local → world for a pose (feet anchor, squash/stretch, lean). */
export function toWorld(p, lx, ly) {
  const a = rad(p.rot || 0);
  const z = p.size ?? 1;
  const x = lx * (p.sx ?? 1) * z; const y = ly * (p.sy ?? 1) * z;
  return { x: p.x + x * Math.cos(a) - y * Math.sin(a), y: p.y + x * Math.sin(a) + y * Math.cos(a) };
}
/** Shoulder positions (world). Facing right (f>0): front arm from the right edge, back arm tucked behind. */
export function shoulders(p) {
  const f = p.facing || 0; const s = Math.sign(f) || 1; const af = Math.abs(f);
  const F = f === 0 ? toWorld(p, 128, -250) : toWorld(p, s * lerp(128, 108, af), -246);
  const B = f === 0 ? toWorld(p, -128, -250) : toWorld(p, s * lerp(-128, 36, af), -262);
  return { F, B };
}
/** Idle hanging hands (world), with a slow sway. */
export function idleHands(p, t = 0) {
  const f = p.facing || 0; const s = Math.sign(f) || 1;
  const sw = Math.sin(t / 900) * 4;
  if (f === 0) return { F: toWorld(p, 158 + sw * 0.5, -150), B: toWorld(p, -158 - sw * 0.5, -150) };
  return { F: toWorld(p, s * 128 + sw, -128), B: toWorld(p, s * 70 - sw, -136) };
}
export function idleFeet(p) {
  const z = p.size ?? 1;
  return { L: { x: p.x - 50 * z, y: p.y }, R: { x: p.x + 50 * z, y: p.y } };
}

function hose(a, b, bend, side = 0) {
  // Rubber-hose limb: one quadratic curve. The elbow bows downward when the limb is mostly horizontal,
  // outward (away from the body, `side` = -1 left / +1 right) when it hangs.
  const dx = b.x - a.x; const dy = b.y - a.y; const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len; let ny = dx / len;
  const flip = Math.abs(ny) > 0.35 ? ny < 0 : nx * side < 0;
  if (flip) { nx = -nx; ny = -ny; }
  const cx = (a.x + b.x) / 2 + nx * bend * len; const cy = (a.y + b.y) / 2 + ny * bend * len;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export function createBuddy(root, look = {}) {
  const LK = { ...LOOK_DEFAULT, ...look };
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const eyes = ['L', 'R'].map((k) => {
    const g = q(`[data-eye="${k}"]`);
    const part = Object.fromEntries([...g.querySelectorAll('[data-e]')].map((e) => [e.dataset.e, e]));
    return { g, pos: q(`[data-eyepos="${k}"]`), part, side: k === 'L' ? -1 : 1 };
  });
  const R = {
    shadow: q('[data-shadow]'), body: q('[data-body]'), face: q('[data-face]'), bodyPath: q('[data-bodypath]'), backFront: q('[data-backfront]'),
    armF: q('[data-arm="F"]'), armB: q('[data-arm="B"]'), handF: q('[data-hand="F"]'), handB: q('[data-hand="B"]'),
    back: q('[data-back]'), front: q('[data-front]'),
    legL: q('[data-leg="L"]'), legR: q('[data-leg="R"]'), shoeL: q('[data-shoe="L"]'), shoeR: q('[data-shoe="R"]'),
    blushL: q('[data-blush="L"]'), blushR: q('[data-blush="R"]'), browL: q('[data-brow="L"]'), browR: q('[data-brow="R"]'),
    mouthPos: q('[data-mouthpos]'), mouth: q('[data-mouth]'), mclip: q('[data-mclip]'), tongue: q('[data-tongue]'),
    spark: q('[data-spark]'), sparkRot: q('[data-sparkrot]'), pencil: q('[data-pencil]'),
    bang: q('[data-fx-bang]'), qm: q('[data-fx-q]'), sweat: q('[data-fx-sweat]'),
    hearts: qa('[data-fx-heart]'), sparkles: qa('[data-fx-sparkle]'), zs: qa('[data-fx-z]'), notes: qa('[data-fx-note]'),
    thinks: qa('[data-fx-think]'), dust: qa('[data-fx-dust]'),
  };
  const show = (el, v) => { const d = v ? '' : 'none'; if (el.style.display !== d) el.style.display = d; };
  const attr = (el, k, v) => { const s = String(v); if (el.getAttribute(k) !== s) el.setAttribute(k, s); };
  const tf = (el, v) => attr(el, 'transform', v);

  function render(p, t = 0) {
    const e = { ...EXPR[p.expr || 'neutral'], ...(p.face || {}) };
    const f = p.facing || 0; const af = Math.abs(f);
    // body
    const a = p.rot || 0;
    const Z = p.size ?? 1;
    tf(R.body, `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${a.toFixed(2)}) scale(${((p.sx ?? 1) * Z).toFixed(4)} ${((p.sy ?? 1) * Z).toFixed(4)})`);
    // shadow on the floor (shrinks while airborne)
    const floor = p.floor ?? p.y; const air = Math.max(0, floor - p.y);
    tf(R.shadow, `translate(${p.x.toFixed(1)} ${floor.toFixed(1)}) scale(${(Math.max(0.35, 1 - air / (500 * Z)) * Z).toFixed(3)})`);
    attr(R.shadow, 'opacity', (0.08 * Math.max(0.3, 1 - air / 400)).toFixed(3));
    show(R.shadow, p.shadow !== false);

    // face: turn + look
    const lx = (p.lx || 0) * 8; const ly = (p.ly || 0) * 7;
    tf(R.face, `translate(${(f * 40 + (p.lx || 0) * 6).toFixed(1)} ${((p.ly || 0) * 5).toFixed(1)})`);
    const spread = 52 * (1 - 0.16 * af);
    const blink = p.blink ?? 0;
    eyes.forEach((ey) => {
      tf(ey.pos, `translate(${(ey.side * spread).toFixed(1)} -335)`);
      const type = e.eyes === 'wink' ? (ey.side < 0 ? 'dot' : 'arc') : e.eyes;
      const P = ey.part;
      const dotLike = type === 'dot' || type === 'shine' || type === 'half';
      show(P.dot, dotLike && blink < 0.92); show(P.hi, dotLike && type !== 'half' && blink < 0.5);
      show(P.white, LK.eyes === 'sclera' && dotLike && blink < 0.92);
      show(P.hi2, type === 'shine' && blink < 0.5);
      show(P.arc, type === 'arc' || type === 'closed' || (dotLike && blink >= 0.92));
      show(P.lid, type === 'half'); show(P.heart, type === 'heart'); show(P.star, type === 'star');
      if (dotLike) {
        const s = e.eyeS ?? 1;
        const ry = 24 * s * (type === 'half' ? 0.5 : 1) * (1 - 0.9 * Math.min(1, blink));
        const pk = LK.eyes === 'sclera' ? 0.62 : 1;
        attr(P.dot, 'rx', (16 * s * pk).toFixed(2)); attr(P.dot, 'ry', (ry * pk).toFixed(2));
        if (LK.eyes === 'sclera') { attr(P.white, 'ry', (30 * s * (type === 'half' ? 0.55 : 1) * (1 - 0.9 * Math.min(1, blink))).toFixed(2)); attr(P.white, 'rx', (25 * s).toFixed(2)); attr(P.white, 'cy', (type === 'half' ? 9 : 0)); }
        attr(P.dot, 'cx', lx.toFixed(1)); attr(P.dot, 'cy', (ly + (type === 'half' ? 9 : 0)).toFixed(1));
        attr(P.hi, 'cx', (lx + 5 * s).toFixed(1)); attr(P.hi, 'cy', (ly - 8 * s).toFixed(1));
        attr(P.hi, 'r', (type === 'shine' ? 7.5 : 5.5).toFixed(1));
        attr(P.hi2, 'cx', (lx - 5 * s).toFixed(1)); attr(P.hi2, 'cy', (ly + 8 * s).toFixed(1));
        if (type === 'half') attr(P.lid, 'd', `M ${(lx - 18).toFixed(1)} ${(ly + 1).toFixed(1)} L ${(lx + 18).toFixed(1)} ${(ly + 1).toFixed(1)}`);
      }
      const closed = type === 'closed' || (dotLike && blink >= 0.92);
      attr(P.arc, 'd', closed ? `M ${lx - 16} ${ly - 2} Q ${lx} ${ly + 12} ${lx + 16} ${ly - 2}` : `M ${lx - 16} ${ly + 4} Q ${lx} ${ly - 18} ${lx + 16} ${ly + 4}`);
      if (type === 'heart') tf(P.heart, `translate(${lx} ${ly + 8}) scale(${(1.35 + 0.12 * Math.sin(t / 110)).toFixed(3)})`);
      if (type === 'star') tf(P.star, `translate(${lx} ${ly}) rotate(${(t / 8) % 360}) scale(${(1 + 0.1 * Math.sin(t / 90)).toFixed(3)})`);
    });
    // brows
    const browY = -380 - (e.brow === 'up' ? 16 : 0);
    const browShape = (side) => {
      const x = side * spread + lx * 0.5;
      if (e.brow === 'up') return `M ${x - 15} ${browY + 2} Q ${x} ${browY - 8} ${x + 15} ${browY + 2}`;
      if (e.brow === 'worried') return side < 0 ? `M ${x - 15} ${browY + 6} L ${x + 13} ${browY - 5}` : `M ${x - 13} ${browY - 5} L ${x + 15} ${browY + 6}`;
      if (e.brow === 'down') return side < 0 ? `M ${x - 15} ${browY - 4} L ${x + 13} ${browY + 7}` : `M ${x - 13} ${browY + 7} L ${x + 15} ${browY - 4}`;
      if (e.brow === 'quirk') return side < 0 ? `M ${x - 14} ${browY + 3} L ${x + 14} ${browY + 3}` : `M ${x - 14} ${browY - 2} Q ${x} ${browY - 14} ${x + 14} ${browY - 4}`;
      return '';
    };
    show(R.browL, !!e.brow); show(R.browR, !!e.brow);
    if (e.brow) { attr(R.browL, 'd', browShape(-1)); attr(R.browR, 'd', browShape(1)); }
    // blush
    const bo = Math.max(0, Math.min(1, e.blush ?? 0.5));
    attr(R.blushL, 'opacity', bo.toFixed(2)); attr(R.blushR, 'opacity', bo.toFixed(2));
    attr(R.blushL, 'cx', (-86 * (1 - 0.1 * af)).toFixed(1)); attr(R.blushR, 'cx', (86 * (1 - 0.1 * af)).toFixed(1));

    // mouth (talk overrides the rest shape while speaking)
    const talk = Math.max(0, Math.min(1, p.talk || 0));
    let type = e.mouth; let open = e.open ?? 0;
    if (talk > 0.02) { type = 'talk'; open = talk; }
    tf(R.mouthPos, `translate(${(lx * 0.6).toFixed(1)} ${(-292 + ly * 0.4).toFixed(1)})`);
    let d = ''; let filled = false; let tongue = false;
    const c = e.curve ?? 0.4;
    switch (type) {
      case 'smile': d = `M -20 -2 Q 0 ${(-2 + 26 * c).toFixed(1)} 20 -2`; break;
      case 'grin': { const h = 8 + 26 * open; d = `M -26 -6 L 26 -6 Q 25 ${h.toFixed(1)} 0 ${h.toFixed(1)} Q -25 ${h.toFixed(1)} -26 -6 Z`; filled = true; tongue = open > 0.35; break; }
      case 'o': { const rx = 10 + 3 * open; const ry = 6 + 11 * open; d = `M ${-rx} 4 A ${rx} ${ry} 0 1 0 ${rx} 4 A ${rx} ${ry} 0 1 0 ${-rx} 4 Z`; filled = true; break; }
      case 'talk': { const rx = 17 - 4 * open; const ry = 4 + 15 * open; d = `M ${-rx} 2 A ${rx} ${ry} 0 1 0 ${rx} 2 A ${rx} ${ry} 0 1 0 ${-rx} 2 Z`; filled = true; tongue = open > 0.45; break; }
      case 'flat': d = 'M -15 2 L 15 2'; break;
      case 'side': d = 'M -12 4 Q 4 8 18 -4'; break;
      case 'wavy': d = 'M -22 2 q 5.5 -7 11 0 t 11 0 t 11 0 t 11 0'; break;
      case 'cat': d = 'M -22 -4 Q -11 12 0 -1 Q 11 12 22 -4'; break;
      case 'wobble': d = `M -16 2 q 4 ${(-3 + Math.sin(t / 70) * 1.5).toFixed(1)} 8 0 t 8 0 t 8 0 t 8 0`; break;
      default: d = 'M -15 2 L 15 2';
    }
    attr(R.mouth, 'd', d);
    attr(R.mouth, 'fill', filled ? LK.ink : 'none');
    attr(R.mouth, 'stroke-width', filled ? '4' : '7');
    show(R.tongue, tongue);
    if (tongue) { attr(R.mclip, 'd', d); attr(R.tongue, 'cy', type === 'talk' ? (2 + 15 * open).toFixed(1) : (8 + 22 * open).toFixed(1)); }

    // spark: rotation + scale + a little lag bounce
    const sp = p.spark || {};
    tf(R.spark, `translate(${(f * 10).toFixed(1)} ${(SPARK_Y + (sp.dy || 0)).toFixed(1)}) scale(${(sp.s ?? 1).toFixed(3)})`);
    tf(R.sparkRot, `rotate(${(LK.spin ? (sp.rot ?? 0) % 360 : Math.sin((sp.rot ?? 0) / 40) * 9).toFixed(2)})`);

    // limbs
    const sh = shoulders(p); const idle = idleHands(p, t);
    const hF = p.handF || idle.F; const hB = p.handB || idle.B;
    const sideF = f === 0 ? 1 : Math.sign(f); const sideB = f === 0 ? -1 : Math.sign(f);
    attr(R.armF, 'd', hose(sh.F, hF, p.bendF ?? 0.1, sideF)); attr(R.armB, 'd', hose(sh.B, hB, p.bendB ?? 0.1, sideB));
    attr(R.armF, 'stroke-width', (18 * Z).toFixed(1)); attr(R.armB, 'stroke-width', (18 * Z).toFixed(1));
    attr(R.handF, 'r', (17 * Z).toFixed(1)); attr(R.handB, 'r', (17 * Z).toFixed(1));
    attr(R.handF, 'cx', hF.x.toFixed(1)); attr(R.handF, 'cy', hF.y.toFixed(1));
    attr(R.handB, 'cx', hB.x.toFixed(1)); attr(R.handB, 'cy', hB.y.toFixed(1));
    // front-facing: both arms in front of the body; turned: the back arm goes behind
    const backArmInFront = af < 0.3;
    if (backArmInFront && R.back.parentNode !== R.front) R.front.insertBefore(R.back, R.front.firstChild);
    if (!backArmInFront && R.back.parentNode === R.front) root.insertBefore(R.back, root.querySelector('[data-leg="L"]'));
    const feet = { ...idleFeet(p), ...(p.feet || {}) };
    const hips = { L: toWorld(p, -46, -104), R: toWorld(p, 46, -104) };
    ['L', 'R'].forEach((k) => {
      const ft = feet[k]; const hp = hips[k];
      attr(R[`leg${k}`], 'd', hose(hp, { x: ft.x, y: ft.y - 12 * Z }, 0.06, k === 'L' ? -1 : 1)); attr(R[`leg${k}`], 'stroke-width', (20 * Z).toFixed(1));
      tf(R[`shoe${k}`], `translate(${(ft.x + f * 8 * Z).toFixed(1)} ${(ft.y - 13 * Z).toFixed(1)}) rotate(${(ft.rot || 0).toFixed(1)}) scale(${Z.toFixed(3)})`);
    });
    // arms behind the back (hands clasped behind): the front group goes under the body
    const wantBack = !!p.armsBack;
    if (wantBack && R.front.parentNode !== R.backFront) R.backFront.appendChild(R.front);
    if (!wantBack && R.front.parentNode === R.backFront) root.insertBefore(R.front, root.querySelector('[data-fx]'));
    // spark only (the intro draws the spark before the body pops in)
    const hide = !!p.hideBody;
    [R.bodyPath, R.face, R.back, R.front, R.legL, R.legR, R.shoeL, R.shoeR].forEach((el) => show(el, !hide));
    if (hide) show(R.shadow, false);
    // pencil in the front hand
    show(R.pencil, !!p.pencil);
    if (p.pencil) tf(R.pencil, `translate(${hF.x.toFixed(1)} ${hF.y.toFixed(1)}) rotate(${(p.pencilRot ?? 20).toFixed(1)}) scale(${Z.toFixed(3)})`);

    // effects (positions relative to the head, world space)
    const fx = p.fx || {};
    const head = toWorld(p, 0, -470);
    const put = (el, v, x, y, s = 1, r = 0) => {
      show(el, v > 0.01);
      if (v > 0.01) { tf(el, `translate(${(head.x + (x - head.x) * Z).toFixed(1)} ${(head.y + (y - head.y) * Z).toFixed(1)}) rotate(${r.toFixed(1)}) scale(${(s * Z).toFixed(3)})`); attr(el, 'opacity', Math.min(1, v).toFixed(2)); }
    };
    const pop = (v) => (v < 0.5 ? 1.25 * Math.sin((v / 0.5) * Math.PI / 2) : 1.25 - 0.25 * Math.min(1, (v - 0.5) * 4));
    put(R.bang, fx.bang ? 1 : 0, head.x + 118, head.y - 6, fx.bang ? pop(fx.bang) : 1, 12);
    put(R.qm, fx.q ? 1 : 0, head.x + 118, head.y - 2, fx.q ? pop(fx.q) : 1, 10);
    put(R.sweat, fx.sweat || 0, head.x - 128, head.y + 90 + (fx.sweat ? (1 - fx.sweat) * -10 : 0), 1, -8);
    R.hearts.forEach((el, i) => {
      const v = fx.hearts === undefined ? -1 : ((fx.hearts - i * 0.18) % 1 + 1) % 1;
      const on = fx.hearts !== undefined && fx.hearts - i * 0.18 >= 0;
      put(el, on ? Math.sin(v * Math.PI) : 0, head.x + (i - 1) * 70 + Math.sin(v * 6 + i) * 10, head.y - 20 - v * 130, 1.5 + v * 0.6, (i - 1) * 12);
    });
    R.sparkles.forEach((el, i) => {
      const v = fx.sparkle || 0; const ph = Math.sin((t / 260) + i * 2.1);
      put(el, v * (0.5 + 0.5 * ph), head.x + [-150, 150, 120][i], head.y + [30, 60, -60][i], 0.7 + 0.5 * (0.5 + 0.5 * ph), t / 20 + i * 30);
    });
    R.zs.forEach((el, i) => {
      const v = fx.zzz === undefined ? 0 : (((t / 1600) + i / 3) % 1);
      put(el, fx.zzz ? fx.zzz * Math.sin(v * Math.PI) : 0, head.x + 90 + v * 70 + i * 6, head.y - 10 - v * 120, 0.8 + v * 0.8, -10);
    });
    R.notes.forEach((el, i) => {
      const v = (((t / 1400) + i / 2) % 1);
      put(el, fx.notes ? fx.notes * Math.sin(v * Math.PI) : 0, head.x + (i ? -120 : 120) + Math.sin(v * 7) * 12, head.y + 40 - v * 110, 1, (i ? -12 : 12));
    });
    R.thinks.forEach((el, i) => {
      const v = fx.think || 0; const on = v > i * 0.25;
      put(el, on ? Math.min(1, (v - i * 0.25) * 4) : 0, head.x + 100 + i * 34, head.y - 10 - i * 40 + Math.sin(t / 400 + i) * 4, 1);
    });
    R.dust.forEach((el, i) => {
      const v = fx.dust || 0; const side = i % 2 ? 1 : -1; const k = i < 2 ? 1 : 1.6;
      put(el, v > 0 && v < 1 ? (1 - v) : 0, p.x + side * (110 + v * 90 * k), floor - 12 - v * 20 * k, 0.6 + v * 0.8, 0);
    });
  }
  return { render };
}

/**
 * Adapter for lib/narration.js:  character: buddyCharacter({ look, moods: (film) => [[fromMs, expression, effect?], …] })
 * expressions: neutral smile happy joy surprised curious thinking shy touched soft nervous determined bored love starry sleepy wink
 * effects: sweat sparkle bang q zzz hearts.  The last mood whose time has passed wins. He gestures while he talks and waves on the end card.
 */
export function buddyCharacter({ look = {}, moods = null, x = 860, y = 1690, size = 0.6, facing = -0.35 } = {}) {
  const L = { ...LOOK_DEFAULT, ...look };
  let rig = null; let M = null;
  const blinkAt = (t) => {
    const n = Math.floor(t / 2900); const off = Math.abs((Math.sin(n * 12.9898) * 43758.5453) % 1);
    const ph = t - n * 2900 - off * 800;
    return ph >= 0 && ph < 140 ? Math.sin((ph / 140) * Math.PI) : 0;
  };
  return {
    mount(layer) { layer.innerHTML = buddySvg('nv', L); rig = createBuddy(layer.querySelector('[data-buddy]'), L); },
    render(t, film, { ending }) {
      if (!M) M = moods ? moods(film) : [[0, 'smile']];
      const p = { x, y, floor: y, size, facing, expr: 'smile' };
      let m = M[0];
      for (const k of M) if (t >= k[0]) m = k;
      p.expr = m[1];
      const since = t - m[0]; const up = Math.min(1, Math.max(0, since / 260)) || 0.01;
      if (m[2] === 'sweat') p.fx = { sweat: 1 };
      if (m[2] === 'sparkle') p.fx = { sparkle: up };
      if (m[2] === 'bang') p.fx = { bang: up };
      if (m[2] === 'q') p.fx = { q: up };
      if (m[2] === 'zzz') p.fx = { zzz: up };
      if (m[2] === 'hearts') p.fx = { hearts: since / 900 };
      const sh = shoulders(p); const idle = idleHands(p, t);
      if (film.speaking(t) && !ending) p.handB = { x: idle.B.x + (sh.B.x - 70 - idle.B.x) * 0.9, y: idle.B.y + (sh.B.y - 40 + Math.sin(t / 300) * 8 - idle.B.y) * 0.9 };
      if (ending) { const w = Math.sin(((t - film.T.card) / 1000) * Math.PI * 4); p.handF = { x: sh.F.x + 30 + w * 14, y: sh.F.y - 70 }; p.x = 540; p.facing = 0; p.size = 0.8; p.y = 1600; p.floor = 1600; }
      if (!['happy', 'joy', 'starry', 'sleepy'].includes(p.expr)) p.blink = blinkAt(t);
      p.talk = film.talk(t);
      rig.render(p, t);
    },
  };
}
