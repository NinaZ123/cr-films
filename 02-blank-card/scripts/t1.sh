#!/usr/bin/env bash
# 测试1：同一张设定表，三个模型各编辑出背面全身和听歌表情
cd "$(dirname "$0")/.."
SRC=img/ref-f-0.png
STYLE="Keep exactly the same character design, art style, linework and colors as the reference sheet: flat 2D cel-shaded 1980s OVA anime, warm off-white background with subtle halftone."
BACK="$STYLE Draw ONE single full-body view of this same girl seen from directly BEHIND, standing straight, head to toe, on plain warm off-white background. Show the back of the olive MA-1 jacket, the back of the black bob haircut, the cream headphones band over her head, black tights, white chunky sneakers. Only one figure, no other panels, no text."
FACE="$STYLE Draw ONE single close-up portrait (head and shoulders) of this same girl, three-quarter view, eyes half-closed, relaxed, nodding gently to music she hears in her headphones, faint calm contentment, not smiling broadly. Same black asymmetric bob with straight bangs, the orange streak on the same side as the reference, cream headphones with orange stripe, coiled black cord, olive jacket with orange collar lining. Only one figure, no text."
run(){ bin/cr-image "$@" --out test/t1 >> work/logs/t1.log 2>&1; }
run --model gpt-image-2.5-flare --image $SRC --prompt "$BACK" --size 1024x1536 --name flare-back &
run --model gpt-image-2.5-flare --image $SRC --prompt "$FACE" --size 1536x1024 --name flare-face &
run --model gemini-3-pro-image --image $SRC --prompt "$BACK" --aspect-ratio 9:16 --name gemini-back &
run --model gemini-3-pro-image --image $SRC --prompt "$FACE" --aspect-ratio 16:9 --name gemini-face &
run --model nano-banana-beta --image $SRC --prompt "$BACK" --aspect-ratio 9:16 --name nano-back &
run --model nano-banana-beta --image $SRC --prompt "$FACE" --aspect-ratio 16:9 --name nano-face &
wait
