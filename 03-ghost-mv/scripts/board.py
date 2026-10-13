"""把若干图拼成一张带标签的对照图：board.py out.jpg 行高 img1 img2 ...（每行最多 N 张，用 '|' 换行）"""
import sys
from PIL import Image, ImageDraw, ImageFont
out, h, items = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
rows, cur = [], []
for it in items:
    if it == '|': rows.append(cur); cur = []
    else: cur.append(it)
if cur: rows.append(cur)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
built = []
for r in rows:
    ims = []
    for p in r:
        im = Image.open(p).convert('RGB'); im = im.resize((int(im.width * h / im.height), h))
        d = ImageDraw.Draw(im); lab = p.split('/')[-1].rsplit('-0.', 1)[0].rsplit('.', 1)[0]
        d.rectangle([0, 0, len(lab) * 12 + 12, 30], fill=(0, 0, 0)); d.text((6, 3), lab, fill=(255, 255, 255), font=font)
        ims.append(im)
    w = sum(i.width for i in ims) + 8 * (len(ims) - 1)
    row = Image.new('RGB', (w, h), (40, 40, 40)); x = 0
    for i in ims: row.paste(i, (x, 0)); x += i.width + 8
    built.append(row)
W = max(r.width for r in built)
sheet = Image.new('RGB', (W, sum(r.height for r in built) + 8 * (len(built) - 1)), (40, 40, 40)); y = 0
for r in built: sheet.paste(r, (0, y)); y += r.height + 8
sheet.save(out, quality=88)
