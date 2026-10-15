"""阿绿定妆照：一张图一次出 12 格（6×2），再拆成单张。
一致性来自同一张图：12 个角度是模型在同一次生成里画的。不要每个角度单独出再拼，那样各格之间没有约束。

用法：.venv 里有 Pillow 的 python 跑
  python sheet.py gen [--suffix v2]    # 出整张 img/sheet[-v2]-0.png
  python sheet.py split <名字>          # 把 img/<名字>-0.png 拆成 cells/a01..a12.png
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
# 用主仓库根 .env 的 key：bin/cr-image 按自身位置找 ../../.env
CR_IMAGE = HERE.parent.parent / "03-ghost-mv/bin/cr-image"
# XD 原图。1 是头套正面最清楚的一张，2 是全身彩色，3 正面上半身，4 四分之三侧面坐姿
REFS = [HERE / "ref" / n for n in ("Screenshot 2025-12-31 at 15.28.15.png",
        "img_v3_02te_18ebbde4-71be-4f1f-ba0e-ee6df33be5dg.JPG",
        "C4951934-40DF-4090-9B47-17D108D1F040_1_105_c.jpeg",
        "EF30BB59-56DE-4A94-ACD2-2CD33ACFAFAA_4_5005_c.jpeg")]
COLS, ROWS = 6, 2
SIZE = "3840x2160"

CELLS = [
 ("a01", "full body, facing the camera straight on"),
 ("a02", "full body, three-quarter view turned to his right"),
 ("a03", "full body, three-quarter view turned to his left"),
 ("a04", "full body, exact side profile facing left"),
 ("a05", "full body, exact side profile facing right"),
 ("a06", "full body, seen from directly behind: the back of the mask is plain green paper with no eyes and no face"),
 ("a07", "head and shoulders, facing the camera"),
 ("a08", "head and shoulders, three-quarter view turned to his left"),
 ("a09", "head close-up, exact side profile facing left, showing the depth of the mask"),
 ("a10", "full body, walking toward the camera mid-stride"),
 ("a11", "full body, sitting on a black director's chair, facing the camera, hands on knees"),
 ("a12", "waist up, facing the camera, one hand pressing the right ear cup, head tilted into the music"),
]

PROMPT = (
 "Images 1-4 are reference photos of one character. Make a professional character model sheet of EXACTLY this "
 "character: one single image laid out as a clean grid of 12 equal panels, 6 columns by 2 rows, separated by thin "
 "white gutters. Every panel shows the same one person, the same costume, the same mask, as if photographed in one "
 "studio session: the green crumpled-paper pixel-ghost mask (same shape, thickness and green colour as image 1 — do "
 "not change hue or saturation; big, clearly larger than a human head, about as wide as the hood, taller than wide, "
 "with real depth), black plus-sign eyes, off-white pixel-block headphones with the stepped pixel headband, the thin "
 "black boom microphone on the same ear cup as image 1, oversized beige hoodie with drawstrings, black trousers, "
 "white sneakers. The mask covers the whole head down to the hoodie collar: no chin, no jaw, no skin visible. In "
 "every panel the mask face and the body face the same direction. Realistic colour studio photography, plain "
 "seamless light grey background, soft even light, sharp detail, identical lighting and scale across panels. "
 "Exactly one person per panel. No text, no labels, no numbers, no logos, no watermark. Panels, left to right, "
 "top row then bottom row: "
 + "; ".join(f"{i + 1}) {d}" for i, (_, d) in enumerate(CELLS)) + "."
)


def gen(suffix):
    out = f"sheet-{suffix}" if suffix else "sheet"
    cmd = [str(CR_IMAGE), "--model", "gpt-image-2.5-flare", "--size", SIZE,
           "--out", str(HERE / "img"), "--name", out, "--timeout", "900",
           *[a for r in REFS for a in ("--image", str(r))], "--prompt", PROMPT]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print((r.stdout.strip().splitlines() or [r.stderr[-300:]])[-1])


# 一次出完后单格的局部修补：只修这一格，不动别的格子
FIXES = {"a09": "a09-fix2"}  # 侧面头部露出下巴，flare 编辑两次把头套下沿拉到领口


def gutters(vals, thr=245):
    """亮度 ≥ thr 的连续段就是格子之间的白缝。"""
    out, start = [], None
    for i, v in enumerate(vals + [0]):
        if v >= thr and start is None:
            start = i
        elif v < thr and start is not None:
            if i - start >= 3:
                out.append((start, i))
            start = None
    return out


def split(name):
    """按实测白缝切成 12 格（模型画的缝不是严格等分），存到 cells/，修过的格子换成修补版，再拼回 sheet.jpg。"""
    im = Image.open(HERE / "img" / f"{name}-0.png").convert("RGB")
    g = im.convert("L")
    px = g.load()
    xs = gutters([min(px[x, y] for y in range(0, g.height, 4)) for x in range(g.width)])
    ys = gutters([min(px[x, y] for x in range(0, g.width, 4)) for y in range(g.height)])
    assert len(xs) == COLS - 1 and len(ys) == ROWS - 1, (xs, ys)
    xb = [0] + [v for a, b in xs for v in (a, b)] + [g.width]
    yb = [0] + [v for a, b in ys for v in (a, b)] + [g.height]
    (HERE / "cells").mkdir(exist_ok=True)
    sheet = im.copy()
    for i, (k, _) in enumerate(CELLS):
        c, r = i % COLS, i // COLS
        box = (xb[2 * c], yb[2 * r], xb[2 * c + 1], yb[2 * r + 1])
        cell = im.crop(box)
        if k in FIXES:
            cell = Image.open(HERE / "img" / f"{FIXES[k]}-0.png").convert("RGB").resize(cell.size, Image.LANCZOS)
            sheet.paste(cell, box[:2])
        cell.save(HERE / "cells" / f"{k}.png")
    sheet.save(HERE / "sheet.jpg", quality=90)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["gen"]:
        gen(a[2] if a[1:2] == ["--suffix"] else "")
    elif a[:1] == ["split"]:
        split(a[1])
    else:
        print(__doc__)
