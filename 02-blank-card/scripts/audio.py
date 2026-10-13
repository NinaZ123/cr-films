# 配乐和音效：全部用程序合成，120 BPM，和剪辑表的拍子对齐。输出 audio/mix.wav（48kHz 立体声）。
# 结构：
#   第一幕 日程     机械节拍 + 方波琶音；s04 起从她耳机里漏出一段"耳机旋律"（低通、很轻）
#   第二幕 A 召唤   s07 音乐变稀；s08 警报蜂鸣；s09 只剩低频嗡鸣；s10 心跳低音
#   第二幕 B 考验   s11 撞击后鼓机 + 锯齿贝斯进来，小调；s14–s15 线框段做比特破碎
#   白空间          几乎静音的长音铺底；s18–s19 耳机旋律第一次清清楚楚地响起
#   第三幕 新世界   s21 上行噪声推到白光；s22 起全编制大调，朋克能量；片名一记长和弦
import sys
import numpy as np
from scipy.signal import butter, lfilter
sys.path.insert(0, "scripts"); from edl import timeline, start_of, BPM

SR = 48000
B = 60 / BPM                     # 一拍 0.5 秒
_, T = timeline()
N = int(SR * (T + 1))
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)


def hz(note):
    """'A4' / 'F#5' → 频率"""
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11, "Bb": 10}
    n, o = note[:-1], int(note[-1])
    return 440 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def tt(d): return np.arange(int(SR * d)) / SR
def square(f, d, duty=0.5): return np.where((tt(d) * f) % 1 < duty, 1.0, -1.0)
def saw(f, d): return 2 * ((tt(d) * f) % 1) - 1
def tri(f, d): return 2 * np.abs(2 * ((tt(d) * f) % 1) - 1) - 1


def env(n, a=0.005, r=0.05, sus=1.0):
    e = np.full(n, sus); ai = max(1, int(a * SR)); ri = max(1, int(r * SR))
    e[:ai] = np.linspace(0, sus, ai)[:n]
    if ri < n: e[-ri:] *= np.linspace(1, 0, ri)
    return e


def lp(x, fc, order=2):
    b, a = butter(order, min(fc / (SR / 2), 0.99), "low"); return lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "high"); return lfilter(b, a, x)


def add(t, sig, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[: j - i] * gain
    L[i:j] += s * ((1 - pan) / 2) ** 0.5; R[i:j] += s * ((1 + pan) / 2) ** 0.5


# ---- 乐器 ----
def kick(t, g=0.9):
    d = 0.35; x = tt(d); f = 50 + 110 * np.exp(-x * 30)
    add(t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9), g)


def snare(t, g=0.5):
    d = 0.2; x = tt(d)
    add(t, (hp(rng.standard_normal(len(x)), 1500) * 0.7 + np.sin(2 * np.pi * 190 * x) * 0.5) * np.exp(-x * 22), g)


def hat(t, g=0.18, open_=False):
    d = 0.25 if open_ else 0.05; x = tt(d)
    add(t, hp(rng.standard_normal(len(x)), 7000) * np.exp(-x * (12 if open_ else 80)), g, pan=0.3)


def tick(t, g=0.25):
    """第一幕的机械节拍：短促的金属咔哒"""
    x = tt(0.03); add(t, np.sin(2 * np.pi * 3200 * x) * np.exp(-x * 250), g, pan=-0.2)


def note(t, n, d, wave="sq", g=0.12, cutoff=None, pan=0.0, duty=0.5, rel=0.05):
    f = hz(n) if isinstance(n, str) else n
    s = {"sq": lambda: square(f, d, duty), "saw": lambda: saw(f, d), "tri": lambda: tri(f, d)}[wave]()
    s = s * env(len(s), r=rel)
    if cutoff: s = lp(s, cutoff)
    add(t, s, g, pan)


def chord(t, notes, d, wave="saw", g=0.05, cutoff=2500):
    for k, n in enumerate(notes): note(t, n, d, wave, g, cutoff, pan=(k - 1) * 0.4, rel=0.15)


def noise_sweep(t, d, f0, f1, g):
    """气流 / 上行噪声：带通扫频"""
    x = rng.standard_normal(int(SR * d)); out = np.zeros_like(x); seg = 1024
    for k in range(0, len(x), seg):
        f = f0 + (f1 - f0) * k / len(x); b, a = butter(2, [max(f * 0.7, 30) / (SR / 2), min(f * 1.4, SR / 2 - 100) / (SR / 2)], "band")
        out[k:k + seg] = lfilter(b, a, x[k:k + seg])
    add(t, out * env(len(out), a=d * 0.3, r=d * 0.4), g)


