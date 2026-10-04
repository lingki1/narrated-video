# 画面模板：先按内容挑，再按稿子画

同一份稿子可以有很多种画面。工程里有 16 种现成的画面模板，每种都有一个能直接跑的小样（同一段 22 秒的小故事）。
**一条片子用一种模板**：统一的画面语言比花样重要；变化来自同一模板里一幕一幕的画。

```bash
python tools/new_reel.py --list                                   # 列出全部模板
python tools/new_reel.py 03-name "标题" --template picture         # 用某个模板起一条新片子（默认 board）
```

新片子的 `scene.js` 就是那个模板的小样：先跑一遍（`node render.mjs videos/<名字> --stills 6000,12000`）看清它长什么样，再换成自己的台词和画。

## 怎么挑

先问「这段话讲的是什么样的东西」，不是「哪种好看」。

| 内容是…… | 选 | 为什么 |
|---|---|---|
| 有场景、有人、有气氛的故事（房间、街道、物件） | **picture 2D 绘本** | 最像动画短片；讲述者可以画进画里 |
| 第一人称的生活小事，时间在走 | **board 画板讲述** | 故事钟 + 小画板，讲述者站在旁边；画得最少的「故事」模板 |
| 事情发生在聊天里（关系、误会、「她回了什么」） | **chat 聊天记录** | 消息本身就是剧情 |
| 事情发生在手机 / 电脑上（搜、写、删、等） | **screen 假界面** | 打了又删、通知弹下来，最有「活人感」 |
| 两个角色对戏、恋爱向 | **vn 视觉小说** | 所有人的话都在对话框里，人物立在背景前 |
| 有动作、有包袱的段子 | **comic 漫画分镜** | 一格一格出，拟声字负责节奏 |
| 回忆、清单、生活记录 | **notes 手账拼贴** | 一张张贴上桌，适合「攒起来」的内容 |
| 走心的话、写给某个人 | **letter 信纸手写** | 几乎没有别的东西，让字一个个写出来 |
| 拆一个概念、轻松科普 | **doodle 白板手绘** | 线条自己画出来，火柴人演示 |
| 步骤、方法、「三个建议」 | **cards 知识卡片** | 编号 + 逐条打勾，收藏向 |
| 一件事分几种情况 / 几个原因 | **mindmap 思维导图** | 关系比顺序重要时用（最多四个分支） |
| 以为的 vs 实际的，之前 vs 之后 | **split 分屏对比** | 反差一眼看清 |
| 来龙去脉、一天、一段经历 | **timeline 时间轴** | 顺序本身就是信息 |
| 有数字撑腰的观点 | **data 数据图表** | 一屏一个结论；**数字必须真实，示例必须标明** |
| 观点、金句、节奏快的吐槽 | **kinetic 文字快闪** | 字就是画面，最快能出片 |
| 以听为主（故事电台、睡前） | **podcast 播客体** | 声波 + 正在说的字；最省事的保底 |

拿不准就用 **picture**（故事）或 **doodle**（讲道理）；只剩半天时间就用 **kinetic** 或 **podcast**。

## 要画多少

| 不用画（全由台词和几行配置生成） | 画一点（几个小图） | 要画很多（每一幕一整张图） |
|---|---|---|
| kinetic · podcast · letter · chat · screen · cards · mindmap · split · timeline · data | board · doodle · comic · vn · notes | picture |

「要画很多」的意思是：3 分钟的片子大约 15–20 幕，每幕一张 1080×1920 的 SVG。值得——画面跟着故事走，观众记得住。

## 每种模板怎么用

所有模板共用一个内核（`lib/film.js`，见 `picture.md`）：时间轴、`wt()`、`film.shot()`、`film.cue()`、夜色、片尾、预览接口都一样。模板只决定舞台长什么样、字幕放哪、别的声音怎么出现，再给几个画东西的帮手。

