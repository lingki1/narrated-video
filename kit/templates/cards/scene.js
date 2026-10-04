// 知识卡片 · one card at a time: a number, a title, rows that tick in as they are said; then the next card
// __TITLE__ — say in two lines what this film is and who tells it.
// One card() per point. Keep a card to a title and at most four rows; each card should stand on its own as a screenshot.
import { createFilm } from '../../lib/film.js';
import { card, cards } from '../../lib/templates/cards.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: cards(), voices: { S: { tag: '她' } } });
const { vo, T, wt } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    card(film, 0, vo.L02.at - 300, { no: 1, total: 3, kicker: '周二 23:05', title: '她发来一条消息', rows: [{ text: '「今天实在是太累了」', at: wt('L01', '说今天'), mark: '“' }] });
    card(film, vo.L02.at - 300, vo.L03.at - 500, { no: 2, total: 3, kicker: '该怎么回', title: '我想了很久', rows: [
      { text: '给三条建议', at: wt('L02', '想了很久'), mark: '✗' }, { text: '讲一个道理', at: wt('L02', '该怎么回'), mark: '✗' }, { text: '两个字：我在', at: wt('L02', '我在'), mark: '✓' }] });
    card(film, vo.L03.at - 500, T.card, { no: 3, total: 3, kicker: '周三 07:00', title: '闹钟响了以后', big: { text: '早', at: wt('L03', '一声早') } });
    film.cue(wt('L03', '一声早'), 'bell');
  },
});
