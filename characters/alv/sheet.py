"""阿绿定妆照：12 张，同一背景同一光，用 flare 照 XD 的原图（ref/）画。
每张单独出，再拼一张总览 sheet.jpg。以后每部片出静帧都拿 ref/ 原图加这里裁出的格子当参考。

用法：.venv 里有 Pillow 的 python 跑
  python sheet.py               # 12 张全出
  python sheet.py a04 a06       # 只重出这几张
  python sheet.py --suffix v2 a04
  python sheet.py --montage     # 只拼总览
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
# 用主仓库根 .env 的 key：bin/cr-image 按自身位置找 ../../.env
CR_IMAGE = HERE.parent.parent / "03-ghost-mv/bin/cr-image"
# XD 原图。1 是头套正面最清楚的一张，2 是全身彩色，3 正面上半身，4 四分之三侧面坐姿
REFS = [HERE / "ref" / n for n in ("Screenshot 2025-12-31 at 15.28.15.png",
        "img_v3_02te_18ebbde4-71be-4f1f-ba0e-ee6df33be5dg.JPG",
        "C4951934-40DF-4090-9B47-17D108D1F040_1_105_c.jpeg",
        "EF30BB59-56DE-4A94-ACD2-2CD33ACFAFAA_4_5005_c.jpeg")]

LEAD = ("Images 1-4 are reference photos of one character. Copy him EXACTLY: the green crumpled-paper pixel-ghost mask "
        "(same shape, same thickness, same green colour as image 1 — do not change the hue or saturation), the black "
        "plus-sign eyes, the off-white pixel-block headphones with the stepped pixel headband, the thin black boom "
        "microphone on the same ear cup as in image 1, the oversized beige hoodie with drawstrings and black trousers. "
        "Do not redesign anything. Keep the mask's proportions from the references: it is big, clearly larger than a "
        "human head, about as wide as the hood behind it, taller than it is wide, with real depth front to back. ")
STUDIO = ("Character model sheet photo: realistic colour studio photograph, plain seamless light grey background, soft "
          "even frontal studio light, no harsh shadows, sharp focus, the mask texture and headphones crisp and detailed. "
          "Add white sneakers. The mask covers the whole head down to the hoodie collar: no chin, no jaw, no skin of the "
          "face visible. Only one person. No props, no text, no logos, no watermark. ")
FULL = "Full body head to toe, centred, with grey margin all round, standing relaxed, arms loose at his sides. "

SHOTS = {
 "a01": FULL + "Facing the camera straight on.",
 "a02": FULL + "Three-quarter view turned to his right (camera sees his left side); mask face and body turned the same way.",
 "a03": FULL + "Three-quarter view turned to his left (camera sees his right side); mask face and body turned the same way.",
 "a04": FULL + "Exact side profile facing frame left; the mask face points the same way as his toes. The side of the mask is plain green paper showing its thickness, no eyes on the side.",
 "a05": FULL + "Exact side profile facing frame right; the mask face points the same way as his toes. The side of the mask is plain green paper showing its thickness, no eyes on the side.",
 "a06": FULL + "A single back view, ONE figure only, not a front-and-back pair. Seen from directly behind: we see the back of the hoodie with its hood and the back of the mask, which is plain green crumpled paper with NO eyes, NO face, nothing on it; the headband arches over the top and both ear cups are visible from behind.",
 "a07": "Head-and-shoulders portrait, facing the camera straight on, the mask fills the upper two thirds of the frame.",
 "a08": "Head-and-shoulders portrait, three-quarter view turned to his left; mask face and shoulders turned the same way, showing the mask thickness and the microphone.",
 "a09": "Close-up of the mask and headphones in exact side profile facing frame left, showing the depth of the mask, the stepped zigzag bottom edge and the pixel ear cup from the side.",
 "a10": "Full body head to toe with grey margin, walking toward the camera at an easy pace, mid-stride, arms swinging naturally, facing the camera.",
 "a11": "Full body, sitting on a black wooden director's chair, facing the camera, relaxed, hands resting on his knees, exactly like reference image 4 but facing the camera.",
 "a12": "Waist-up, facing the camera, one hand raised pressing the right ear cup, head tilted slightly into the music, relaxed and natural.",
}
LABELS = {"a01": "正面", "a02": "3/4 左", "a03": "3/4 右", "a04": "侧面 左", "a05": "侧面 右", "a06": "背面",
          "a07": "头 正面", "a08": "头 3/4", "a09": "头 侧面", "a10": "走", "a11": "坐", "a12": "听"}


def run(name, suffix):
    out = f"{name}-{suffix}" if suffix else name
    cmd = [str(CR_IMAGE), "--model", "gpt-image-2.5-flare", "--size", "1024x1536",
           "--out", str(HERE / "img"), "--name", out, "--timeout", "900",
           *[a for r in REFS for a in ("--image", str(r))],
           "--prompt", LEAD + STUDIO + SHOTS[name]]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    return out, info.get("status"), info.get("waited_s")


def montage(pick=None):
    """6×2 总览。pick 指定每格用哪个版本，比如 {"a04": "a04-v2"}。"""
    pick = pick or {}
    w, h, pad, lab = 512, 768, 12, 40
    sheet = Image.new("RGB", (6 * w + 7 * pad, 2 * (h + lab) + 3 * pad), "white")
    d = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 26)
    for i, k in enumerate(SHOTS):
        f = HERE / "img" / f"{pick.get(k, k)}-0.png"
        x, y = pad + (i % 6) * (w + pad), pad + (i // 6) * (h + lab + pad)
        if f.exists():
            sheet.paste(Image.open(f).convert("RGB").resize((w, h)), (x, y))
        d.text((x + 4, y + h + 6), f"{k}  {LABELS[k]}", fill="black", font=font)
    sheet.save(HERE / "sheet.jpg", quality=90)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--montage"]:
        montage(json.loads(args[1]) if len(args) > 1 else None)
        sys.exit()
    suffix = ""
    if args[:1] == ["--suffix"]:
        suffix, args = args[1], args[2:]
    names = args or list(SHOTS)
    with ThreadPoolExecutor(max_workers=6) as ex:
        for res in ex.map(lambda n: run(n, suffix), names):
            print(*res, flush=True)
