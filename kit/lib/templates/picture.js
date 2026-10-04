// Template "picture" · 2D 绘本
// Full-screen flat illustrations, one scene per stretch of the story, with a slow camera drift; the narration sits in a caption
// band near the bottom, other voices speak in a bubble. Good for: a story with places and things you can draw — rooms, streets, objects.
// You draw each scene as one SVG (1080×1920); keep shapes simple: thick outlines, flat fills, one accent colour.
import { E, el, seg, svgBox } from '../film.js';

export function picture() {
  return {
    name: 'picture',
    mount(film, S) { S.board = el('div', 'nv-board nv-full'); S.stage.appendChild(S.board); film.board = S.board; },
  };
}

/**
 * scene(film, from, to, { bg, svg, night }, render)
 * One full-screen illustration between two times. `svg` is the markup (scene coordinates; the frame shows film.W × film.H of them
 * from film.view — 1080 × 1920 from (0, 0) unless the film says otherwise). Returns { node, svg, q, qa }.
 * render(t, s) positions its pieces; the camera drift is applied for you (pass { drift: false } to keep it still).
 */
export function scene(film, from, to, o, render) {
  const node = el('div', `nv-shot pic-scene${o.night ? ' night' : ''}`, '', o.bg ? `background:${o.bg}` : '');
  const cam = el('div', 'pic-cam'); node.appendChild(cam);
  const svg = svgBox(film.W, film.H, o.svg || '', '', film.view[0], film.view[1]); cam.appendChild(svg);
  const s = { node, cam, svg, q: (sel) => svg.querySelector(sel), qa: (sel) => [...svg.querySelectorAll(sel)] };
  const z = o.zoom || [1.0, 1.06]; const dx = o.dx || [0, -18]; const dy = o.dy || [0, 0];
  film.shot(from, to, node, (t) => {
    if (o.drift !== false) {
      const k = E.sineInOut(seg(t, from, to));
      cam.style.transform = `translate(${(dx[0] + (dx[1] - dx[0]) * k).toFixed(2)}px, ${(dy[0] + (dy[1] - dy[0]) * k).toFixed(2)}px) scale(${(z[0] + (z[1] - z[0]) * k).toFixed(4)})`;
    }
    node.style.opacity = String(Math.min(1, seg(t, from, from + 350) + (from === 0 ? 1 : 0)));
    if (render) render(t, s);
  });
  return s;
}
/**
 * show an element with a soft rise. On an SVG element the rise is prepended to its own transform attribute (a group drawn with
 * transform="translate(…)" keeps its place); on an HTML element it goes into style.transform.
 */
export function rise(e, t, at, dy = 30, dur = 420) {
  const k = E.power3Out(seg(t, at, at + dur)); const y = ((1 - k) * dy).toFixed(1);
  e.setAttribute('opacity', String(k));
  if (e instanceof SVGElement) {
    if (!('baseTf' in e.dataset)) e.dataset.baseTf = e.getAttribute('transform') || '';
    e.setAttribute('transform', `translate(0 ${y}) ${e.dataset.baseTf}`.trim());
  } else e.style.transform = `translateY(${y}px)`;
}
/** a gentle up-and-down, for things that breathe or float */
export const bob = (t, period = 2400, amp = 6, phase = 0) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;
