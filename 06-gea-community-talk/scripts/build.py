"""06 GEA community 讲解课：录屏 + ElevenLabs 配音 + 字幕。

用法：在 06-gea-community-talk/ 下
    python3 scripts/tts.py      # 先生成配音（已有的跳过）
    python3 scripts/build.py    # 再出片 → final/gea-community-talk.mp4

画面：src/screen.mp4 只取投屏区域（裁掉右边的参会者头像栏），放在浅底上；
下方一条字幕带，左边小字标章节。一句配音配一段录屏，录屏比配音长就加速（最多 4 倍），
短就停在最后一帧。现场只有头像、没有投屏的问答段，用文字卡代替。
配色同 05：浅底 #F5F5F4、黑字，atypica 绿 #18FF19 只做色块和短线，绿色文字用 #007C00。
"""
import os, re, subprocess, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFont
from script import LINES, CHAPTERS, CARDS   # script.py 只在本机（含会议内容），不进 git
# --en：英文配音 + 中文字幕（字幕用 script_en.py 里和英文对应的中文）
EN = "--en" in sys.argv
if EN:
    from script_en import EN as EN_LINES
    LINES = [(l[0], l[1], l[2], zh_) for l, (zh_, _) in zip(LINES, EN_LINES)]

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "src", "screen.mp4")
AUD = os.path.join(HERE, "audio_en" if EN else "audio")
WORK = os.path.join(HERE, "work_en" if "--en" in sys.argv else "work")
FINAL = os.path.join(HERE, "final")

W, H, FPS = 1920, 1080, 25
BG, TEXT, DIM, SUB, BORDER = "#F5F5F4", "#0A0A0A", "#6B6B6B", "#404040", "#E5E5E5"
GREEN, GREEN_TEXT, ON_GREEN = "#18FF19", "#007C00", "#1A1C1F"
PF = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"
def zh(size, w="m"): return ImageFont.truetype(PF, size, index={"r": 3, "m": 7, "b": 11}[w])
def mono(size): return ImageFont.truetype(MONO, size)

CROP = "1584:1000:0:20"          # 投屏区域，去掉参会者栏和底部名字条
VH = 860
VW = round(VH * 1584 / 1000) // 2 * 2
VX, VY = (W - VW) // 2, 22
BAND_Y = VY + VH + 22            # 字幕带
GAP = 0.35                       # 每句后留的空
MAXSPEED = 4.0
STRETCH = 1.45                   # 英文版每个镜头最多比配音长这么多

# 现场没有投屏（只有头像）的时间段，这些句子用文字卡
NO_SCREEN = [(59 * 60 + 48, 63 * 60 + 26)]
END_LINE = len(LINES) - 1        # 最后一句配片尾卡

ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "160k"]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(" ".join(cmd)[:400] + "\n" + r.stderr[-2500:]); sys.exit(1)
    return r.stdout


def dur(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())


# ---- 字幕切分 ----
def width(s):
    return sum(0.55 if ord(c) < 128 else 1 for c in s)

def chunks(text, maxw=24):
    parts = re.findall(r"[^，。；：？！、]+[，。；：？！、]?", text)
    out, cur = [], ""
    for p in parts:
        if cur and width(cur + p) > maxw:
            out.append(cur); cur = p
        else:
            cur += p
    if cur: out.append(cur)
    # 单段还太长就硬切
    res = []
    for c in out:
        while width(c) > maxw + 6:
            k, wsum = 0, 0
            while wsum < maxw: wsum += 0.55 if ord(c[k]) < 128 else 1; k += 1
            res.append(c[:k]); c = c[k:]
        res.append(c)
    return [c.rstrip("，。；：、") for c in res if c.strip()]


# ---- 画面元素 ----
def chapter_of(code):
    return next(c for c in CHAPTERS if c[0] == code)

def base_png(path, code, frame=True):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    if frame:
        d.rounded_rectangle([VX - 2, VY - 2, VX + VW + 1, VY + VH + 1], radius=6, outline=BORDER, width=2)
    num, name, _ = chapter_of(code)
    d.rounded_rectangle([72, BAND_Y + 22, 78, BAND_Y + 52], radius=3, fill=GREEN)
    d.text((92, BAND_Y + 18), num, font=mono(24), fill=GREEN_TEXT)
    d.text((134, BAND_Y + 15), name, font=zh(24, "m"), fill=DIM)
    im.save(path)

