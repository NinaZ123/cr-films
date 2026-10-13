# 按剪辑表把每段渲染成 1920x1080 24fps 的 H.264 片段（不带声音），再拼接成 work/picture.mp4。
# ffmpeg 没有 drawtext，字幕和片名用 PIL 画成 PNG 再叠上去。
import subprocess, os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, "scripts"); from edl import EDL, UNSCHEDULED
FPS = 24
# 赛璐珞画面只做轻处理：统一尺寸、一点对比和颗粒，不像《回响》那样大调色
GRADE = ("scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,setsar=1,"
         "eq=contrast=1.03:saturation=1.02,noise=alls=6:allf=t")
MONO = "/System/Library/Fonts/Menlo.ttc"
HEI = "/System/Library/Fonts/STHeiti Medium.ttc"


def run(a): subprocess.run(["ffmpeg", "-v", "error", "-y"] + a, check=True)


def unscheduled_png(path):
    """s08 上叠的终端字：透明底，红色等宽字，带一点辉光"""
    im = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(MONO, 96, index=1); t = "> UNSCHEDULED_"
    w = d.textlength(t, font=f); x, y = (1920 - w) / 2, 470
    d.rectangle([x - 40, y - 30, x + w + 40, y + 130], fill=(10, 4, 2, 200))
    for r, a in ((6, 60), (3, 110)):
        for dx in (-r, r):
            for dy in (-r, r):
                d.text((x + dx, y + dy), t, font=f, fill=(255, 60, 30, a))
    d.text((x, y), t, font=f, fill=(255, 210, 190, 255))
    im.save(path)


def title_png(path):
    im = Image.new("RGB", (1920, 1080), (0, 0, 0)); d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(HEI, 150); f2 = ImageFont.truetype(MONO, 40, index=1); f3 = ImageFont.truetype(HEI, 24)
    t = "空 白 卡"; w = d.textlength(t, font=f1); d.text(((1920 - w) / 2, 380), t, font=f1, fill=(236, 228, 210))
    t = "B L A N K   C A R D"; w = d.textlength(t, font=f2); d.text(((1920 - w) / 2, 590), t, font=f2, fill=(232, 112, 40))
    t = "一部虚构动画短片的预告"; w = d.textlength(t, font=f3); d.text(((1920 - w) / 2, 930), t, font=f3, fill=(100, 96, 90))
    im.save(path)


os.makedirs("work/seg", exist_ok=True); os.makedirs("work/cards", exist_ok=True)
unscheduled_png("work/cards/unscheduled.png"); title_png("work/cards/title.png")
segs = []
for i, (kind, src, tin, dur) in enumerate(EDL):
    out = f"work/seg/{i:02d}.mp4"; segs.append(out); n = round(dur * FPS)
    enc = ["-frames:v", str(n), "-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "16",
           "-pix_fmt", "yuv420p", "-an", out]
    if kind == "shot" and src == UNSCHEDULED[0]:
        st, d = UNSCHEDULED[1], UNSCHEDULED[2]
        run(["-ss", str(tin), "-i", src, "-loop", "1", "-i", "work/cards/unscheduled.png", "-filter_complex",
             f"[0:v]{GRADE}[v];[1:v]format=rgba,fade=t=in:st={st}:d=0.08:alpha=1[t];"
             f"[v][t]overlay=enable='between(t,{st},{st + d})'"] + enc)
    elif kind == "shot":
        run(["-ss", str(tin), "-i", src, "-vf", GRADE] + enc)
    elif kind == "black":
        run(["-f", "lavfi", "-i", f"color=black:s=1920x1080:r={FPS}"] + enc)
    else:
        run(["-loop", "1", "-r", str(FPS), "-i", "work/cards/title.png", "-vf",
             f"noise=alls=5:allf=t,fade=t=in:st=0:d=0.5,fade=t=out:st={dur - 0.8}:d=0.8"] + enc)
with open("work/seg/list.txt", "w") as f:
    for s in segs: f.write(f"file '{os.path.basename(s)}'\n")
run(["-f", "concat", "-safe", "0", "-i", "work/seg/list.txt", "-c", "copy", "work/picture.mp4"])
print("ok")
