"""角色定妆照：flare 照 XD 的原图一次出一整张，再按格子拆开。各角色共用这一个脚本。
一致性来自同一次生成。提示词只给参考图是什么、人物特点，再加一句版式要求（等大格子、无文字，方便拆）；
角度、几格、光线都交给模型：定妆照它本来就懂，写多了它会照我的描述画，而不是照原图。

用法：.venv 里有 Pillow 的 python 跑
  python sheet.py gen <角色> [--suffix v2]   # 出整张 <角色>/img/sheet[-v2]-0.png
  python sheet.py split <角色> <名字>         # 把 <角色>/img/<名字>-0.png 按白缝拆成 <角色>/cells/01.png……，并拷成 <角色>/sheet.jpg
"""
import subprocess, sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
# 用主仓库根 .env 的 key：bin/cr-image 按自身位置找 ../../.env
CR_IMAGE = HERE.parent / "03-ghost-mv/bin/cr-image"
SIZE = "3840x2160"
LAYOUT = ("Lay it out as a clean grid of equal-size panels on one plain light grey background, one view per panel, "
          "no text, no labels.")

# refs 是相对 characters/ 的路径，可以跨角色借图（比如借阿绿的头套看材质）
CHARACTERS = {
    # 阿绿：03 绿幽灵 MV 主角。2026-10-15 定稿的是 alv/img/sheet-v3
    "alv": {
        "refs": ["alv/ref/Screenshot 2025-12-31 at 15.28.15.png",          # 头套正面特写
                 "alv/ref/img_v3_02te_18ebbde4-71be-4f1f-ba0e-ee6df33be5dg.JPG",  # 全身彩色
                 "alv/ref/C4951934-40DF-4090-9B47-17D108D1F040_1_105_c.jpeg",     # 正面上半身
                 "alv/ref/EF30BB59-56DE-4A94-ACD2-2CD33ACFAFAA_4_5005_c.jpeg"],   # 四分之三侧面坐姿
        "prompt": "Images 1-4 are reference photos of one character. Create a character reference sheet of this "
                  "character. Character: green crumpled-paper pixel-ghost mask with black plus-sign eyes, off-white "
                  "pixel headphones with a boom microphone, oversized beige hoodie, black trousers.",
    },
    # XD 的橘色头套人：一个普通人，平时把自己的像素 avatar 贴在脸前，后来把它做成头套把自己整个遮住。
    # 头套不照 XD 给的针织头套（XD："包着头，就感觉我像个胖胖的中年男子"），改成和阿绿一样的皱纸板像素头套：
    # 形状和五官照 avatar，材质照阿绿，身体照贴脸自拍
    "xd": {
        "refs": ["xd/ref/IMG_3016.PNG",                                   # avatar 原图：形状、配色、五官
                 "alv/ref/Screenshot 2025-12-31 at 15.28.15.png",         # 阿绿头套：材质
                 "xd/ref/IMG_5399 Copy Copy Copy.JPG"],                   # 真人把 avatar 贴在脸前：身体、衣服
        "prompt": "Image 1 is a pixel-art avatar. Image 3 shows the person behind it, holding the avatar in front "
                  "of his face. Image 2 shows the kind of mask to make: a rigid crumpled-paper pixel head mask. "
                  "Create a character reference sheet of the person in image 3 wearing image 1 made into a mask "
                  "like image 2. Character: an ordinary young man in a black hoodie; the mask is shaped and coloured "
                  "exactly like the avatar in image 1, in crumpled paper like image 2.",
    },
}


def gen(name, suffix):
    c, d = CHARACTERS[name], HERE / name
    out = f"sheet-{suffix}" if suffix else "sheet"
    cmd = [str(CR_IMAGE), "--model", "gpt-image-2.5-flare", "--size", SIZE,
           "--out", str(d / "img"), "--name", out, "--timeout", "900",
           *[a for r in c["refs"] for a in ("--image", str(HERE / r))],
           "--prompt", f"{c['prompt']} {LAYOUT}"]
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


def split(name, sheet):
    """按实测白缝切格（几行几列由模型定，缝也不是严格等分），从左到右、从上到下编号存到 cells/。"""
    d = HERE / name
    im = Image.open(d / "img" / f"{sheet}-0.png").convert("RGB")
    g = im.convert("L")
    px = g.load()
    xs = gutters([min(px[x, y] for y in range(0, g.height, 4)) for x in range(g.width)])
    ys = gutters([min(px[x, y] for x in range(0, g.width, 4)) for y in range(g.height)])
    xb = [0] + [v for a, b in xs for v in (a, b)] + [g.width]
    yb = [0] + [v for a, b in ys for v in (a, b)] + [g.height]
    cells = d / "cells"
    cells.mkdir(exist_ok=True)
    for f in cells.glob("*.png"):
        f.unlink()
    n = 0
    for r in range(len(yb) // 2):
        for c in range(len(xb) // 2):
            n += 1
            im.crop((xb[2 * c], yb[2 * r], xb[2 * c + 1], yb[2 * r + 1])).save(cells / f"{n:02d}.png")
    im.save(d / "sheet.jpg", quality=90)
    print(f"{len(yb) // 2} 行 × {len(xb) // 2} 列，{n} 格")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["gen"]:
        gen(a[1], a[3] if a[2:3] == ["--suffix"] else "")
    elif a[:1] == ["split"]:
        split(a[1], a[2])
    else:
        print(__doc__)
