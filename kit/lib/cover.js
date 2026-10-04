// Covers are designed, not grabbed from the film. One page draws one cover as a single SVG, with the film's own parts and its own
// character, at the sizes the platforms ask for. tools/cover_render.mjs screenshots every cover × ratio; tools/cover_check.py
// shrinks them to feed size, in grey and blurred, with the interface strips laid over, so a cover is judged the way it is seen.
// The rules (how many characters, how big, where nothing may go) and where they come from: the skill's references/cover.md.
//
//   cover.js in a reel:   mountCovers({ name: ({ W, H, r, tall }) => ({ bg, svg, cast: [pose, …], over }) })
//   bg    the page colour (flat); it also fills the bleed above and below the 16:9 band of the 4:3 canvas
//   svg   everything behind the character (SVG string)
//   cast  one pose per character, as in lib/actor.js: { x, y, size, facing, expr, fx, handF, handB, look }
//   over  everything in front of the character
//   ?c=<name>&r=<ratio>   which cover, at which ratio;  &safe=1   paint what the platforms cover or crop
import { buddySvg, createBuddy } from './buddy.js';
import { LOOK } from './parts.js';

/**
 * the canvases:
 *   wide  1920×1080 (16:9)  YouTube (shot at ×2 = 3840×2160), and the 16:9 slots everywhere
 *   land  1920×1440 (4:3)   B 站 / 抖音横封面: the wide cover in the middle band, 180 px of plain ground above and below
 *   tall  1080×1440 (3:4)   抖音竖封面 / 小红书 / 视频号: words and subject inside the middle 1080×1080
 * a cover function is called with the wide frame for both wide and land (same drawing), and with the tall frame for tall
 */
export const RATIOS = { wide: [1920, 1080, 0], land: [1920, 1440, 180], tall: [1080, 1440, 0] };

/** what the interfaces cover or crop, in the cover's own coordinates: [x, y, w, h, label] */
export const SAFE = {
  wide: (W, H) => [[0, H * 0.72, W, H * 0.28, 'B 站：播放量 · 弹幕 · 时长条（底部约 28%）'], [0, 0, W * 0.05, H * 0.72, ''], [W * 0.95, 0, W * 0.05, H * 0.72, ''], [W - 380, H - 160, 380, 160, 'YouTube 时长']],
  tall: (W, H) => [[0, 0, W, (H - W) / 2, '主页裁成 1:1 时裁掉'], [0, H - (H - W) / 2, W, (H - W) / 2, '主页裁成 1:1 时裁掉 · 底部 10% 是播放量'], [0, (H - W) / 2, 330, 110, '置顶']],
};

export async function mountCovers(covers, { look = LOOK } = {}) {
  const q = new URLSearchParams(location.search); const ids = Object.keys(covers);
  const id = ids.includes(q.get('c')) ? q.get('c') : ids[0]; const r = RATIOS[q.get('r')] ? q.get('r') : 'wide';
  const [W, H, bleed] = RATIOS[r]; const h = H - bleed * 2;        // the frame the cover is drawn in
  const c = covers[id]({ W, H: h, r, tall: W < H }); const cast = c.cast || [];
  const zones = q.has('safe') ? SAFE[W < H ? 'tall' : 'wide'](W, h).map(([x, y, w, hh, label]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#0077FF" opacity="0.32"/>${label ? `<text x="${x + 16}" y="${y + 40}" font-family="Noto Sans SC" font-weight="700" font-size="30" fill="#FFFFFF">${label}</text>` : ''}`).join('')
    + (bleed ? `<path d="M 0 0 L ${W} 0 M 0 ${h} L ${W} ${h}" stroke="#0077FF" stroke-width="6" stroke-dasharray="24 16"/>` : '') : '';
  document.body.style.cssText = 'margin:0;background:#222';
  document.body.innerHTML = `<svg id="cover" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 ${-bleed} ${W} ${H}" style="display:block">
    <rect x="-10" y="${-bleed - 10}" width="${W + 20}" height="${H + 20}" fill="${c.bg || '#F2EEE8'}"/>${c.svg || ''}
    ${cast.map((p, i) => `<g data-cast="${i}">${buddySvg(`c${i}`, { ...look, ...(p.look || {}) })}</g>`).join('')}${c.over || ''}${zones}</svg>`;
  cast.forEach((p, i) => createBuddy(document.querySelector(`[data-cast="${i}"] [data-buddy]`), { ...look, ...(p.look || {}) }).render({ shadow: false, ...p }, 0));
  await document.fonts.ready;
  window.COVER = { ids, ratios: Object.keys(RATIOS), id, r, W, H, ready: true };
}
