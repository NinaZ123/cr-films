# cr-films

用 CR 模型做的视频作品和相关调研，都放在这里。每件事一个子目录，新的视频任务也在这里新开子目录。

| 目录 | 内容 | 状态 |
|---|---|---|
| `01-echo/` | 《回响》ECHO：成片 `final/echo_trailer.mp4`，说明 `final/说明.md`，模型实测总结 `final/模型实测总结.md` | 做完了。`work/` 下 2.8G 中间文件，XD 说回头再删 |
| `02-blank-card/` | 《空白卡》BLANK CARD 动画预告：成片 `final/blank_card_trailer.mp4`，说明 `final/说明.md` | 做完了，XD 看过（"太抽象，没有对话"），方向转到 03 |
| `03-ghost-mv/` | 绿幽灵 MV《BLANK CARD》：成片 `final/blank-card-mv-60s-v2.mp4`，说明 `final/说明.md`，成本 `final/成本.md`，交接 `构思.md` | 60 秒 v2，XD："蛮好，比想象中的要好" |
| `05-consumer-insight-demo/` | 消费者洞察功能演示：本地录屏按功能剪开，加标题和说明条，无配乐。成片 `final/consumer-insight-demo.mp4`，说明 `说明.md` | 公司内部演示用，约 3 分钟 |
| `06-gea-community-talk/` | GEA 社区分享（11-05）讲解课：录屏 + ElevenLabs 配音 + 字幕。中文配音 `final/gea-community-talk.mp4`（约 15 分钟），英文配音中文字幕 `final/gea-community-talk-en.mp4`（约 12 分钟），说明 `说明.md` | 做完了。讲解词和素材只在本机 |
| `07-population-prediction/` | 人群分布预测模型训练实验讲解：英文男声配音、中英字幕、报告表格放大。成片 `final/population-prediction.mp4`（约 4.5 分钟），封面 `final/cover.png`，说明 `说明.md` | 做完了。讲解词和素材只在本机 |
| `characters/` | 角色定妆照，各部片共用。脚本 `sheet.py`：flare 照 XD 原图一次出整张，再按格子拆。每个角色一个子目录：原图 `ref/`，总览 `sheet.jpg`，格子 `cells/`，说明 `说明.md` | |
| `characters/alv/` | 阿绿（03 主角） | 2026-10-15 定稿 |
| `characters/xd/` | XD 本人：把自己的像素 avatar 做成纸板像素头套 | 2026-10-16 定稿 |
| `research/` | Higgsfield、LibTV 视频工作流调研：`报告.md`，官方页面原文 `证据/` | 做完了 |

2026-10-13 从 `muse/cr-film-trailer-01`、`muse/cr-film-02`、`muse/cr-video-workflow-research` 搬过来。`01-echo/scripts/` 里的 `kf.sh`、`gen.sh` 写死了旧路径，片子已经做完不再跑，没改。`02-blank-card/.venv` 链接到 `01-echo/.venv`。

## git
- 这个目录是一个 git 仓库，只管文字和代码：脚本、Remotion 工程、方案和说明、生成记录（每个任务的 `*.json`，里面有提示词、参数、任务 id 和用量）。
- 生成出来的图、视频、音频和 `work/` 中间文件都不进 git，见 `.gitignore`。它们合计约 9G，只在本机。丢了可以用脚本加 json 重新生成，但每次生成结果不会一模一样。
- **这个仓库是公开的。** 照内部会议写的东西（讲解词、逐字稿、会议录屏）不进 git，只在本机，见 `.gitignore` 里 06、07 那几行。以后同类片子也这样处理。
- ElevenLabs 的 key 实际放在 `.env.local`（05 之后的 `tts.py` 都从这里读）。
- key 都放在仓库根目录的 `.env`（已 gitignore，模板是 `.env.example`）：`CR_API_KEY`、`ELEVENLABS_API_KEY`。`bin/cr-image`、`bin/cr-video` 先读它，没有再读 `~/.config/cr/env`。以后新加的 key 也只放这里。
