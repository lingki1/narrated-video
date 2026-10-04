# 视频项目

用 HTML / SVG 画画面、逐帧渲染成视频的讲述型短片。每一帧都是时间的纯函数，所以可以任意跳着截图、分段渲染、反复重做。

```
PROFILE.md            这个项目自己的事（给谁看、谁在讲、配色、红线）——先读
video.config.json     这台机器上的路径（从 video.config.example.json 抄）
voices.json           每个声音用哪条参考音频（从 voices.example.json 抄）
render.mjs            渲染器
lib/film.js film.css  内核：时间轴、逐字字幕、别的声音的卡片、夜色、片尾、底部章节进度条（start({ chapters })）、预览和渲染接口
lib/templates/        16 种画面模板（2D 绘本、画板、白板手绘、文字快闪、聊天记录、漫画、手账、知识卡片、
                      数据图表、视觉小说、信纸、假界面、时间轴、思维导图、分屏、播客体）
lib/narration.js      旧片子的入口：等于内核 + board 模板
lib/buddy.js          现成的讲述者角色（可换配色，也可以不用、自己画）
lib/actor.js          让讲述者在每一幕里亲手做事：走、跳、跑、写、搬、拿道具（picture 模板；见技能 references/picture.md）
lib/parts.js          科普片的画法：色板、气泡、手机、文档、模型盒子、角色机器人、人、马和车、梯子，和每帧用的小帮手
lib/motion.js         缓动、预览播放
lib/audio.py beat.py  合成器：配乐和音效都是现算的，没有采样
lib/sfx.py            有名字的音效（脚步、跳、落地、写字、弹出、成功、出错……）；会动的东西自己报声音，sound.py 用它合成
lib3d/inkkit.py       三维水墨库（可选，要 Blender）：一幕写成一个短脚本，命令行渲一次，出按远近切好的分层底图（见技能 references/3d.md）
lib/plates.js         把那些分层在网页里叠起来，按远近做视差；slot(depth) 在某个远近插一层自己的东西
templates/            每种模板一个小样（同一段 22 秒的示例），_common/ 是共用的示例台词和配乐，_3d/ 是三维分层的最小例子
lib/cover.js          封面页：三种画布（16:9 / 4:3 / 3:4）、放角色、画安全区（做法见技能 references/cover.md）
tools/                新建片子、配音、量稿子、自检、预览、封面；三维：shot3d / sheet3d / pack_frames / mist_plate，检查：motion_strip / frame_diff
videos/<名字>/        一条片子的全部都在这一个文件夹里：
                        lines.js（台词）scene.js（画面）sound.py（配乐）vo.py（配音接入）cover.js（封面）
                        vo/       配音，一句一个 wav
                        docs/     稿子、记录、发布包、调研
                        out/      声音、成片、抽帧（stills/）、封面（cover/）、预览包（artifact/）、三维的静帧和原始分层（shots/）、检查图（check/）
                        blender/  三维场景脚本，一幕一个（用了三维才有）；img/<场景>/ 是出好的分层底图
                        archive/  留底的旧版（画面 code-<版本>/、配音 vo-<版本>/）
samples/<模板>/       模板小样，结构同上（tools 会先找 videos/，再找 samples/）
```

## 一条片子从头到尾

```bash
python tools/new_reel.py --list                               # 先挑画面模板（怎么挑见技能的 references/templates.md）
python tools/new_reel.py 01-name "标题" --template picture
# 写 videos/01-name/docs/01-name.md 和 videos/01-name/lines.js，然后量一遍
python tools/tts/script_measure.py videos/01-name/lines.js
# 配音（voices.json 里要有每个声音的参考）
python tools/tts/vo_all.py 01-name
python tools/tts/vo_qa.py videos/01-name/lines.js videos/01-name/vo --model medium
python tools/tts/voice_fx.py 01-name --voice L --preset virtual-mid   # 可选：讲述者是虚拟角色时加一点电音
python videos/01-name/vo.py
# 画面：边写 scene.js 边看关键帧
node render.mjs videos/01-name --times                         # 每句台词的起点
node render.mjs videos/01-name --sweep                         # 不截图走完整条时间轴：页面报错、被拉长的胳膊
node render.mjs videos/01-name --stills 0,5000,20000
python tools/contact_sheet.py videos/01-name/out/sheet.png videos/01-name/out/stills/01-name-*.png
# 声音 + 自检
node render.mjs videos/01-name --sound-only
python tools/retention_scan.py 01-name
# 预览：本机 / 同一个 Wi-Fi 的手机 / 打包给别处看
python -m http.server 8080 --bind 127.0.0.1        # 然后开 http://127.0.0.1:8080/videos/01-name/index.html?play
python tools/lan_preview.py 01-name --host <本机局域网地址>
python tools/artifact_preview.py 01-name
# 成片
node render.mjs videos/01-name --blur 3
# 封面：在 videos/01-name/cover.js 里画（新建片子时带了一个样子），不抽帧
node tools/cover_render.mjs 01-name --safe                      # 每个概念 × 16:9 / 4:3 / 3:4，另出一份画了遮挡区的
node tools/cover_render.mjs 01-name --ratio wide --scale 2      # YouTube 用的 3840×2160
python tools/cover_check.py 01-name                             # 缩到信息流大小、灰度、模糊、叠上信息条；外加并排图
```

