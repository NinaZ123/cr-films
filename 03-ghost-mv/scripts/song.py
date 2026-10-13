"""歌：用带声音的文生视频模型唱出前奏加第一段主歌，只要音轨。多出几版给 XD 听。

用法：python scripts/song.py [版本 ...]
输出 audio/takes/<版本>.mp4 和 json。画面不用。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LYRICS = ('Verse (cool, half-spoken, deadpan, right on the beat): "Seven-oh-one, take a seat. Seven-oh-two, keep the beat. '
          'Seven-oh-three, sign the sheet. Everybody right on time." '
          'Hook (sung, catchy, lifts up): "But I got a blank card, blank card. Nothing on it — mine."')
PICTURE = ("Visual: a minimal black-and-white music video, a person wearing a boxy green paper ghost mask and off-white "
           "headphones sings into a small headset microphone in an empty white studio, static camera.")
SF, VEO = "seedance-2.0-fast-text-to-video", "veo3.1-fast"

# 版本：(模型, 时长或 None, 曲风)
TAKES = {
 "a-minimal-electro": (SF, 15, "Song: minimal electro-pop, 120 BPM, dry mechanical drum machine, ticking hi-hat like a clock, "
                              "deep sub bass, one young male vocalist with a soft clear voice, English lyrics sung clearly."),
 "b-lofi-indie":      (SF, 15, "Song: lo-fi indie pop, 120 BPM, punchy drum machine, muted guitar plucks, warm bass, "
                              "young female vocalist with an airy cool voice, English lyrics sung clearly."),
 "c-chiptune-pop":    (SF, 15, "Song: chiptune synth-pop, 120 BPM, 8-bit square-wave lead, hard electronic kick and clap, "
                              "young male vocalist, slightly robotic deadpan delivery, English lyrics sung clearly."),
 "d-veo-electro":     (VEO, None, "Song: minimal electro-pop, 120 BPM, mechanical drum machine, clock-tick hi-hat, deep bass, "
                              "young male vocalist with a soft clear voice, English lyrics sung clearly."),
 "e-veo-indie":       (VEO, None, "Song: lo-fi indie pop, 120 BPM, drum machine, muted guitar, young female vocalist with an "
                              "airy cool voice, English lyrics sung clearly."),
}


def run(name):
    model, dur, style = TAKES[name]
    cmd = [str(ROOT / "bin/cr-video"), "--model", model, "--prompt", f"{style} {LYRICS} {PICTURE}",
           "--out", str(ROOT / "audio/takes"), "--name", name, "--timeout", "1800"]
    if dur:
        cmd += ["--duration", str(dur), "--aspect-ratio", "16:9"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return name, info.get("status"), info.get("waited_s"), info.get("duration_s"), info.get("error")


if __name__ == "__main__":
    names = sys.argv[1:] or list(TAKES)
    with ThreadPoolExecutor(max_workers=5) as ex:
        for res in ex.map(run, names):
            print(*res, flush=True)
