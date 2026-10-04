# narrated-video

一个 Claude 技能（Agent Skill）：从选题到成片，做一条「讲述型」视频。一个声音把一件事讲够，画面跟着讲的内容走。全流程一个人（或一个代理）就能做完，不需要拍摄、素材库和剪辑软件。

A Claude skill for making narrated videos end to end: topic, script, synthetic voice, HTML/SVG pictures rendered frame by frame to MP4, synthesized music, self-checks, cover design. The documentation is in Chinese.

## 它管什么

- **选题和写稿**：一条片子只讲一件事；按块写、为耳朵写；科普怎么讲透；稿子怎么量、怎么找别人审。
- **配音**：用文字描述设计出来的合成声音，一句一个文件；读错怎么查。
- **画面**：每一帧都是时间的纯函数，用 HTML / SVG 画，无头浏览器逐帧截图，ffmpeg 合成。16 种画面模板，竖屏 9:16 和横屏 16:9。
- **配乐和音效**：全部现场合成，没有采样。
- **封面**：单独设计而不是抽帧；三种画布、缩小检查、盲测。
- **预览、渲染、发布**：带声音的预览先给人看，对方说可以了才渲染。

## 安装

把仓库克隆进 Claude 的技能目录：

```bash
git clone https://github.com/lingki1/narrated-video ~/.claude/skills/narrated-video
```

然后对 Claude 说「做一条视频」。它会先读 `SKILL.md`，再用 `scripts/new_project.py` 建一个项目。

## 需要

- Node 18+、`playwright-core`（或 `playwright`）和一个 Chromium、ffmpeg
- Python：numpy、scipy、soundfile、pillow
- 配音：仓库里的工具用 Qwen3-TTS（约 5 GB 显存）和 openai-whisper；换成任何别的 TTS 也行，只要每句出一个 wav

仓库里没有任何声音、模型、图片素材和字体文件。

## 里面有什么

```
SKILL.md        入口：流程、不管什么项目都守的规矩、目录约定
references/     每一步的做法：topic · writing · voice · picture · templates · sound · cover · selfcheck · deliver
kit/            工程模板：渲染器、内核、16 种画面模板、工具（建片子、配音、自检、预览、封面）
scripts/        new_project.py（从 kit 建一个项目）
```

一个项目里，一条片子一个文件夹：`videos/<名字>/` 放它的画面代码，里面 `vo/` 配音、`docs/` 文稿、`out/` 产物。项目自己的事（给谁看、谁在讲、配色、红线）写在项目的 `PROFILE.md` 里，不写进技能。

## 许可

MIT，见 [LICENSE](LICENSE)。
