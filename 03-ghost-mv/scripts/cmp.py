"""模型对比：同一张首帧、同一句动作，交给几个图生视频模型各出一版，比谁的动作最自然。

用法：python scripts/cmp.py
输出 vid/cmp/<镜头>-<模型简称>.mp4
"""
import subprocess, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = dict(l.split() for l in (ROOT / "work/img-urls-v2.txt").read_text().splitlines() if l.strip())

# 动作写成真人听歌时的小动作，不演"跳舞"；节奏写明 110 BPM
STYLE = ("Black-and-white overexposed film look, only the green mask is coloured, film grain. Natural, relaxed, "
         "believable human body language like a real person filmed on camera, subtle and cool, not exaggerated, "
         "no dancing poses. The mask is a rigid paper object fixed on the head and never changes shape; the mask face "
         "always points the same way as the body. No text.")
SHOTS = {
 "g07": "Static camera. The masked person sings into the boom microphone, naturally nodding his head on every beat at 110 BPM, shoulders loose and slightly rolling with the groove, one hand on the mic stem.",
 "n08": "Slow camera pull-back. The masked person walks toward the camera with an easy, confident rhythmic stride on the beat, a little head bob with each step, shoulders relaxed, hands in hoodie pocket; the line of masked people behind him stays still.",
 "n07": "Locked-off static wide camera. The six people without headphones stand perfectly still; the one in the centre with headphones grooves naturally to the music — small knee bounce, head nod, shoulders moving, cool and relaxed like someone enjoying a song, not a performance.",
}
MODELS = {
 "mm": ("minimax-h3-image-to-video", ["--duration", "6"]),
 "kl": ("kling-v3-turbo-image-to-video", ["--duration", "5", "--resolution", "1080p"]),
 "sd": ("seedance-2.0-fast-image-to-video", ["--duration", "5", "--resolution", "720p", "--audio", "off"]),
}


def run(job):
    shot, m = job
    model, extra = MODELS[m]
    cmd = [str(ROOT / "bin/cr-video"), "--model", model, "--first-frame", URL[shot],
           "--prompt", f"{SHOTS[shot]} {STYLE}", *extra,
           "--out", str(ROOT / "vid/cmp"), "--name", f"{shot}-{m}", "--timeout", "1800"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return shot, m, info.get("status"), info.get("waited_s"), info.get("duration_s"), info.get("error")


if __name__ == "__main__":
    jobs = [(s, m) for s in SHOTS for m in MODELS]
    with ThreadPoolExecutor(max_workers=5) as ex:
        for res in ex.map(run, jobs):
            print(*res, flush=True)