def sub_png(path, text):
    f = zh(40, "m")
    im = Image.new("RGBA", (W, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    tw = d.textlength(text, font=f)
    x = max((W - tw) / 2, 420)
    d.text((x, 10), text, font=f, fill=TEXT)
    im.save(path)

def card_png(path, code, title, sub=None, items=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    num, name, desc = chapter_of(code)
    cx = 180
    d.text((cx, 300), num, font=mono(40), fill=GREEN_TEXT)
    d.rounded_rectangle([cx, 368, cx + 80, 374], radius=3, fill=GREEN)
    d.text((cx, 400), title, font=zh(96, "b"), fill=TEXT)
    if sub:
        d.text((cx, 550), sub, font=zh(40, "r"), fill=SUB)
    if items:
        y = 650
        for it in items:
            d.ellipse([cx, y + 15, cx + 12, y + 27], fill=GREEN)
            d.text((cx + 30, y), it, font=zh(32, "r"), fill=SUB)
            y += 54
    im.save(path)

def qa_png(path, q):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([VX - 2, VY - 2, VX + VW + 1, VY + VH + 1], radius=6, outline=BORDER, width=2, fill="#FFFFFF")
    d.text((VX + 90, VY + 260), "现场提问", font=zh(30, "m"), fill=GREEN_TEXT)
    d.rounded_rectangle([VX + 90, VY + 312, VX + 170, VY + 318], radius=3, fill=GREEN)
    y = VY + 350
    f = zh(60, "b")
    for ln in q.split("\n"):
        d.text((VX + 90, y), ln, font=f, fill=TEXT); y += 84
    return im


# ---- 片段 ----
def subs_filter(n_in, spans):
    """spans: [(png, start, end)] → overlay 链"""
    chain, last = [], "[bg]"
    for k, (_, s, e) in enumerate(spans):
        out = f"[s{k}]"
        chain.append(f"{last}[{n_in + k}:v]overlay=0:{BAND_Y + 44}:enable='between(t,{s:.3f},{e:.3f})'{out}")
        last = out
    return chain, last

def segment(i, line, out):
    code, a, b, text = line
    mp3 = os.path.join(AUD, f"{i:03d}.mp3")
    d = dur(mp3)
    D = d + GAP
    if EN and i != END_LINE and not any(lo <= a < hi for lo, hi in NO_SCREEN):
        # 英文比中文短一半：录屏长的镜头多留一点，让画面别跑太快、中文字幕看得完
        D = max(D, min((b - a) / MAXSPEED, D * STRETCH))
    # 字幕时间按字数分配
    cs = chunks(text)
    tot = sum(width(c) for c in cs)
    spans, t0 = [], 0.0
    for k, c in enumerate(cs):
        png = os.path.join(WORK, f"sub_{i:03d}_{k}.png"); sub_png(png, c)
        t1 = t0 + d * width(c) / tot
        spans.append((png, t0, t1))
        t0 = t1
    if spans:
        spans[-1] = (spans[-1][0], spans[-1][1], D)
    no_screen = any(lo <= a < hi for lo, hi in NO_SCREEN)
    base = os.path.join(WORK, f"base_{i:03d}.png")
    if i == END_LINE:
        card_png(base, code, *CARDS["end"])
        spans = []
    elif no_screen:
        q = next(text for start, text in reversed(CARDS["questions"]) if a >= start)
        im = qa_png(base, q)
        im.save(base); base_png(base + ".tmp.png", code, frame=False)
        over = Image.open(base + ".tmp.png"); band = over.crop((0, BAND_Y, W, H)); im.paste(band, (0, BAND_Y)); im.save(base)
    else:
        base_png(base, code)
    inputs = ["-loop", "1", "-t", f"{D:.3f}", "-i", base, "-i", mp3]
    for png, _, _ in spans:
        inputs += ["-loop", "1", "-t", f"{D:.3f}", "-i", png]
    if no_screen or i == END_LINE:
        fc = ["[0:v]null[bg]"]
        n_in = 2
    else:
        L = b - a
        sp = min(max(L / D, 1.0), MAXSPEED)
        take = min(L, D * sp)
        hold = max(D - take / sp, 0)
        inputs = ["-ss", f"{a:.3f}", "-t", f"{take:.3f}", "-i", SRC] + inputs
        v = f"[0:v]crop={CROP},scale={VW}:{VH}:flags=lanczos,setpts=(PTS-STARTPTS)/{sp:.4f},fps={FPS}"
        if hold > 0.01:
            v += f",tpad=stop_mode=clone:stop_duration={hold:.3f}"
        fc = [v + "[v]", f"[1:v][v]overlay={VX}:{VY}[bg]"]
        n_in = 3
    chain, last = subs_filter(n_in, spans)
    fc += chain
    fc.append(f"{last}fade=in:st=0:d=0.15:color=0xF5F5F4,fade=out:st={D - 0.15:.3f}:d=0.15:color=0xF5F5F4[o]")
    a_idx = n_in - 1
    fc.append(f"[{a_idx}:a]apad=whole_dur={D:.3f}[ao]")
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(fc),
         "-map", "[o]", "-map", "[ao]", "-t", f"{D:.3f}", *ENC, out])
    return D

def still(png, out, D):
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", f"{D}", "-i", png,
         "-f", "lavfi", "-t", f"{D}", "-i", "anullsrc=r=44100:cl=stereo",
         "-vf", f"fade=in:st=0:d=0.25:color=0xF5F5F4,fade=out:st={D - 0.25}:d=0.25:color=0xF5F5F4",
         "-shortest", *ENC, out])


def main():
    os.makedirs(WORK, exist_ok=True); os.makedirs(FINAL, exist_ok=True)
    only = None
    if "--only" in sys.argv:
        only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
    parts, seen, total = [], set(), 0.0
    for i, line in enumerate(LINES):
        code = line[0]
        if code not in seen and (only is None):
            seen.add(code)
            num, name, desc = chapter_of(code)
            png = os.path.join(WORK, f"title_{code}.png")
            if code == "00":
                card_png(png, code, *CARDS["open"])
                D = 4.0
            else:
                card_png(png, code, name, desc)
                D = 2.5
            out = os.path.join(WORK, f"title_{code}.mp4"); still(png, out, D)
            parts.append(out); total += D
        if only is not None and i not in only:
            continue
        if not os.path.exists(os.path.join(AUD, f"{i:03d}.mp3")):
            print("缺配音", i); continue
        out = os.path.join(WORK, f"seg_{i:03d}.mp4")
        total += segment(i, line, out)
        parts.append(out)
        print(f"ok {i:02d} {code} {total/60:5.1f}min", flush=True)
    lst = os.path.join(WORK, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{p}'\n" for p in parts)
    name = ("gea-community-talk-en.mp4" if EN else "gea-community-talk.mp4") if only is None else "preview.mp4"
    out = os.path.join(FINAL, name)
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
    print(out, f"{dur(out)/60:.1f} min")

if __name__ == "__main__":
    main()
