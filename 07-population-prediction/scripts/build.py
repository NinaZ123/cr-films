"""07 人群分布预测：英文男声配音 + 中英字幕 + 报告局部放大。

用法：在 07-population-prediction/ 下
    python3 scripts/tts.py
    python3 scripts/build.py            → final/population-prediction.mp4
    python3 scripts/build.py --only 3,4 → final/preview.mp4

画面三种（见 script.py）：
  zoom：素材录屏某一帧、投屏区里的一块，放大成静帧，慢慢推近一点（Ken Burns），表格和公式看得清
  rec ：录屏一段
  card：文字卡（章节名 + 这句的中文要点）
字幕：上中文、下英文，按配音时长按字数分段。配色同 05/06：浅底 #F5F5F4，atypica 绿 #18FF19。
"""
import os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFont
from script import LINES, CHAPTERS, COVER   # script.py 只在本机（含会议内容），不进 git

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser(os.environ.get("SRC_VIDEO", "~/Downloads/catchup.mp4"))   # 会议录屏，只在本机
AUD, WORK, FINAL = (os.path.join(HERE, d) for d in ("audio", "work", "final"))

W, H, FPS = 1920, 1080, 25
BG, TEXT, DIM, SUB, BORDER = "#F5F5F4", "#0A0A0A", "#6B6B6B", "#404040", "#E5E5E5"
GREEN, GREEN_TEXT = "#18FF19", "#007C00"
PF = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"
def zh(size, w="m"): return ImageFont.truetype(PF, size, index={"r": 3, "m": 7, "b": 11}[w])
def mono(size): return ImageFont.truetype(MONO, size)

CROP = (0, 20, 1584, 1000)       # 投屏区在 1920×1080 里的位置（x, y, w, h）
BOX = (80, 30, 1760, 800)         # 画面区（x, y, w, h）
BAND_Y = BOX[1] + BOX[3] + 18
GAP = 0.4
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "160k"]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(" ".join(cmd)[:300] + "\n" + r.stderr[-2500:]); sys.exit(1)
    return r.stdout

def dur(p):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).strip())


# ---- 字幕：中英同步切段 ----
def zh_parts(s):
    return [p for p in re.findall(r"[^，。；：？！]+[，。；：？！]?", s) if p.strip()]

def en_parts(s):
    return [p.strip() for p in re.findall(r"[^,.;:?!]+(?:[,.;:?!](?!\d)|$)(?:\d[^,.;:?!]*[,.;:?!]?)?", s) if p.strip()]

def wz(s): return sum(0.55 if ord(c) < 128 else 1 for c in s)

def pack(parts, maxw, measure):
    out, cur = [], ""
    for p in parts:
        if cur and measure(cur + p) > maxw:
            out.append(cur); cur = p
        else:
            cur += p if not cur or measure is wz else " " + p
    if cur: out.append(cur)
    return out

def pairs(zh_text, en_text, n_hint):
    """按中文分 n 段，英文按相同比例切，保证两行同时换。"""
    zs = pack(zh_parts(zh_text), 26, wz)
    n = len(zs)
    words = en_text.split()
    # 按中文段的字数比例分配英文单词
    tot = sum(wz(z) for z in zs); es, k, acc = [], 0, 0.0
    for j, z in enumerate(zs):
        acc += wz(z) / tot
        end = len(words) if j == n - 1 else max(k + 1, round(acc * len(words)))
        es.append(" ".join(words[k:end])); k = end
    return [(z.rstrip("，。；：、"), e) for z, e in zip(zs, es)]


# ---- 画面 ----
def chapter_of(code): return next(c for c in CHAPTERS if c[0] == code)

def band(d, code):
    num, name, _ = chapter_of(code)
    d.rounded_rectangle([72, BAND_Y + 14, 78, BAND_Y + 40], radius=3, fill=GREEN)
    d.text((92, BAND_Y + 11), num, font=mono(22), fill=GREEN_TEXT)
    d.text((130, BAND_Y + 8), name, font=zh(22, "m"), fill=DIM)

def base_png(path, code, frame=True):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    if frame:
        x, y, w, h = BOX
        d.rounded_rectangle([x - 2, y - 2, x + w + 1, y + h + 1], radius=8, outline=BORDER, width=2, fill="#FFFFFF")
    band(d, code)
    im.save(path)