需要：Node 18+、`playwright-core`（或 `playwright`）和一个 Chromium、ffmpeg、Python（numpy、scipy、soundfile、pillow）。
三维分层是可选的，另外需要 Blender 5（在 5.2 上跑通；只走命令行）：路径写进 `video.config.json` 的 `"blender"`，或者让 `blender` 在 PATH 里。
配音工具另外需要 Qwen3-TTS（`pip install qwen-tts`，约 5 GB 显存）和 openai-whisper、pypinyin、cn2an。没有显卡也可以用别的 TTS：只要每句出一个 `<id>.wav` 放进 `videos/<名字>/vo/` 就行。

## 三维分层的一幕（可选）

要纵深的大景用它：Blender 只渲一次，镜头和表演仍然在网页里。做法、规矩和检查在技能的 `references/3d.md`；最小的例子在 `templates/_3d/`。

```bash
cp -r templates/_3d/. videos/01-name/                          # blender/peaks.py、blender/flyover.py，并换掉 scene.js
python tools/shot3d.py 01-name peaks still                     # 静帧 → out/shots/peaks.png（先看这个）
python tools/shot3d.py 01-name peaks still sun=0               # 不带「留给网页画的东西」的静帧：分层要和它比
python tools/shot3d.py 01-name peaks layers                    # 分层 → img/peaks/*.webp + layers.js，并报「叠回去和静帧差多少」
node render.mjs videos/01-name --stills 0,9000,20000           # 网页里叠起来、镜头动起来的样子
python tools/motion_strip.py 01-name 7800 10200 step=200 crop=1300,520,420,360 name=wave   # 一段动作切成连续帧放大看
python tools/shot3d.py 01-name flyover fly step=15 samples=32  # 一段飞行，先每 15 帧渲一张
python tools/sheet3d.py 01-name flyover                        # 拼成一张图看路线
python tools/pack_frames.py 01-name flyover                    # 渲全以后：帧 → 图集 + frames.js
python tools/frame_diff.py 01-name <毫秒A> <毫秒B> name=seam    # 接缝两边（飞行落到分层、一幕换一幕）是不是同一幅画
python tools/mist_plate.py 01-name                             # 过场的云雾和纸纹（噪声算的）
```

## 素材（开源物件图形）

画面里的日常物件可以用开源图标集里的现成图形，不必全靠方块圆圈。核过许可页、适合扁平讲解片的来源（2026-10 核对）：

| 来源 | 许可 | 署名 | 用法 |
|---|---|---|---|
| Fluent Emoji 扁平款（Microsoft） | MIT | 不需要 | 三千多个纯色物件，首选 |
| Phosphor | MIT | 不需要 | 线条 / 实心 / 双色图标 |
| Material Symbols | Apache 2.0 | 不需要 | 覆盖最全，兜底 |
| Kenney | CC0 | 不需要 | 界面件、图案、音效包 |
| OpenMoji | CC BY-SA 4.0 | 要，且相同方式共享 | 风格最像，但不当主力 |

装一次（纯数据包，不执行脚本），再按名字取：

```bash
cd vendor/iconify && npm init -y && npm install --ignore-scripts @iconify-json/fluent-emoji-flat @iconify-json/ph
node tools/icons_pull.mjs --find fluent-emoji-flat cake          # 找名字
node tools/icons_pull.mjs <片子> fluent-emoji-flat potted-plant,trophy,birthday-cake   # 写进 videos/<片子>/icons.js（自动换成调色板的颜色）
```

规矩：下载前先向委托人说明来源、大小和许可；带品牌标志的图标集（simple-icons、logos、各家 brands 子集）一律不用——许可再宽，商标权还是别人的；许可信息随 `icons.js` 留档，发片时在简介里提一句来源更稳妥。