def boom(t, g=0.9):
    x = tt(2.0); f = 30 + 60 * np.exp(-x * 4)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2) + lp(rng.standard_normal(len(x)), 300) * np.exp(-x * 6) * 0.6
    add(t, s, g)


# 耳机旋律：两小节，D 大调。每项 (音, 拍数)
MOTIF = [("A4", 1), ("D5", 0.5), ("F#5", 0.5), ("E5", 1), ("D5", 0.5), ("B4", 0.5),
         ("A4", 1.5), ("F#4", 0.5), ("G4", 1), ("A4", 1)]


def motif(t0, g, cutoff, wave="sq", duty=0.25, times=1):
    t = t0
    for _ in range(times):
        for n, beats in MOTIF:
            note(t, n, beats * B * 0.92, wave, g, cutoff, duty=duty, rel=0.08); t += beats * B
    return t


def bar_loop(t0, t1, fn):
    t = t0
    while t < t1 - 1e-6:
        fn(t); t += 4 * B


# ---- 时间点 ----
S = {k: start_of(f"vid/{k}.mp4") for k in ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s09", "s10", "s11", "s12", "s13",
                                            "s14", "s15", "s16", "s17", "s18", "s19", "s20", "s21", "s22", "s23"]}
S["s08"] = start_of("vid/s08-v2.mp4"); S["s24"] = start_of("vid/s24-v2.mp4")
TITLE = T - 4.5

# 第一幕：s01–s06，机械节拍 + 琶音
ARP1 = ["D4", "A4", "F#4", "A4", "B3", "F#4", "D4", "F#4", "G3", "D4", "B3", "D4", "A3", "E4", "C#4", "E4"]
def act1_bar(t):
    for k in range(8):
        tick(t + k * B / 2, 0.22 if k % 2 == 0 else 0.12)
    for k in range(16):
        note(t + k * B / 4, ARP1[k], B / 4 * 0.8, "sq", 0.05, 2200, pan=0.25, duty=0.125)
bar_loop(S["s01"], S["s07"], act1_bar)
for t in np.arange(S["s01"], S["s07"], 4 * B):   # 低音铺底
    note(t, "D2", 4 * B, "tri", 0.18, 400, rel=0.3)
noise_sweep(S["s01"], 3.5, 200, 900, 0.05)       # 大厅空间的低风声
kick(S["s02"] + 1.0, 0.5); boom(S["s02"] + 1.0, 0.25)                 # 盖章：咚
noise_sweep(S["s03"] + 0.6, 1.4, 600, 4500, 0.35)                     # 管道里胶囊嗖地过去
motif(S["s04"], 0.07, 900, times=2)                                   # 耳机里漏出来的旋律
motif(S["s04"] + 16 * B, 0.07, 900, times=1)
note(S["s06"] + 0.5, 2400, 0.04, "sq", 0.08)                          # 拧开胶囊的金属声
note(S["s06"] + 0.56, 1800, 0.04, "sq", 0.06)

# 第二幕 A：召唤
for k in range(8):                                                    # s07 只剩稀疏的钟一样的音
    note(S["s07"] + k * B, ["A5", "F#5", "D5", "A4"][k % 4], 0.4, "tri", 0.05, 4000, rel=0.35)
for k in range(14):                                                   # s08 警报蜂鸣
    note(S["s08"] + 0.25 + k * 0.25, 1046 if k % 2 == 0 else 880, 0.16, "sq", 0.1, 5000, pan=(-1) ** k * 0.4)
note(S["s08"], "D2", 3.5 + 4.0, "saw", 0.12, 180, rel=0.5)            # 低频嗡鸣，一直拖到 s09 结束
for k in range(10):                                                   # s10 心跳
    t = S["s10"] + k * B
    kick(t, 0.45 if k % 2 == 0 else 0.25)
note(S["s10"] + 4.0, "A1", 1.0, "saw", 0.15, 300, rel=0.6)

# 第二幕 B：考验，小调全编制
boom(S["s11"], 1.0)
PROG2 = [("D2", ["D4", "F4", "A4"]), ("A#1", ["A#3", "D4", "F4"]), ("C2", ["C4", "E4", "G4"]), ("A1", ["A3", "C#4", "E4"])]
def act2_bar(t, idx=[0]):
    root, ch = PROG2[idx[0] % 4]; idx[0] += 1
    for k in range(4):
        kick(t + k * B, 0.8)
        if k % 2 == 1: snare(t + k * B, 0.45)
    for k in range(8): hat(t + k * B / 2, 0.12)
    for k in range(8): note(t + k * B / 2, root, B / 2 * 0.7, "saw", 0.16, 900)
    chord(t, ch, 4 * B * 0.95, "saw", 0.035, 1800)
