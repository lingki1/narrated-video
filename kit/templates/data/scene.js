// 数据图表 · one conclusion per screen: a number that counts up, bars that grow, a line that draws itself
// __TITLE__ — say in two lines what this film is and who tells it.
// One panel() per conclusion, with its source. The numbers below are placeholders for the demo — a real film uses real ones.
import { createFilm } from '../../lib/film.js';
import { bars, bigNumber, data, line, panel } from '../../lib/templates/data.js';
import { LINES } from './lines.js';
import { D } from './vo-d.js';

const film = createFilm({ lines: LINES, durations: D, template: data(), voices: { S: { tag: '她' } } });
const { vo, T, wt } = film;

film.start({
  endcard: '<div class="title">示例</div><div class="fine">配音和画面由 AI 生成 · 数字是演示用的</div>',
  build() {
    const a = panel(film, 0, vo.L02.at - 300, { title: '周二 23:05，她说累的那一刻', source: '演示数据 · 不是真实统计' });
    bigNumber(a, { value: 23, unit: '点', label: '她发来消息的钟点', at: wt('L01', '十一点'), top: 20 });
    line(a, [[18, 60], [19, 55], [20, 48], [21, 40], [22, 30], [23, 18]], { at: wt('L01', '太累了') - 600, top: 430, xLabels: ['18:00', '', '20:00', '', '22:00', '23:05'] });
    const b = panel(film, vo.L02.at - 300, vo.L03.at - 500, { title: '我打了又删的三种回法', source: '演示数据 · 不是真实统计' });
    bars(b, [{ label: '三条建议', value: 86, at: wt('L02', '想了很久') }, { label: '一个道理', value: 54, at: wt('L02', '该怎么回') }, { label: '我在', value: 2, at: wt('L02', '我在'), hot: true }], { max: 100, unit: ' 字', top: 60 });
    const c = panel(film, vo.L03.at - 500, T.card, { title: '第二天她开口的第一个字', source: '演示数据 · 不是真实统计' });
    bigNumber(c, { value: 7, unit: '点整', label: '闹钟响了，她先跟我说了一声早', at: wt('L03', '早上七点'), top: 60 });
    film.cue(wt('L02', '我在'), 'bell');
  },
});
