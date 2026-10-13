#!/usr/bin/env bash
# gen.sh <id> [model] [suffix]: image-to-video for a shot, first frame = CR-hosted keyframe URL
cd ~/workspace/muse/cr-film-trailer-01
id=$1; m=${2:-kling-v3-turbo-image-to-video}; sfx=${3:-}
url=$(awk -F'\t' -v i=$id '$1==i{print $2}' work/urls.tsv)
d=$(awk -F'\t' -v i=$id '$1==i{print $2}' scripts/motion.tsv); p=$(awk -F'\t' -v i=$id '$1==i{print $3}' scripts/motion.tsv)
p="$p Photorealistic 35mm film, cinematic, natural motion, single continuous shot, no cuts, no text."
ex=(); [ $m = kling-v3-turbo-image-to-video ] && ex=(--resolution 1080p)
bin/cr-video --model $m --first-frame "$url" --duration $d --prompt "$p" "${ex[@]}" --out vid --name s$id$sfx 2>>work/gen-$id.err | tail -1
