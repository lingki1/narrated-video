// 聊天记录 · the story happens in a message thread; the narrator comments in a caption underneath
// __TITLE__ — say in two lines what this film is and who tells it.
// film.msg(side, text, at, typingMs) and film.stamp(text, at). Lines spoken by other voices should also arrive as messages.
import { createFilm } from '../../lib/film.js';
import { chat } from '../../lib/templates/chat.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: chat({ name: '她', avatar: '她', me: '我' }), voices: { S: { tag: '她' } } });
const { vo, wt } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 故事是编的</div>',
  build() {
    film.stamp('周二 23:05', 200);
    film.msg('them', '今天实在是太累了', wt('L01', '一条消息'), 0);
    film.msg('me', '我在', wt('L02', '我在'), wt('L02', '我在') - vo.L02.at - 300); // "typing…" for as long as he thinks
    film.msg('them', '那就好。', vo.S01.at + 100, 700);
    film.stamp('周三 07:00', vo.L03.at + 200);
    film.msg('them', '早', wt('L03', '一声早'), 900);
    film.msg('me', '早。闹钟我听见了', film.endOf('L03') + 300, 700);
  },
});