| 模板 | 起手 | 帮手 | 字幕 / 别的声音 |
|---|---|---|---|
| board | `board()`；`start({ clock: { keys, date, chip } })` 给故事钟 | 内核的 `soft / pop / slam / tf`、`nv-plate` 等零件 | 字幕条 / 顶部卡片 |
| picture | `picture()` | `scene(film, from, to, { bg, svg, night, zoom, dx, dy, drift }, render)` 一幕一张整屏 SVG；`rise(el, t, at)`；`bob(t)` | 下方圆角字幕 / 顶部气泡卡片 |
| doodle | `doodle()` | `page(film, from, to, markup, render)`；`sketch(group, t, at)` 线条自己画出来；`write(text, t, at)`；`stick(x, y, pose)` 火柴人；`PEN` 笔触属性 | 手写字幕 / 卡片 |
| kinetic | `kinetic({ emphasize: ['词'], perRow })` | 不用写 `build()`：每个小句自动满屏 | 无（字就是画面） |
| chat | `chat({ name, avatar, me })` | `film.msg(side, text, at, typing)`、`film.stamp(text, at)` | 字幕条 / 别的声音就是消息 |
| comic | `comic()` | `sheet(film, from, to)` → `panel({x,y,w,h,at,svg,bg,tilt})`、`balloon(text,x,y,at)`、`sfx(text,x,y,at)`、`box(text,x,y,at)`；`halftone()` | 方框旁白 / 气泡 |
| notes | `notes()` | `desk(film, from, to)` → `note(text, x, y, at)`、`photo(svg, x, y, at)`、`scrap(text, x, y, at)`、`put(el, at, rot)`、`each(fn)`；`strike(note, t, at)` | 标签条 / 卡片 |
| cards | `cards()` | `card(film, from, to, { no, total, kicker, title, rows: [{ text, at, mark: '✓' / '✗' }], big: { text, at } })` | 字幕条 / 卡片 |
| data | `data()` | `panel(film, from, to, { title, source })` → `bigNumber / bars / line` | 字幕条 / 卡片；`source` 写出处或「演示数据」 |
| vn | `vn({ names: { L: '我', S: '她' } })` | 背景和立绘自己画（`film.shot` 或角色层）；对话框自动打字 | 所有声音都在对话框里 |
| letter | `letter({ date, perRow, underline: ['词'] })` | 不用写 `build()`：旁白自动一字一字写在信纸上，写满往上翻 | 全写在信纸上 |
| screen | `screen({ clock })` | `ui(film, from, to)` → `win({...})`、`typeLine(body, text, { at, erase })`、`toast({...})`、`todo(body, items)` | 字幕条 / 通知和打字 |
| timeline | `timeline()` | `film.stops([{ time, title, text, at, big }])` | 字幕条 / 卡片 |
| mindmap | `mindmap()` | `map(film, from, to, { center, at, branches: [{ text, at, leaves: [{ text, at }] }] })` 最多四个分支、每支三片叶子 | 字幕条 / 卡片 |
| split | `split({ top, bottom })` | `place(film.top / film.bottom, html, style)`、`appear(el, t, at)`、`film.focus([[t, 'top' / 'bottom' / 'both']])`；内核的 `film.every(fn)` 每帧调用 | 字幕条 / 别的声音放进某一半 |
| podcast | `podcast({ title })` | 不用写 `build()`；可以配一个角色（`buddyCharacter`） | 正在说的字亮起 |

具体写法看 `templates/<名字>/scene.js`：每个小样都把这个模板的帮手用了一遍。

picture 模板做长的科普片时，再加两个库：`lib/actor.js`（讲述者在每一幕里亲手做事）和 `lib/parts.js`（画法）。做法和规矩在 `picture.md` 的「讲述者亲手做事」。

## 模板自己的规矩

- **picture**：一幕一个地方，说到才出现的东西用 `rise()` 挂在词上。讲述者是物件就把它画进每一幕（不是站在角落），它的嘴（盖子、灯）照样跟 `film.talk(t)` 动。人物画成简单的侧影：圆头、头发一块、外套一块、一只闭着的眼；表情靠姿势。手写标签（`Ma Shan Zheng`）只写画里看不出来的那一点信息，一幕最多两个。顶上 y 200–320 的左边常有页眉（时间），画里的字别放那里。
- **board**：画板里一个镜头只放这句话正在说的一两样东西。
- **chat / screen**：界面是虚构的，不模仿真实 App 的样子（除非那是你自己的产品）。
- **data**：数字要有出处；编的数字（演示）在 `source` 里写「演示数据」。
- **kinetic**：只适合短句多的稿子；长句会被切成很多屏，节奏会碎。
- **mindmap**：超过四个分支就分成两张图。

## 自己写一个新模板

模板是一个对象：

```js
export function myTemplate(opts) {
  return {
    name: 'mine',                 // 舞台会加上 class="tpl-mine"，样式写在 lib/templates/mine.css
    subtitles: 'strips',          // 'strips'（内核的逐字字幕）| 'none'（模板自己显示台词）
    others: 'card',               // 'card'（别的声音打在卡片里）| 'none'（模板自己处理）
    labels: (film) => '…',        // 屏幕上会出现、但不在台词里的字（字体按字加载，要提前报上）
    mount(film, S) {},            // 搭舞台；必须留下 film.board（镜头放这里），可以给 film.layer（角色的 SVG 层）
    built(film, S) {},            // build() 之后：此时 wt() 可用
    frame(t, ctx, film, S) {},    // 每帧，在镜头之前
    afterCard(t, ctx, film, S) {},// 每帧，在卡片之后、角色之前
  };
}
```

再写 `kit/templates/mine/scene.js`（一个小样）、把名字加进 `scripts/gen_template_index.py` 和 `kit/tools/new_reel.py` 的列表，跑一次 `gen_template_index.py`。

## 踩过的坑

- **不要用 `scale(0)` 来藏东西。** Chromium 第一次排 SVG 里的字时如果它被缩到几乎为 0，之后放大也不会重排，字就永远看不见了（漫画格子里的字踩过）。藏起来用 `display: none`（`show(el, false)`）；内核的 `tf()` 已经这样做，并且不让可见的东西小于 0.2。
- **SVG 元素上 `style.transform` 会盖掉 `transform` 属性**（带 `transform="translate(…)"` 的组会跑到左上角）。picture 的 `rise()` 已经改成把位移拼在原来的 transform 属性前面；自己写动画时也这样做：改属性，别改 `style.transform`。
- 内核在字体加载完之前不显示舞台（同一个 Chromium 问题），所以别在 `build()` 里量尺寸；要量就在第一帧里量（chat、timeline 就是这样）。
- 交叉淡入：picture 的下一幕在上一幕之上淡入，所以让每一幕多留 300–400 毫秒（`to + 380`），中间不会闪底色。