def card_png(path, code, line_zh, first=False):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    num, name, desc = chapter_of(code)
    cx = 180
    if first:
        d.text((cx, 250), COVER["byline"], font=mono(30), fill=GREEN_TEXT)
        d.rounded_rectangle([cx, 310, cx + 80, 316], radius=3, fill=GREEN)
        d.text((cx, 340), COVER["title"], font=zh(100, "b"), fill=TEXT)
        d.text((cx, 490), COVER["subtitle_short"], font=zh(40, "r"), fill=SUB)
        y = 600
        for n_, nm, _ in CHAPTERS[1:]:
            d.text((cx, y), n_, font=mono(28), fill=GREEN_TEXT); d.text((cx + 60, y - 4), nm, font=zh(32, "m"), fill=TEXT); y += 52
    else:
        d.text((cx, 290), num, font=mono(36), fill=GREEN_TEXT)
        d.rounded_rectangle([cx, 350, cx + 80, 356], radius=3, fill=GREEN)
        d.text((cx, 380), name, font=zh(80, "b"), fill=TEXT)
        d.text((cx, 500), desc, font=zh(36, "r"), fill=SUB)
    band(d, code)
    im.save(path)

def zoom_png(path, t, rx, ry, rw, rh):
    """录屏 t 秒这一帧，投屏区里 (rx,ry,rw,rh) 这一块，等比放进 BOX，留白居中。"""
    raw = os.path.join(WORK, f"frame_{t}.png")
    if not os.path.exists(raw):
        cx, cy, cw, ch = CROP
        run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", SRC, "-frames:v", "1",
             "-vf", f"crop={cw}:{ch}:{cx}:{cy}", raw])
    im = Image.open(raw).convert("RGB").crop((rx, ry, rx + rw, ry + rh))
    bw, bh = BOX[2] - 40, BOX[3] - 40
    k = min(bw / rw, bh / rh)
    im = im.resize((int(rw * k), int(rh * k)), Image.LANCZOS)
    im.save(path)
    return im.size


def sub_pngs(i, prs):
    out = []
    for k, (z, e) in enumerate(prs):
        p = os.path.join(WORK, f"sub_{i:02d}_{k}.png")
        im = Image.new("RGBA", (W, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        fz, fe = zh(38, "m"), zh(26, "r")
        d.text(((W - d.textlength(z, font=fz)) / 2, 4), z, font=fz, fill=TEXT)
        d.text(((W - d.textlength(e, font=fe)) / 2, 60), e, font=fe, fill=SUB)
        im.save(p); out.append(p)
    return out


def segment(i, line, out, first):
    code, shot, en, zh_ = line
    mp3 = os.path.join(AUD, f"{i:02d}.mp3".replace(f"{i:02d}", f"{i:03d}"))
    d = dur(mp3); D = d + GAP
    prs = pairs(zh_, en, None)
    subs = sub_pngs(i, prs)
    tot = sum(wz(z) for z, _ in prs); spans, t0 = [], 0.0
    for k, (z, _) in enumerate(prs):
        t1 = t0 + d * wz(z) / tot
        spans.append((t0, D if k == len(prs) - 1 else t1)); t0 = t1

    base = os.path.join(WORK, f"base_{i:02d}.png")
    inputs, fc = [], []
    if shot[0] == "card":
        card_png(base, code, zh_, first=first)
        inputs = ["-loop", "1", "-t", f"{D:.3f}", "-i", base]
        fc.append("[0:v]null[bg]")
    elif shot[0] == "zoom":
        base_png(base, code)
        pic = os.path.join(WORK, f"zoom_{i:02d}.png"); pw, ph = zoom_png(pic, *shot[1:])
        x = BOX[0] + (BOX[2] - pw) // 2; y = BOX[1] + (BOX[3] - ph) // 2
        inputs = ["-loop", "1", "-t", f"{D:.3f}", "-i", base, "-loop", "1", "-t", f"{D:.3f}", "-i", pic]
        # 轻推近：从 100% 放到 104%，围绕中心
        z = f"1+0.04*t/{D:.3f}"
        fc.append(f"[1:v]scale=w='trunc({pw}*({z})/2)*2':h='trunc({ph}*({z})/2)*2':eval=frame,"
                  f"crop={pw}:{ph}:(iw-{pw})/2:(ih-{ph})/2[z]")
        fc.append(f"[0:v][z]overlay={x}:{y}[bg]")
    else:  # rec
        _, a, b = shot
        base_png(base, code)
        cx, cy, cw, ch = CROP
        k = min(BOX[2] / cw, BOX[3] / ch); vw, vh = int(cw * k) // 2 * 2, int(ch * k) // 2 * 2
        sp = max((b - a) / D, 1.0)
        inputs = ["-loop", "1", "-t", f"{D:.3f}", "-i", base, "-ss", str(a), "-t", f"{b - a:.3f}", "-i", SRC]
        fc.append(f"[1:v]crop={cw}:{ch}:{cx}:{cy},scale={vw}:{vh},setpts=(PTS-STARTPTS)/{sp:.4f},fps={FPS},"
                  f"tpad=stop_mode=clone:stop_duration={D:.3f}[r]")
        fc.append(f"[0:v][r]overlay={BOX[0] + (BOX[2] - vw) // 2}:{BOX[1] + (BOX[3] - vh) // 2}:shortest=0[bg]")
    n0 = len([x for x in inputs if x == "-i"])
    inputs += ["-i", mp3]
    for p in subs:
        inputs += ["-loop", "1", "-t", f"{D:.3f}", "-i", p]
    last = "[bg]"
    for k, (s, e) in enumerate(spans):
        o = f"[s{k}]"
        fc.append(f"{last}[{n0 + 1 + k}:v]overlay=0:{BAND_Y + 52}:enable='between(t,{s:.3f},{e:.3f})'{o}"); last = o
    fc.append(f"{last}fade=in:st=0:d=0.2:color=0xF5F5F4,fade=out:st={D - 0.2:.3f}:d=0.2:color=0xF5F5F4[o]")
    fc.append(f"[{n0}:a]apad=whole_dur={D:.3f}[ao]")
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(fc),
         "-map", "[o]", "-map", "[ao]", "-t", f"{D:.3f}", *ENC, out])
    return D


