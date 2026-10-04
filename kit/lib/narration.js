// Kept for reels written before the templates existed: createFilm() here is the core with the "board" template plugged in.
// New reels import createFilm from './film.js' and pick a template from './templates/'.
import { createFilm as core } from './film.js';
import { board } from './templates/board.js';

export * from './film.js';
export function createFilm(opts) { return core({ ...opts, template: opts.template || board() }); }
