#!/usr/bin/env bash
# kf.sh <id> : generate keyframe for shot id with gemini-3-pro-image
cd ~/workspace/muse/cr-film-trailer-01
id=$1; line=$(awk -F'\t' -v i="$id" '$1==i' scripts/shots.tsv); ref=$(cut -f2 <<<"$line"); desc=$(cut -f3 <<<"$line")
STYLE="Cinematic film still from a 1990s Chinese arthouse mystery film, shot on 35mm Kodak Vision3 500T, anamorphic lens, muted desaturated teal and amber palette, deep shadows, halation around lights, fine film grain, hyper-realistic, dreamlike, wide 2.39:1 framing with all important content in the central horizontal band."
case $ref in
  man) P="Use the man in the reference image as the character: same face, same identity, same age, same scar through the left eyebrow, same charcoal overcoat and dark green sweater. New scene: $desc. $STYLE"; img=(--image img/REF_man.jpg) ;;
  young) P="Use the young man in the reference image as the character: same face, same identity, same age 22, same thick messy black hair, same thin scar through the left eyebrow, same black denim jacket over white t-shirt. New scene: $desc. $STYLE"; img=(--image img/REF_young.jpg) ;;
  *) P="$desc. $STYLE"; img=(--aspect-ratio 16:9) ;;
esac
bin/cr-image --model gemini-3-pro-image --prompt "$P" "${img[@]}" --out kf --name "s$id${2:-}" 2>>work/kf-$id.err | tail -1
