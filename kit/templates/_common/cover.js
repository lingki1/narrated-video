// The covers of this film: designed for the feed, not grabbed from the film (the skill's references/cover.md).
// Two to four big characters in the top 70%, one thing happening, a flat bright ground; three different ideas, each drawn
// for the wide frame (1920×1080, also the middle band of the 4:3 canvas) and for the tall one (1080×1440).
//   node tools/cover_render.mjs <reel> --safe      python tools/cover_check.py <reel>
import { K } from '../../lib/parts.js';
import { mountCovers } from '../../lib/cover.js';

/** cover lettering: the heaviest sans, optional outline drawn under the fill */
const big = (x, y, s, size, { color = K.ink, anchor = 'start', stroke = '', sw = 0, f = 'Noto Sans SC' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${f}" font-weight="900" font-size="${size}" fill="${color}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke"` : ''}>${s}</text>`;
/** the ground: a band that runs off the bottom of any canvas, with the ink line on top */
const ground = (W, y, c) => `<rect x="-10" y="${y}" width="${W + 20}" height="1200" fill="${c}"/><path d="M -10 ${y} L ${W + 10} ${y}" stroke="${K.ink}" stroke-width="10"/>`;

mountCovers({
  // replace with this film's first idea: what is happening in the picture, which words, which title it goes with
  first: ({ W, tall }) => ({
    bg: K.pink,
    svg: `${ground(W, tall ? 1160 : 890, K.paper)}
      ${tall ? big(60, 505, '四个', 240) + big(540, 505, '大字', 240, { color: K.paper, stroke: K.ink, sw: 22 })
    : big(100, 350, '四个', 300) + big(100, 690, '大字', 300, { color: K.paper, stroke: K.ink, sw: 26 })}`,
    cast: [{ x: tall ? 560 : 1250, y: tall ? 1245 : 975, size: 1.1, facing: -0.3, expr: 'surprised' }],
  }),
});
