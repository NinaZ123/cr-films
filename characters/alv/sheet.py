"""阿绿定妆照：flare 照 XD 的原图一次出一整张，再按格子拆开。
一致性来自同一次生成。提示词只给参考人物的特点和一句版式要求（等大格子、无文字，方便拆），
角度、几格、光线都交给模型：定妆照它本来就懂，写多了它会照我的描述画，而不是照原图。

用法：.venv 里有 Pillow 的 python 跑
  python sheet.py gen [--suffix v3]    # 出整张 img/sheet[-v3]-0.png
  python sheet.py split <名字>          # 把 img/<名字>-0.png 按白缝拆成 cells/01.png、02.png……，并拷成 sheet.jpg
"""
import subprocess, sys
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
SIZE = "3840x2160"

PROMPT = ("Images 1-4 are reference photos of one character. Create a character reference sheet of this character. "
          "Character: green crumpled-paper pixel-ghost mask with black plus-sign eyes, off-white pixel headphones with a "
          "boom microphone, oversized beige hoodie, black trousers. "
          "Lay it out as a clean grid of equal-size panels on one plain light grey background, one view per panel, "
          "no text, no labels.")


def gen(suffix):
    out = f"sheet-{suffix}" if suffix else "sheet"
    cmd = [str(CR_IMAGE), "--model", "gpt-image-2.5-flare", "--size", SIZE,
           "--out", str(HERE / "img"), "--name", out, "--timeout", "900",
           *[a for r in REFS for a in ("--image", str(r))], "--prompt", PROMPT]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print((r.stdout.strip().splitlines() or [r.stderr[-300:]])[-1])


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
    """按实测白缝切格（几行几列由模型定，缝也不是严格等分），从左到右、从上到下编号存到 cells/。"""
    im = Image.open(HERE / "img" / f"{name}-0.png").convert("RGB")
    g = im.convert("L")
    px = g.load()
    xs = gutters([min(px[x, y] for y in range(0, g.height, 4)) for x in range(g.width)])
    ys = gutters([min(px[x, y] for x in range(0, g.width, 4)) for y in range(g.height)])
    xb = [0] + [v for a, b in xs for v in (a, b)] + [g.width]
    yb = [0] + [v for a, b in ys for v in (a, b)] + [g.height]
    cells = HERE / "cells"
    cells.mkdir(exist_ok=True)
    for f in cells.glob("*.png"):
        f.unlink()
    n = 0
    for r in range(len(yb) // 2):
        for c in range(len(xb) // 2):
            n += 1
            im.crop((xb[2 * c], yb[2 * r], xb[2 * c + 1], yb[2 * r + 1])).save(cells / f"{n:02d}.png")
    im.save(HERE / "sheet.jpg", quality=90)
    print(f"{len(yb) // 2} 行 × {len(xb) // 2} 列，{n} 格")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["gen"]:
        gen(a[2] if a[1:2] == ["--suffix"] else "")
    elif a[:1] == ["split"]:
        split(a[1])
    else:
        print(__doc__)
