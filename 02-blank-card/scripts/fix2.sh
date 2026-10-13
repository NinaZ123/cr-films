#!/usr/bin/env bash
# 白空间、屋顶改成和大厅一致的平涂赛璐珞画风
cd "$(dirname "$0")/.."
K=assets/locked; O=assets/fix; L=work/logs/fix2.log
ST="Redraw image 1 in exactly the art style of image 2: flat 2D cel-shaded 1980s OVA anime background art, flat color areas, hard-edged cel shadows, clean ink outlines, visible halftone dots and film grain, limited palette. Not painterly, not photorealistic, no soft airbrush gradients. Keep the composition, location and lighting of image 1 exactly. No people, no text."
img(){ bin/cr-image --model gpt-image-2.5-flare --size 1536x1024 --out $O --name $1 --timeout 900 --image $K/$1.png --image $K/hall-2-aisle.png --prompt "$ST $2" >> $L 2>&1; }
img white-1-door "A vast empty white space, a tall door made of floating glowing particles drawn as flat dots." &
img white-2-side "A vast empty white space, the particle door on the right seen from the side, drawn as flat dots." &
img roof-1-sunrise "Rooftop edge above a sea of clouds at sunrise, clouds drawn as flat cel shapes." &
img roof-2-wide "Long flat rooftop above the clouds toward the rising sun, clouds drawn as flat cel shapes." &
wait