bar_loop(S["s12"], S["s14"], act2_bar)
noise_sweep(S["s12"], 4.0, 2000, 6000, 0.12)                          # 档案架碎成粒子的沙沙声
noise_sweep(S["s13"] + 0.3, 2.2, 300, 3000, 0.4)                      # 被吸进管道
# s14–s15 线框和字符瀑布：比特破碎的琶音
ARP2 = ["D5", "F5", "A5", "D6", "C6", "A5", "F5", "A5"]
seg_start, seg_end = S["s14"], S["s16"]
for k in range(int((seg_end - seg_start) / (B / 4))):
    t = seg_start + k * B / 4
    note(t, ARP2[k % 8], B / 4 * 0.6, "sq", 0.07, 6000, pan=np.sin(k / 3) * 0.6, duty=0.25)
    if k % 4 == 0: kick(t, 0.55)
    if k % 8 == 4: snare(t, 0.3)
i0, i1 = int(seg_start * SR), int(seg_end * SR)
for ch in (L, R):                                                     # 降采样 + 量化
    x = ch[i0:i1]; step = 6; held = np.repeat(x[::step], step)[: len(x)]
    ch[i0:i1] = np.round(held * 24) / 24

# 白空间：几乎静音
for t, n in [(S["s16"], ["D3", "A3", "E4"]), (S["s17"], ["B2", "F#3", "D4"])]:
    chord(t, n, 4.0 if t == S["s16"] else 3.5, "tri", 0.05, 1200)
note(S["s17"], "D1", 3.5, "tri", 0.15, 120, rel=1.0)                  # 对峙：很低的一声
motif(S["s18"] + 1.0, 0.09, 3500, "sq", 0.25, 1)                     # 耳机旋律第一次清楚地响起
motif(S["s19"] + 1.0, 0.11, 5000, "tri", 0.5, 1)
chord(S["s18"], ["D3", "A3", "F#4"], 8.0, "tri", 0.04, 1500)
chord(S["s20"], ["G3", "B3", "D4"], 2.0, "tri", 0.05, 1600)
chord(S["s20"] + 2.0, ["A3", "C#4", "E4"], 2.0, "tri", 0.05, 1600)

# 第三幕：新世界
noise_sweep(S["s21"], 4.0, 300, 9000, 0.35)                           # 推到白光
for k in range(8): note(S["s21"] + k * B, "A2", B * 0.6, "saw", 0.08 + k * 0.015, 1200)
for k in range(4): snare(S["s21"] + 3.0 + k * B / 4, 0.25 + k * 0.08)
PROG3 = [("D2", ["D4", "F#4", "A4"]), ("B1", ["B3", "D4", "F#4"]), ("G1", ["G3", "B3", "D4"]), ("A1", ["A3", "C#4", "E4"])]
def act3_bar(t, idx=[0]):
    root, ch = PROG3[idx[0] % 4]; idx[0] += 1
    for k in range(4):
        kick(t + k * B, 0.85)
        if k % 2 == 1: snare(t + k * B, 0.5)
    for k in range(8): hat(t + k * B / 2, 0.14, open_=(k == 7))
    for k in range(8): note(t + k * B / 2, root, B / 2 * 0.8, "saw", 0.17, 1100)
    chord(t, ch, 4 * B * 0.95, "saw", 0.045, 3000)
bar_loop(S["s22"], S["s24"] + 6.0, act3_bar)
hat(S["s22"], 0.35, open_=True); boom(S["s22"], 0.5)
t = motif(S["s22"], 0.1, 6000, "sq", 0.5, 1)                          # 耳机旋律变成主旋律
motif(t, 0.1, 6000, "sq", 0.5, 1)
t = motif(S["s22"] + 16 * B, 0.1, 6000, "sq", 0.5, 1)
note(S["s23"] + 1.4, 3000, 0.02, "sq", 0.12)                          # 别针戳孔：咔
motif(S["s24"], 0.11, 7000, "sq", 0.5, 1)
# 片名：一记长和弦，加一声终端短鸣
chord(TITLE, ["D3", "A3", "D4", "F#4"], 4.0, "saw", 0.05, 2500)
note(TITLE, "D1", 4.0, "tri", 0.2, 150, rel=2.5)
note(TITLE + 2.5, 1046, 0.08, "sq", 0.08, 6000)

# 收尾：s24 结束前淡出鼓组，避免硬切
fi, fo = int((S["s24"] + 5.0) * SR), int((S["s24"] + 6.5) * SR)
fade = np.linspace(1, 0.15, fo - fi)
for ch in (L, R):
    ch[fi:fo] *= fade; ch[fo:int(TITLE * SR)] *= 0.15

out = np.stack([L, R], 1)[: int(SR * T)]
out = np.tanh(out * 1.2) / 1.2                                        # 软限幅
import wave
with wave.open("audio/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", out.shape[0] / SR)
