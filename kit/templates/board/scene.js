// 画板讲述 · story clock, a framed board for small drawings, the narrator bottom right, strip subtitles
// __TITLE__ — say in two lines what this film is and who tells it.
// The core (lib/film.js) does the timeline and the words; the template (lib/templates/board.js) does the stage.
// This file only says what is drawn while each line is spoken. Every visual must be a pure function of t.
import { createFilm, el, fade, pop, soft, tf } from '../../lib/film.js';
import { board } from '../../lib/templates/board.js';
import { buddyCharacter } from '../../lib/buddy.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({
  lines: LINES, durations: D, template: board(),
  voices: { S: { tag: '她' } }, // every voice that is not the narrator: its lines are typed on the pinned card
  theme: {}, // e.g. { accent: '#FF7A1A', accentDeep: '#D95B00' } — see DEFAULT_THEME in lib/film.js
});
const { vo, T, wt } = film;
T.day = vo.L03.at - 400; // your own marks go on T: sound.py reads them from the timeline

film.start({
  night: (t) => t < T.day,
  // the story clock: [film time in ms, story time in minutes since midnight]; leave `clock` out if the story has no clock
  clock: {
    keys: () => [[0, 23 * 60 + 5], [vo.L03.at - 500, 23 * 60 + 40], [vo.L03.at, 24 * 60 + 7 * 60], [T.card, 24 * 60 + 7 * 60 + 2]],
    date: (m) => (m < 1440 ? '周二 · 夜里' : '周三 · 早上'),
    chip: (m) => (m < 1440 ? '还没睡' : ''),
  },
  character: buddyCharacter({ moods: () => [[0, 'curious'], [vo.L02.at, 'thinking'], [vo.S01.at, 'touched'], [T.day, 'happy']] }),
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    // shot 1 · her message, then his two characters
    {
      const n = el('div', 'nv-shot night');
      const msg = el('div', 'nv-plate accent', '今天实在是太累了', 'left:60px;top:120px;font-size:84px');
      const mine = el('div', 'nv-plate paper', '我在', 'left:560px;top:380px;font-size:120px');
      n.append(msg, mine);
      const tMsg = wt('L01', '一条消息'); const tMine = wt('L02', '我在');
      film.cue(tMsg, 'msg'); film.cue(tMine, 'msg');
      film.shot(0, T.day, n, (t) => { soft(msg, t, tMsg, 0, 0, -2); soft(mine, t, tMine, 0, 0, 2); });
    }
    // shot 2 · the morning
    {
      const n = el('div', 'nv-shot');
      const zao = el('div', 'nv-t nv-serif', '早', 'left:0;right:0;top:150px;text-align:center;font-size:360px;line-height:1;color:var(--ink)');
      const chip = el('div', 'nv-chip accent', '先跟我说的', 'left:560px;top:560px;font-size:46px');
      n.append(zao, chip);
      const tZao = wt('L03', '一声早');
      film.cue(T.day, 'alarm'); film.cue(tZao, 'bell');
      film.shot(T.day, T.card, n, (t) => { tf(zao, 0, 0, 1, 0, fade(t, tZao, 400)); tf(chip, 0, 0, pop(t, tZao + 500), -3, 1); });
    }
  },
});
