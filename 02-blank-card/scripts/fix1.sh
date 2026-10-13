#!/usr/bin/env bash
# 统一细节：耳机线改短卷线、耳机头梁统一米白，重出受影响的图
cd "$(dirname "$0")/.."
K=assets/locked; O=assets/fix; L=work/logs/fix1.log; mkdir -p $O
img(){ local n=$1 sz=$2; shift 2; bin/cr-image --model gpt-image-2.5-flare --size $sz --out $O --name $n --timeout 900 "$@" >> $L 2>&1; }
CORD="The headphone cord is a SHORT black coiled cord, about the length of a hand, running from her left ear cup down and tucking into her jacket collar. Remove any long cord or braid hanging down her chest or to her waist."
BAND="The headphone band is cream white all over, the same cream as the ear cups, with no black padding on top."
img seven-sheet $( echo 1536x1024 ) --image $K/seven-sheet.png --prompt "Edit this character sheet. Keep everything exactly the same (layout, girl, face, outfit, colors, style), only fix: $CORD Apply to all three panels." &
img seven-a1-front 1024x1536 --image $K/seven-a1-front.png --prompt "Edit this image. Keep everything exactly the same, only fix: $CORD" &
img prop-headphones 1536x1024 --image $K/prop-headphones.png --image $K/seven-a5-calm.png --prompt "Edit image 1 so the headphones match exactly the ones the girl wears in image 2. $BAND Keep the same angle, cream ear cups with orange stripe, short black coiled cord, plain warm off-white background, same flat anime style, no text." &
wait
H=$O/prop-headphones-0.png
img enf-b1-visor 1536x1024 --image $K/enf-b1-visor.png --image $H --prompt "Edit image 1. Keep the android, pose, visor and orange waveform exactly the same. Only change the headphones to match image 2 exactly: $BAND" &
img enf-b2-side 1024x1536 --image $K/enf-b2-side.png --image $H --prompt "Edit image 1. Keep the android, pose and everything else exactly the same. Only change the headphones to match image 2 exactly: $BAND" &
img enf-b3-back 1024x1536 --image $K/enf-b3-back.png --image $H --prompt "Edit image 1. Keep the android seen from behind, pose and everything else exactly the same. Only change the headphones to match image 2 exactly: $BAND" &
img pair-height 1536x1024 --image $K/pair-height.png --prompt "Edit this image. Keep everything exactly the same, only make the android's black visor completely plain glossy black, with no waveform, no line, no light at all." &
wait
