// 三维分层 · the page side of blender/peaks.py: layers rendered once by Blender, stacked here and moved by a camera
// __TITLE__ — a wide film (1920×1080) with no template: the layered scene fills the frame, the narration runs along the bottom.
// Before this page can show anything:  python tools/shot3d.py <film> peaks layers   (it writes ./img/peaks/*.webp + layers.js)
// How it works and what to check: the skill's references/3d.md.
import { createFilm, E, el, seg } from '../../lib/film.js';
import { plates } from '../../lib/plates.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';
import META from './img/peaks/layers.js';

const film = createFilm({ lines: LINES, durations: D, size: [1920, 1080], voices: { S: { tag: '她' } } });
const { T } = film;

// The scene is made now, not in build(): its pictures start loading at once, and the film is not ready until they are in.
const sc = plates(META, new URL('./img/peaks/', import.meta.url));
const A = sc.anchors; const body = sc.byId.buddy; const arm = sc.byId['buddy-arm'];
// The sun is not in the layers: the page draws it, so that it can move. slot(depth) is an empty layer at that distance (this
// one is farther than the last slab, so that slab's mist covers its lower half); what you put in it is placed in frame pixels,
// here at the anchor the scene script left. The red is the one Blender gives the disc in a still or a flight (inkkit's RED):
// where a flight hands over to these layers, both sides are the same picture.
const sky = sc.slot(A.sun.depth, 'sun');
const sun = el('div', '', '', `position:absolute;left:${A.sun.x - A.sun.r}px;top:${A.sun.y - A.sun.r}px;width:${2 * A.sun.r}px;height:${2 * A.sun.r}px;border-radius:50%;background:#D8342B`);
sky.append(sun);

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    const WAVE = T.end * 0.35;
    film.shot(0, T.card, sc.node, (t) => {
      // the camera, in scene units from where Blender's camera stood: x right, y up, z forward. Near slabs sweep, far ones barely move.
      // How far it may go before a layer shows its edge is set by camera(over=…) in the scene script.
      const k = E.sineInOut(seg(t, 0, T.end));
      sc.place({ x: 2 * k, y: 0.3 * k, z: 3 * k }, t);
      sun.style.transform = `translateY(${(-0.45 * A.sun.r * E.sineInOut(seg(t, T.end * 0.2, T.end * 0.8))).toFixed(1)}px)`;
      // acting goes on the pictures themselves. The body and the arm are two pictures: whatever moves one must move the other
      // (the same translate on both), then the arm adds its own turn about the shoulder (layer.pivot).
      const on = seg(t, WAVE, WAVE + 300) * (1 - seg(t, WAVE + 1700, WAVE + 2100));
      const hop = `translateY(${(-16 * Math.abs(Math.sin((t - WAVE) / 190)) * on).toFixed(1)}px)`;
      body.img.style.transform = hop;
      arm.img.style.transform = `${hop} rotate(${((-28 + 12 * Math.sin((t - WAVE) / 95)) * on).toFixed(2)}deg)`;
    });
  },
});
// ready = the film's own start AND every picture of the scene (a still taken before the pictures are in is a blank frame)
window.sceneReady = Promise.all([window.sceneReady, sc.ready]).then(() => window.renderAt(0));