def cover_png(path):
    """封面：左边标题，右边一张两根横条的对比卡。文字和数字都在 script.py 的 COVER。"""
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    cx = 150
    d.text((cx, 250), COVER["byline"], font=mono(30), fill=GREEN_TEXT)
    d.rounded_rectangle([cx, 310, cx + 96, 318], radius=4, fill=GREEN)
    d.text((cx, 350), COVER["title"], font=zh(110, "b"), fill=TEXT)
    d.text((cx, 510), COVER["subtitle"][0], font=zh(46, "r"), fill=SUB)
    d.text((cx, 570), COVER["subtitle"][1], font=zh(46, "r"), fill=SUB)
    y = 690
    for it in COVER["items"]:
        d.ellipse([cx, y + 14, cx + 12, y + 26], fill=GREEN)
        d.text((cx + 30, y), it, font=zh(32, "r"), fill=SUB); y += 56
    # 右侧卡片
    x0, y0, x1, y1 = 1180, 250, 1780, 830
    d.rounded_rectangle([x0, y0, x1, y1], radius=16, fill="#FFFFFF", outline=BORDER, width=2)
    d.text((x0 + 48, y0 + 44), COVER["card_kicker"], font=zh(28, "m"), fill=DIM)
    d.text((x0 + 48, y0 + 86), COVER["card_title"], font=zh(34, "b"), fill=TEXT)
    (l0, v0), (l1, v1) = COVER["bars"]
    bars = [(l0, v0, "#C9C9C6", TEXT), (l1, v1, GREEN, TEXT)]
    by, maxw = y0 + 190, x1 - x0 - 96 - 170   # 右边留出数字的位置
    for lab, v, col, tc in bars:
        d.text((x0 + 48, by), lab, font=zh(28, "r"), fill=SUB)
        d.rounded_rectangle([x0 + 48, by + 46, x0 + 48 + int(maxw * v / 0.6), by + 96], radius=8, fill=col)
        d.text((x0 + 48 + int(maxw * v / 0.6) + 16, by + 50), f"{v:.4f}", font=mono(34), fill=tc)
        by += 150
    d.text((x0 + 48, y1 - 80), COVER["card_note"], font=zh(26, "r"), fill=DIM)
    im.save(path)


def main():
    for p in (WORK, FINAL): os.makedirs(p, exist_ok=True)
    only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")} if "--only" in sys.argv else None
    parts, total = [], 0.0
    if only is None:
        cov = os.path.join(FINAL, "cover.png"); cover_png(cov)
        out = os.path.join(WORK, "seg_cover.mp4")
        # 封面占第一秒：第 0 帧就是封面，最后 0.2 秒淡出
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", "1", "-i", cov,
             "-f", "lavfi", "-t", "1", "-i", "anullsrc=r=44100:cl=stereo",
             "-vf", "fade=out:st=0.8:d=0.2:color=0xF5F5F4", "-shortest", *ENC, out])
        parts.append(out); total += 1.0
    for i, line in enumerate(LINES):
        if only is not None and i not in only: continue
        out = os.path.join(WORK, f"seg_{i:02d}.mp4")
        total += segment(i, line, out, first=(i == 0))
        parts.append(out); print(f"ok {i:02d} {line[0]} {total/60:4.2f}min", flush=True)
    lst = os.path.join(WORK, "list.txt")
    with open(lst, "w") as f: f.writelines(f"file '{p}'\n" for p in parts)
    out = os.path.join(FINAL, "population-prediction.mp4" if only is None else "preview.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
    if only is None:
        # 封面同时写进 mp4 当缩略图，访达等播放器里显示的就是封面
        tmp = out + ".tmp.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-i", out, "-i", cov, "-map", "0", "-map", "1", "-c", "copy",
             "-c:v:1", "png", "-disposition:v:1", "attached_pic", "-movflags", "+faststart", tmp])
        os.replace(tmp, out)
    print(out, f"{dur(out)/60:.2f} min")

if __name__ == "__main__":
    main()
