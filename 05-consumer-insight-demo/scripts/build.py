"""消费者洞察 · 功能演示：把 demo1 / demo2 录屏按 brief 的三块功能剪开，加标题卡和每段说明。

配色沿用 04-ai-moderator/comp/src/theme.ts：近黑底 #0A0A0A、霓虹绿 #18FF19。
只用 ffmpeg + Pillow，不走 Remotion（没有动效需求，快）。

用法：python3 scripts/build.py   （在 05-consumer-insight-demo/ 下跑）
输出：final/consumer-insight-demo.mp4
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(HERE, "work")
FINAL = os.path.join(HERE, "final")
D = os.path.expanduser("~/Desktop")
# 源 -> (文件, 裁切 w:h:x:y 或 None)
SRC = {
    "d1": (f"{D}/demo1.mp4", None),
    "d2": (f"{D}/demo2.mp4", None),
    "a1": (f"{D}/demo add1.mp4", "2466:1358:94:138"),   # 去掉浏览器标签栏和书签栏、左侧 Arc 侧栏
    "a2": (f"{D}/demo add2.mp4", None),
    "a2v": (f"{D}/demo add2.mp4", "1360:300:870:872"),  # 只留"下一步 · 给我生成一个视频"那张卡，上面的报错卡不进画面
}

W, H, FPS = 1920, 1080, 30
# 跟录屏里的产品界面一个风格：浅灰白底、黑字。绿色用 atypica 品牌绿 #18FF19（gea-consumer-insight
# src/styles.css 的 --signal）：做色块、细线、小点，色块上压黑字，和产品里"进行中"徽标一样。
# 绿色当文字时用品牌的 brand-green-strong #007C00，因为 #18FF19 在白底上读不出来。
BG, TEXT, DIM, SUB, INK, BORDER = "#F5F5F4", "#0A0A0A", "#6B6B6B", "#404040", "#0A0A0A", "#E5E5E5"
GREEN, GREEN_TEXT, ON_GREEN = "#18FF19", "#007C00", "#1A1C1F"
PF = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"
def zh(size, weight="m"):
    return ImageFont.truetype(PF, size, index={"r": 3, "m": 7, "b": 11}[weight])
def mono(size):
    return ImageFont.truetype(MONO, size)

VH = 880          # 录屏缩放后的高度
VY = 40           # 录屏顶部位置
CAP_Y = VY + VH + 34

# ---- 剪辑表 -------------------------------------------------------------
# (源, 起, 止, 倍速, 小节标签, 说明)
def t(m, s): return m * 60 + s  # s 可以带小数
SECTIONS = [
    ("01", "Persona 库", "先构建 Persona，再组成库", [
        # 刚点进去的页面多停一会儿：讲两种展示方式
        ("d1", t(5,28), t(5,31.5), 0.55, "两种展示", "Persona 库有两种展示方式：按 Panel 看，一组人一张卡"),
        ("d1", t(5,31.5), t(5,36), 0.75, "两种展示", "或者按 Persona 看每一个人，可以按 Panel、来源、标签筛选"),
        # 构建方式一：自己上传
        ("d1", t(5,20), t(5,27), 1, "构建方式一", "构建方式一：自己上传访谈稿或问卷表格，自动构建 Persona"),
        ("d1", t(5,36), t(5,44), 0.9, "雷达图打分", "上传后用雷达图给 7 个维度打分，提示还差哪些部分"),
        ("d1", t(5,44), t(5,48), 1, "补齐", "差的部分补充材料补齐，生成新版本"),
        # 构建方式二：研究里定义
        ("d1", t(5,57), t(6, 5), 1, "构建方式二", "构建方式二：在研究定义中构建，直接以 Panel 形式展示"),
    ]),
    ("02", "新研究", "一个问题 → 方案 → 访谈 → 报告", [
        # 开头多停：讲场景和 Playbook
        ("d2", t(0, 0), t(0, 9), 0.8, "场景", "从一个问题开始：下面是现在就能做的研究场景"),
        ("d2", t(0, 9), t(0,17), 0.8, "Playbook", "Playbook：每种研究方法一套现成流程，概念测试 · 人群细分 · 定价研究 · 群体互动"),
        ("d2", t(0,17), t(0,24), 1, "选受访者", "可以选 Persona 库里的 Panel 当受访者，不选就自动生成"),
        ("d2", t(0,27), t(0,37), 1.5, "先问决策", "研究会先问清：你要拿这个结果决定什么"),
        ("d2", t(0,37), t(0,48), 1.5, "确认方案", "再出方案，确认后执行"),
        ("d1", t(0, 9), t(0,27), 1.5, "一对一访谈", "一对一访谈：每个人单独问，每个人的回答都能点开看"),
        ("a1", t(0,18), t(0,30), 1.5, "Focus Group", "Focus Group：多人一起讨论，主持人带节奏，能看到谁在说话"),
        ("a1", t(0,30), t(0,38), 1, "插话给主持人", "可以插话给主持人：加话题、调方向"),
        ("a1", t(0,38), t(1,10), 3, "Focus Group", "受访者按顺序发言"),
        ("d2", t(1, 1), t(1, 8), 1, "看 Persona", "点头像看这个人的 Persona"),
        ("a1", t(1,10), t(1,17), 1, "讨论小结", "结束后有讨论小结：每个人的立场、一致和分歧"),
        ("d1", t(0,27), t(0,43), 1.5, "研究报告", "交付：研究报告"),
        ("a2v", t(0,30), t(0,38), 1, "下一步", "报告后的下一步：调用另一个 GEA agent「媒体生成专家」生成 1 分钟视频"),
    ]),
    ("03", "问卷模拟", "写好问卷，虚拟受访者逐题作答", [
        ("d1", t(5, 2), t(5,14), 1.5, "新建模拟", "写好问卷：单选、多选、数字、开放题"),
        ("d1", t(5,10), t(5,13), 1, "受访者来源", "填好人群，或直接用 Persona 库里的 Panel"),
    ]),
]

# 标题卡上列的要点（照 brief）
ITEMS = {
    "01": ["两种展示：按 Panel 看一组人，按 Persona 看每一个人", "构建方式一：自己上传 → 雷达图打分提示缺什么 → 补齐", "构建方式二：在研究定义中构建，直接以 Panel 形式展示"],
    "02": ["选研究方法，选 Panel 或自动生成受访者", "先问清要决定什么，再出方案", "一对一访谈 · Focus Group（可插话给主持人）", "交付研究报告；下一步可生成 1 分钟视频"],
    "03": ["单选、多选、数字、开放题", "虚拟受访者逐题作答，每个人的回答都能看"],
}

# ---- 画面元素 -----------------------------------------------------------
def text_w(d, s, f):
    return d.textlength(s, font=f)

def chrome(path, num, section, tag, caption, box):
    """录屏段的底板：黑底 + 录屏外框 + 底部说明。录屏本身之后由 ffmpeg 叠上去。"""
    im = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(im)
    f_num, f_sec, f_cap = mono(24), zh(24, "m"), zh(34, "m")
    x = 72
    bx, by, bw, bh = box
    d.rounded_rectangle([bx - 2, by - 2, bx + bw + 1, by + bh + 1], radius=6, outline=BORDER, width=2)
    d.text((x, CAP_Y + 6), num, font=f_num, fill=GREEN_TEXT)
    x += text_w(d, num, f_num) + 16
    d.text((x, CAP_Y + 2), section, font=f_sec, fill=DIM)
    x += text_w(d, section, f_sec) + 22
    d.line([(x, CAP_Y + 8), (x, CAP_Y + 34)], fill=BORDER, width=2)
    x += 22
    d.text((x, CAP_Y - 4), caption, font=f_cap, fill=TEXT)
    # 右侧小标签
    f_tag = zh(22, "m")
    tw = text_w(d, tag, f_tag)
    d.rounded_rectangle([W - 72 - tw - 32, CAP_Y - 2, W - 72, CAP_Y + 40], radius=21, fill=GREEN)
    d.text((W - 72 - tw - 16, CAP_Y + 4), tag, font=f_tag, fill=ON_GREEN)
    im.convert("RGB").save(path)

def title_card(path, num, title, sub, items=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    cx = 180
    d.text((cx, 330), num, font=mono(40), fill=GREEN_TEXT)
    d.rounded_rectangle([cx, 398, cx + 80, 404], radius=3, fill=GREEN)
    d.text((cx, 430), title, font=zh(110, "b"), fill=TEXT)
    d.text((cx, 590), sub, font=zh(40, "r"), fill=SUB)
    if items:
        y = 690
        for it in items:
            d.ellipse([cx, y + 15, cx + 12, y + 27], fill=GREEN)
            d.text((cx + 30, y), it, font=zh(30, "r"), fill=SUB)
            y += 50
    im.save(path)

def open_card(path):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((180, 360), "atypica · GEA", font=mono(34), fill=GREEN_TEXT)
    d.text((180, 420), "消费者洞察", font=zh(130, "b"), fill=TEXT)
    d.text((180, 600), "主要功能演示", font=zh(52, "r"), fill=SUB)
    y = 720
    for n, name, _, _ in SECTIONS:
        d.text((180, y), n, font=mono(30), fill=GREEN_TEXT)
        d.text((250, y - 6), name, font=zh(36, "m"), fill=TEXT)
        y += 60
    im.save(path)

def end_card(path):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    s = "Persona 库 · 新研究 · 问卷模拟"
    f = zh(56, "m")
    d.text(((W - d.textlength(s, font=f)) / 2, 470), s, font=f, fill=TEXT)
    s2 = "录屏案例：挂耳咖啡 · 办公室人群"
    f2 = zh(30, "r")
    d.text(((W - d.textlength(s2, font=f2)) / 2, 570), s2, font=f2, fill=DIM)
    d.rounded_rectangle([W / 2 - 40, 437, W / 2 + 40, 443], radius=3, fill=GREEN)
    im.save(path)

# ---- ffmpeg -------------------------------------------------------------
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-ar", "48000", "-ac", "2", "-shortest"]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(r.stderr[-3000:]); sys.exit(1)

def still(png, out, dur):
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", str(dur), "-i", png,
         "-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"fade=in:st=0:d=0.3:color=0xF5F5F4,fade=out:st={dur-0.3}:d=0.3:color=0xF5F5F4", *ENC, out])

MAXW = W - 2 * 72

def src_size(src):
    path, crop = SRC[src]
    if crop:
        w, h = map(int, crop.split(":")[:2])
    else:
        o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                            "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")
        w, h = int(o[0]), int(o[1])
    return w, h

def place(src):
    """录屏在画面里的位置：高度最多 VH，宽度最多 MAXW，水平居中；矮的条带在录屏区里垂直居中。"""
    w, h = src_size(src)
    k = min(VH / h, MAXW / w)
    bw, bh = int(w * k) // 2 * 2, int(h * k) // 2 * 2
    return ((W - bw) // 2, VY + (VH - bh) // 2, bw, bh)

def clip(src, a, b, speed, png, out, box):
    path, crop = SRC[src]
    bx, by, bw, bh = box
    dur = (b - a) / speed
    pre = f"crop={crop}," if crop else ""
    vf = (f"[0:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)/{speed},fps={FPS},{pre}scale={bw}:{bh}:flags=lanczos[v];"
          f"[1:v][v]overlay=x={bx}:y={by},"
          f"fade=in:st=0:d=0.2:color=0xF5F5F4,fade=out:st={dur-0.2:.3f}:d=0.2:color=0xF5F5F4[o]")
    run(["ffmpeg", "-y", "-v", "error", "-i", path, "-loop", "1", "-t", f"{dur:.3f}", "-i", png,
         "-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo",
         "-filter_complex", vf, "-map", "[o]", "-map", "2:a", "-t", f"{dur:.3f}", *ENC, out])

def main():
    os.makedirs(WORK, exist_ok=True); os.makedirs(FINAL, exist_ok=True)
    parts = []
    p = os.path.join(WORK, "00_open.png"); open_card(p)
    parts.append(os.path.join(WORK, "00_open.mp4")); still(p, parts[-1], 3.5)
    for num, name, sub, segs in SECTIONS:
        p = os.path.join(WORK, f"{num}_title.png")
        title_card(p, num, name, sub, ITEMS[num])
        parts.append(os.path.join(WORK, f"{num}_title.mp4")); still(p, parts[-1], 2.5)
        for i, (src, a, b, sp, tag, cap) in enumerate(segs):
            box = place(src)
            png = os.path.join(WORK, f"{num}_{i:02d}.png"); chrome(png, num, name, tag, cap, box)
            out = os.path.join(WORK, f"{num}_{i:02d}.mp4"); clip(src, a, b, sp, png, out, box)
            parts.append(out); print("ok", num, i, tag, flush=True)
    p = os.path.join(WORK, "99_end.png"); end_card(p)
    parts.append(os.path.join(WORK, "99_end.mp4")); still(p, parts[-1], 3)
    lst = os.path.join(WORK, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{x}'\n" for x in parts)
    out = os.path.join(FINAL, "consumer-insight-demo.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
    print(out)

if __name__ == "__main__":
    main()
