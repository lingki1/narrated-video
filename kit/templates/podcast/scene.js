// 播客体 · the narrator in the middle, the real waveform of the voice, the words lighting up as they are said — nothing else
// __TITLE__ — say in two lines what this film is and who tells it.
// Needs no drawing at all: the template builds everything from lines.js. Use it when the piece is for listening.
import { createFilm } from '../../lib/film.js';
import { buddyCharacter } from '../../lib/buddy.js';
import { podcast } from '../../lib/templates/podcast.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: podcast({ title: '睡前一分钟' }), voices: { S: { tag: '她' } } });
const { vo } = film;

film.start({
  night: () => true,
  character: buddyCharacter({ x: 540, y: 900, size: 1.0, facing: 0, moods: () => [[0, 'curious'], [vo.L02.at, 'thinking'], [vo.S01.at, 'touched'], [vo.L03.at, 'happy']] }),
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
});
