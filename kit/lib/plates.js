// A scene made of layers that Blender rendered once (tools/shot3d.py <film> <scene> layers → img/<scene>/*.webp + layers.js):
// the picture cut into slabs by distance, cloud and characters on their own. Here they are stacked back up and moved by a
// camera: a slab `depth` units away, seen by a camera that went forward z, right x and up y, grows by depth / (depth − z) and
// slides by −F·x / (depth − z) and +F·y / (depth − z) (F = the lens in pixels), so near things sweep past and far things barely move.
// Everything is a pure function of the camera you pass: no clocks in here.
import { el } from './film.js';

/**
 * plates(meta, base, { stand, order })
 *   meta   the default export of img/<scene>/layers.js
 *   base   URL of that folder (new URL('./img/<scene>/', import.meta.url))
 *   stand  { actorId: groundLayerId } — which slab a character stands on (it slides with that slab, or its feet would skate);
 *          by default the ground slab nearest to it in depth
 * Returns { node, layers, byId, anchors, slot(depth, id), place(cam, t), ready, F, W, H }.
 *   node          put it in a shot (film.shot(from, to, scene.node, render))
 *   slot(depth)   an empty layer at that distance, in the right place in the stack: hang your own HTML / SVG in it (a sun, lanterns,
 *                 birds) at frame coordinates and it moves with the camera like everything else at that distance
 *   place(cam, t) cam = { x, y, z } in scene units from where Blender's camera stood; t (ms) drifts the cloud
 *   layer.img     the <img>; an actor's own acting goes on it (it turns about layer.pivot, or its feet: layer.foot)
 */
export function plates(meta, base, opts = {}) {
  const { width: W, height: H, focal: F } = meta;
  const node = el('div', 'pl-scene', '', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden`);
  const grounds = meta.layers.filter((l) => l.kind === 'ground');
  const layers = meta.layers.map((l) => {
    const e = el('div', `pl-layer pl-${l.kind}`, '', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${W / 2}px ${H / 2}px;will-change:transform`);
    const img = new Image(); img.alt = ''; img.decoding = 'sync'; img.draggable = false; img.src = new URL(l.file, base).href;
    const [x, y, w, h] = l.box;
    // max-width / max-height: none — a page that hosts the film may cap pictures at their container's width (a common reset:
    // img { max-width: 100% }), and a layer is drawn wider than the frame on purpose; capped, it is squeezed and nothing lines up
    img.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;max-width:none;max-height:none;display:block`;
    e.append(img); node.append(e);
    let move = l.depth;      // the distance it moves by (a character moves with the ground it stands on)
    if (l.kind === 'actor') {
      const on = opts.stand && opts.stand[l.id] ? meta.layers.find((g) => g.id === opts.stand[l.id]) : grounds.reduce((a, g) => (Math.abs(g.depth - l.depth) < Math.abs(a.depth - l.depth) ? g : a), grounds[0]);
      move = on ? on.depth : l.depth;
      const p = l.pivot || [x + w / 2, y + h];            // a part turns about its pivot; a body about the middle of its feet
      img.style.transformOrigin = `${(p[0] - x).toFixed(1)}px ${(p[1] - y).toFixed(1)}px`;
    }
    return { ...l, el: e, img, move, drift: 0 };
  });
  const byId = Object.fromEntries(layers.map((l) => [l.id, l]));
  for (const l of layers) if (l.kind === 'cloud') l.drift = opts.drift ? (opts.drift[l.id] ?? 0) : Math.min(26, 1500 / l.depth);   // px per second, to the right
  function slot(depth, id = `slot-${depth}`) {
    const e = el('div', 'pl-layer pl-slot', '', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${W / 2}px ${H / 2}px;will-change:transform`);
    const after = layers.find((l) => l.depth < depth);    // the first layer nearer than this: the slot goes behind it
    if (after) { node.insertBefore(e, after.el); layers.splice(layers.indexOf(after), 0, { id, depth, move: depth, el: e, kind: 'slot', drift: 0 }); } else { node.append(e); layers.push({ id, depth, move: depth, el: e, kind: 'slot', drift: 0 }); }
    byId[id] = layers.find((l) => l.el === e);
    return e;
  }
  function place(cam, t = 0) {
    for (const l of layers) {
      const d = Math.max(0.5, l.move - cam.z); const s = l.move / d;
      const tx = -F * cam.x / d + l.drift * (t / 1000) * s; const ty = F * cam.y / d;
      l.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
    }
  }
  /** where a frame point at `depth` shows up on screen under this camera */
  function project(p, cam) {
    const d = Math.max(0.5, p.depth - cam.z); const s = p.depth / d;
    return { x: W / 2 + (p.x - W / 2) * s - F * cam.x / d, y: H / 2 + (p.y - H / 2) * s + F * cam.y / d, s };
  }
  const ready = Promise.all(layers.filter((l) => l.img).map((l) => l.img.decode().catch(() => null)));
  return { node, layers, byId, anchors: meta.anchors || {}, slot, place, project, ready, F, W, H };
}

/** a move between two cameras: lerp of { x, y, z } */
export const camLerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
