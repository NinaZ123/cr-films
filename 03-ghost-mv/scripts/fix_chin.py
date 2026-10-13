"""修下巴：在已有静帧上编辑，头套往下盖住下巴，锯齿下沿下面不露皮肤。

用法：python scripts/fix_chin.py g01 g06 g07
输入 img/<镜头>-v2-0.png，输出 img/<镜头>-v3-0.png 和 -169.png。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "ref/Screenshot 2025-12-31 at 15.28.15.png"
PROMPT = ("Image 1 is the shot to edit, image 2 is the reference for the mask. Keep image 1 exactly the same — same "
          "composition, pose, hands, headphones, microphone, colours, black-and-white film look and grain — with ONE change: "
          "the green paper ghost mask is slightly longer and reaches down past the chin to the hoodie collar, so NO chin, "
          "NO jaw, NO skin and NO face is visible anywhere. Below the pixel zigzag bottom edge there is only deep black shadow "
          "and the hoodie collar. Mask shape, colour and plus-sign eyes unchanged. No text, no watermark.")


def run(name):
    cmd = [str(ROOT / "bin/cr-image"), "--model", "gpt-image-2.5-flare", "--size", "1536x1024",
           "--out", str(ROOT / "img"), "--name", f"{name}-v3", "--timeout", "900",
           "--image", str(ROOT / f"img/{name}-v2-0.png"), "--image", str(REF), "--prompt", PROMPT]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    src = ROOT / f"img/{name}-v3-0.png"
    if info.get("status") == "completed" and src.exists():
        im = Image.open(src)
        h = im.width * 9 // 16
        top = (im.height - h) // 2
        im.crop((0, top, im.width, top + h)).save(ROOT / f"img/{name}-v3-169.png")
    return name, info.get("status"), info.get("waited_s")


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=3) as ex:
        for res in ex.map(run, sys.argv[1:]):
            print(*res, flush=True)
