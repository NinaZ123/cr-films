"""视频：关键帧 URL 当首帧（部分镜头加尾帧），按镜头表的模型和时长生成。

用法：python scripts/vid.py [镜头号 ...]      不给就跑全部
      python scripts/vid.py --suffix v2 s05   重做时换名字
URL 读自 work/kf-urls.txt（关键帧上传 S3 后的公开地址）。输出 vid/<镜头>[-<suffix>].mp4 和 json。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = dict(l.split() for l in (ROOT / "work/kf-urls.txt").read_text().splitlines() if l.strip())

STYLE = "Flat 2D cel-shaded 1980s anime, stable character design, no text."
K, S = "kling-v3-turbo-image-to-video", "seedance-2.0-fast-image-to-video"

# 镜头：(模型, 时长, 尾帧镜头或 None, 动作提示词)
SHOTS = {
 "s01": (K, 5, None, "Very slow push-in over the endless amber office hall, tiny clerk robots working at their desks, CRT screens flicker softly."),
 "s02": (K, 3, None, "The robot hand presses the rubber stamp down firmly onto the punch card and lifts it, one decisive stamp."),
 "s03": (K, 3, None, "The glass capsule shoots fast through the transparent pneumatic tube from left to right with a whoosh, motion blur."),
 "s04": (K, 5, None, "The girl skates smoothly from left to right down the aisle, jacket flaring, camera tracks alongside her at the same speed, clerk robots keep working."),
 "s05": (K, 4, None, "The girl gently nods her head to the music with eyes half closed; behind her the clerk robots stamp in perfect unison."),
 "s06": (K, 5, None, "The girl twists the capsule open with one hand, casual and practiced, glancing down at it."),
 "s07": (K, 4, None, "The blank card slowly slides out of the capsule into her palm, catching the light."),
 "s08": (K, 4, None, "The CRT screens turn from amber to red one after another in a wave across the wall, the red warning lamp rotates."),
 "s09": (K, 4, None, "All the clerk robots slowly turn their heads toward the girl at the same moment; she stands still. Very slight camera push-in."),
 "s10": (K, 6, None, "The girl looks down at the blank card, then raises her eyes calmly, and slides the card inside her jacket and zips it up."),
 "s11": (K, 5, None, "The white android, kneeling after landing, slowly and gracefully rises to full height, coat-tails settling, red light."),
 "s12": (S, 6, None, "The girl skates fast away from camera; the archive shelves behind her topple and burst into swirling white particles like petals; the android runs after her far behind. Camera follows."),
 "s13": (K, 4, None, "The girl is pulled into the huge tube opening, her body sucked in with motion lines, hair and jacket streaming."),
 "s14": (S, 5, "s14e", "The girl flies through the green wireframe tunnel; the pixels around her legs fly back together and her body reassembles."),
 "s15": (K, 5, None, "The girl falls and slowly tumbles through cascading green glyph waterfalls, jacket fluttering, camera follows the fall."),
 "s16": (K, 5, None, "The girl rises from her landing crouch and looks toward the glowing particle door; particles drift softly."),
 "s17": (K, 5, None, "The two figures stand still facing each other; only the particles of the door drift and the girl's hair moves slightly. Tension."),
 "s18": (K, 5, None, "The girl calmly holds the headphones out toward the android; the android slowly lowers its head to look at them."),
 "s19": (K, 5, None, "The android settles the headphones on its head with both hands; the orange waveform on its visor begins to pulse gently with the music."),
 "s20": (S, 4, "s20e", "The android slowly and gracefully steps aside to the right, revealing the glowing particle door; the girl stands still in the foreground."),
 "s21": (S, 5, "s21e", "The girl slides the card into the particle door; the door bursts into pure white light that fills the frame."),
 "s22": (K, 6, None, "Wind blows the girl's jacket and hair as she stands at the rooftop edge facing the rising sun; clouds drift slowly. Very slow push-in."),
 "s23": (K, 4, None, "The fingers push the safety pin through the card, making one small hole, then pull it out."),
 "s24": (K, 8, None, "Locked-off static wide camera, no zoom, no camera movement. The girl walks away toward the horizon along the rooftop, the android walks half a step behind her; both stay small in frame and get smaller as they walk away. Sun rising."),
}


def run(name, suffix):
    model, dur, last, prompt = SHOTS[name]
    out = f"{name}-{suffix}" if suffix else name
    cmd = [str(ROOT / "bin/cr-video"), "--model", model, "--first-frame", URL[name],
           "--prompt", f"{prompt} {STYLE}", "--duration", str(dur),
           "--out", str(ROOT / "vid"), "--name", out, "--timeout", "1800"]
    if model == K:
        cmd += ["--resolution", "1080p"]
    else:
        cmd += ["--resolution", "720p", "--audio", "off"]
    if last:
        cmd += ["--last-frame", URL[last]]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last_line = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last_line)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return name, info.get("status"), info.get("waited_s"), info.get("duration_s"), info.get("size"), info.get("error")


if __name__ == "__main__":
    args = sys.argv[1:]
    suffix = ""
    if args[:1] == ["--suffix"]:
        suffix, args = args[1], args[2:]
    names = args or list(SHOTS)
    with ThreadPoolExecutor(max_workers=8) as ex:
        for res in ex.map(lambda n: run(n, suffix), names):
            print(*res, flush=True)
