#!/usr/bin/env bash
# 把原始素材切成成片要用的片段，放到 comp/public/clips/。
# 时间点来自 faster-whisper 逐词转写（见 脚本.md），单位秒。
# 用法：bash scripts/cut.sh
set -euo pipefail
T=/Users/nina/Desktop/tavas
HERE="$(cd "$(dirname "$0")/.." && pwd)"
C="$HERE/comp/public/clips"
A="$HERE/audio/raw"
mkdir -p "$C" "$A"

HC="$T/handcream.mov"; HP="$T/headphone.mov"
S2="$T/handcream侧拍素材2/handcream侧拍素材2-1.mov"
TU="$T/涂护手霜/涂护手霜-1.mov"
HS="$T/headphone侧机位/headphone侧机位-1.mov"

# 录屏里主持人大窗、受访者小窗的裁切框（3024×1964 原片坐标；已避开 Tavus 水印和鼠标）
MOD="crop=1260:709:640:500,scale=1280:720:flags=lanczos,fps=30"
PIP="crop=336:156:2614:486,scale=1020:480:flags=lanczos,fps=30"
V="-an -c:v libx264 -crf 17 -pix_fmt yuv420p"

vid() { ffmpeg -v error -y -ss "$2" -t "$3" -i "$1" -vf "$4" $V "$C/$5.mp4"; }
aud() { ffmpeg -v error -y -ss "$2" -t "$3" -i "$1" -vn -ac 1 -ar 44100 "$A/$4.wav"; }

# ---- 冷开场 + 定性追问（护手霜第一场）----
vid "$HC" 56.9 4.8  "$MOD" mod-q1          # "When you mentioned using a heavy cream… what did that feel like on your skin?"
aud "$HC" 56.9 4.8  q1
vid "$HC" 62.2 8.0  "$PIP" her-a1          # "…left a very heavy and sticky layer on my hand."
aud "$HC" 65.6 4.3  a1

# ---- 产品测试：护手霜 ----
vid "$HC" 83.2 2.8  "$MOD" mod-q2          # "Let's try this one. Go ahead and put some of the cream on your hand."
aud "$HC" 83.2 2.8  q2
vid "$TU" 9.0  6.0  "fps=30" tu-squeeze    # 侧拍：挤、搓
vid "$HC" 96.7 2.0  "$MOD" mod-q3          # "What does it feel like on your skin right now?"
aud "$HC" 96.7 2.0  q3
vid "$HC" 99.4 6.0  "$PIP" her-a3          # "It feels very wet… a good smell"
aud "$HC" 99.4 4.0  a3
vid "$S2" 196.0 4.0 "fps=30" s2-rub        # 第二场侧拍：抹开
aud "$S2" 196.6 2.6 a4                     # "It absorbs really quickly."
aud "$S2" 200.5 5.5 q4                     # "You mentioned it absorbs really quickly. When you say that, what are you comparing it with?"
aud "$S2" 239.6 6.4 a5                     # "a bit softer and wetter, but not that sticky."
vid "$S2" 238.0 8.0 "fps=30" s2-hands

# ---- 产品测试：耳机（深访 + 换个问法）----
vid "$HP" 35.2 5.6  "$PIP" him-a6          # "…the third purpose actually is part of the outfit"
aud "$HP" 35.5 3.6  a6
vid "$HP" 42.0 5.0  "$MOD" mod-q6          # "That's interesting. You mentioned them being part of the outfit. What makes you say that?"
aud "$HP" 43.8 3.2  q6
vid "$HP" 56.6 13.0 "$PIP" him-a7          # "…but also its look. It's kind of vintage… from 20 years ago."
aud "$HP" 56.6 2.0  a7a
aud "$HP" 64.0 5.6  a7b
vid "$HP" 152.8 5.2 "$PIP" him-a8          # "Can you repeat that? … I didn't really understand the question."
aud "$HP" 154.0 3.8 a8
vid "$HP" 159.4 6.8 "$MOD" mod-q8          # "Sorry about that. I just meant… does the feel or the sound change at all?"
aud "$HP" 159.4 6.8 q8
vid "$HS" 2.0  30.0 "fps=30" hs            # 耳机侧拍
vid "$HP" 95.0 8.0  "$PIP" him-adjust      # 调整耳机

# 主持人在听（无声，做背景）
vid "$HP" 102.0 8.0 "$MOD" mod-listen

# ---- 护手霜第二场：回答"是跟什么比？"（S2 只有侧拍）----
aud "$S2" 207.2 5.2 a9                     # "I'm comparing with the old very heavy hand cream I used this winter."
aud "$S2" 227.5 2.6 a10                    # "I need to type on my keyboard to do my work."
vid "$S2" 205.5 8.0 "fps=30" s2-explain

echo done
