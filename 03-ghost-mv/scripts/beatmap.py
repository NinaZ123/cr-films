"""歌的时间表：实测每一拍、每个词的时间，写成 comp/src/beatmap.json。画面全部从这张表推算，不手填秒数。

照 brand-hero-video 那套"音频是脊柱"的做法：先量音频，再让剪辑、动画、字幕都吸附到量出来的点上。
- 拍：低频起音包络上搜最贴合的等距网格（这首是 109.8 BPM），再把每一拍吸到 ±60ms 内最近的真实起音
- 词：faster-whisper 的逐词时间（work/el-01-words.json），每句的起点也吸到最近的拍
用法：python scripts/beatmap.py
"""
import json
import numpy as np, scipy.io.wavfile as w, scipy.signal as sg
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sr, x = w.read(ROOT / "work/el-01.wav"); x = x.astype(float) / 32768
b, a = sg.butter(4, 150 / (sr / 2), "low"); lo = sg.filtfilt(b, a, x)
hop = 128; n = len(x) // hop
env = np.array([np.sqrt((lo[i*hop:(i+1)*hop]**2).mean()) for i in range(n)])
on = np.maximum(np.diff(env, prepend=env[0]), 0)
t = np.arange(n) * hop / sr

best = None
for bpm in np.arange(108, 112.001, 0.01):
    T = 60 / bpm
    for ph in np.arange(0, T, 0.002):
        g = np.arange(ph, t[-1], T); g = g[g > 15]
        sc = on[(g * sr / hop).astype(int)].sum()
        if best is None or sc > best[0]: best = (sc, bpm, ph)
_, bpm, ph = best; T = 60 / bpm
grid = np.arange(ph, t[-1], T)
beats = []
for g in grid:
    lo_i, hi_i = int((g - 0.06) * sr / hop), int((g + 0.06) * sr / hop)
    lo_i = max(lo_i, 0); seg = on[lo_i:hi_i]
    beats.append(round(float(t[lo_i + int(seg.argmax())]) if len(seg) and seg.max() > on.std() else float(g), 3))

words = json.load(open(ROOT / "work/el-01-words.json"))
snap = lambda v: min(beats, key=lambda bt: abs(bt - v))
out = {"bpm": round(bpm, 2), "beat": round(T, 4), "beats": beats,
       "words": [{**wd, "beat": snap(wd["t0"])} for wd in words]}
(ROOT / "comp/src/beatmap.json").write_text(json.dumps(out))
print(f"BPM {bpm:.2f}  拍 {len(beats)}  前几拍 {beats[:4]}  15s 后第一拍 {[b for b in beats if b > 15][0]}")
