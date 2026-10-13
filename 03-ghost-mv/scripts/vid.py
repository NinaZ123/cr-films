"""视频：静帧 URL 当首帧，用 kling-v3-turbo 1080p 生成。动作克制，靠剪辑踩拍。

用法：python scripts/vid.py [镜头号 ...]      不给就跑全部
      python scripts/vid.py --suffix v2 g03   重做时换名字
URL 读自 work/img-urls-v2.txt（第二版静帧，照 XD 原图重做的头套）。输出 vid/<镜头>[-<suffix>].mp4 和 json。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = dict(l.split() for l in (ROOT / "work/img-urls-v2.txt").read_text().splitlines() if l.strip())

STYLE = ("Black-and-white overexposed film look, only the green mask is coloured, film grain. "
         "Restrained subtle motion. The mask is a rigid paper object fixed on the head: its shape, size and headphones "
         "never change, and the mask face always points the same way as the body — the person never turns around. The mask always covers the chin: below its zigzag edge only dark shadow and the hoodie collar, no skin. No text.")

# 镜头：(时长, 动作提示词)
SHOTS = {
 "g01": (4, "Locked-off static camera. The masked head nods slowly to a beat, very slight, the paper texture catches the light."),
 "g02": (5, "Locked-off static wide camera. The figure stands facing the camera, then gently starts bobbing the head to music; nothing else moves."),
 "g03": (5, "Locked-off static camera. The six people without headphones stand perfectly still like statues; only the one in the centre with headphones sways his head side to side and bounces his shoulders to music."),
 "g04": (4, "Locked-off static camera. The masked person at the desk taps one finger on the punch card in rhythm and nods; the other desks stay empty."),
 "g05": (4, "Locked-off static camera. The masked person keeps walking down the stairs toward the camera in a relaxed rhythmic step."),
 "g06": (3, "Static close-up. The hand presses the headphone tighter against the mask, the head tilts further into the music."),
 "g07": (5, "Static camera, slight low angle. The masked person sings into the boom microphone, head and shoulders moving with the rhythm, one hand on the mic stem."),
 # 60 秒版
 "n01": (4, "Static close-up. The hand pushes the punch card fully into the clock slot, the machine stamps it with a sharp jolt, the hand pulls the card back out."),
 "n02": (5, "Locked-off static wide camera. The masked person runs two steps, jumps high with arms flung up, lands softly and keeps bouncing to the music."),
 "n03": (5, "Very slow push-in toward the blank card held up in both hands; the masked head tilts slightly with the music. The card stays blank."),
 "n04": (8, "Locked-off static wide camera. The masked person sits cross-legged, nodding gently to the music, warm morning light slowly brightens across the white floor. Very calm."),
 "n05": (5, "Locked-off static high-angle camera. All the masked people at the desks stamp their cards in perfect unison, heads bowed; only the one with headphones in the centre leans back and sways his head to music."),
 "n06": (5, "Locked-off static camera. The column of masked people marches toward the camera in perfect lockstep, mechanical, identical steps."),
 "n07": (5, "Locked-off static wide camera. The six people without headphones stand rigidly still like statues; the one in the centre with headphones dances freely and joyfully, arms and knees moving to the beat."),
 "n08": (5, "Slow camera pull-back. The masked person with headphones walks toward the camera with a relaxed swagger, leaving the still line of masked people behind him."),
}


def run(name, suffix):
    dur, prompt = SHOTS[name]
    out = f"{name}-{suffix}" if suffix else name
    cmd = [str(ROOT / "bin/cr-video"), "--model", "kling-v3-turbo-image-to-video", "--first-frame", URL[name],
           "--prompt", f"{prompt} {STYLE}", "--duration", str(dur), "--resolution", "1080p",
           "--out", str(ROOT / "vid"), "--name", out, "--timeout", "1800"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return name, info.get("status"), info.get("waited_s"), info.get("duration_s"), info.get("error")


if __name__ == "__main__":
    args = sys.argv[1:]
    suffix = ""
    if args[:1] == ["--suffix"]:
        suffix, args = args[1], args[2:]
    names = args or list(SHOTS)
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(lambda n: run(n, suffix), names):
            print(*res, flush=True)
