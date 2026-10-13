"""全片换 minimax-h3-image-to-video。
首帧走 S3 URL（work/img-urls-mm.txt）。2026-10-13 用本地图 g01-v3-169.png 当首帧、传 6 或 8 秒，提交时都报 400 invalid_parameter；
换 URL 后能提交。但别的会话用本地图、4/5/6 秒都成功过，原因没查清，见 构思.md「模型实测」。

动作照 XD 的反馈改写："太傻、像不会跳舞的人" → 不演舞蹈，写真人听歌时的小动作，卡 110 BPM。
用法：python scripts/vid_mm.py [镜头 ...]      输出 vid/mm/<镜头>.mp4
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = dict(l.split() for l in (ROOT / "work/img-urls-mm.txt").read_text().splitlines() if l.strip())

STYLE = ("Black-and-white overexposed film look, only the green masks are coloured, film grain. Natural, relaxed, "
         "believable human body language, like a real person filmed on camera; subtle and cool, never exaggerated, "
         "no dance poses. Every mask is a rigid paper object fixed on the head and never changes shape; the mask face "
         "always points the same way as the body. No text.")

# 镜头：(首帧, 时长, 动作)
SHOTS = {
 "n01": ("n01-v3", 8, "Static close-up. The hand slides the punch card into the clock slot, the machine stamps it with a sharp mechanical jolt exactly on the beat, the hand pulls it back out. Precise, everyday."),
 "n06": ("n06-c2", 8, "Locked-off static camera. The column of masked people walks toward the camera in perfect lockstep, identical steps on every beat at 110 BPM, arms swinging in sync, mechanical."),
 "n05": ("n05-c2", 8, "Locked-off static high-angle camera. All the masked people at the desks stamp their cards in perfect unison on the beat, heads bowed; only the one with headphones in the centre leans back and nods his head to his own music."),
 "g02": ("g02-v2", 8, "Locked-off static wide camera. The masked person stands still in the empty hall, then starts nodding his head very slightly on the beat, the only movement in the frame."),
 "g03": ("g03-c2", 8, "Locked-off static camera. The four people without headphones stand perfectly still like statues; the one in the centre with headphones nods his head on the beat and sways his shoulders a little, relaxed."),
 "g04": ("g04-v2", 8, "Locked-off static camera. The masked person at the desk taps one finger on the punch card on the beat and nods slightly, the empty desks around him stay still."),
 "g05": ("g05-v2", 8, "Locked-off static camera. The masked person walks down the stairs toward the camera with an easy rhythmic stride, a small head bob on each step."),
 "g01": ("g01-v3", 8, "Locked-off static close-up. The masked head is still, then begins to nod slowly on the beat, the paper texture catching the light."),
 "g06": ("g06-v3", 8, "Static close-up. The hand presses the headphone tighter against the mask and the head tilts into the music, slow and natural, like turning up a favourite song."),
 "n07": ("n07-c2", 8, "Locked-off static wide camera. The four people without headphones stay perfectly still; the one in the centre with headphones grooves naturally — knee bounce on every beat, head nod, shoulders rolling, cool and relaxed like someone enjoying a song, not a performance."),
 "n02": ("n02-c2", 8, "Slight low angle, static. The masked person holds the headphones to his head with both hands and rocks his head and shoulders to the beat, lost in the music, natural candid motion."),
 "n08": ("n08-c2", 8, "Slow camera pull-back. The masked person with headphones walks toward the camera with an easy, confident stride on the beat, a small head bob with each step, hands in his hoodie pocket; the masked people behind him stay still."),
 "g07": ("g07-v3", 8, "Static camera, slight low angle. The masked person sings into the boom microphone, nodding naturally on every beat, shoulders loose and rolling slightly with the groove, one hand on the mic stem."),
 "n03": ("n03", 8, "Very slow push-in toward the blank card held up in both hands at chest height; the masked head tilts slightly with the music. The card stays completely blank."),
 "n04": ("n04", 10, "Locked-off static wide camera. The masked person sits cross-legged on the white floor, gently nodding to the music, warm morning light slowly brightening across the floor. Very calm."),
}


def run(name):
    still, dur, prompt = SHOTS[name]
    cmd = [str(ROOT / "bin/cr-video"), "--model", "minimax-h3-image-to-video",
           "--first-frame", URL[still],
           "--prompt", f"{prompt} {STYLE}", "--duration", str(dur),
           "--out", str(ROOT / "vid/mm"), "--name", name, "--timeout", "2400"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return name, info.get("status"), info.get("waited_s"), info.get("duration_s"), info.get("error")


if __name__ == "__main__":
    names = sys.argv[1:] or list(SHOTS)
    with ThreadPoolExecutor(max_workers=6) as ex:
        for res in ex.map(run, names):
            print(*res, flush=True)
