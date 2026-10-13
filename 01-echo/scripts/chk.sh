#!/usr/bin/env bash
# chk.sh <out.jpg> <video>... : 3 frames (start/mid/end) per video, one row each
out=$1; shift; args=(); fl=""; n=0
for v in "$@"; do d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
  for t in 0.05 $(echo "$d/2"|bc -l) $(echo "$d-0.2"|bc -l); do args+=(-ss $t -i "$v"); fl+="[$n]scale=480:204,setsar=1[v$n];"; n=$((n+1)); done; done
rows=$((n/3)); st=""; vs=""
for r in $(seq 0 $((rows-1))); do st+="[v$((r*3))][v$((r*3+1))][v$((r*3+2))]hstack=3[r$r];"; vs+="[r$r]"; done
if [ $rows -gt 1 ]; then f="$fl$st${vs}vstack=$rows"; else f="$fl${st%\[r0\];}"; fi
ffmpeg -v error -y "${args[@]}" -filter_complex "$f" -frames:v 1 "$out"
