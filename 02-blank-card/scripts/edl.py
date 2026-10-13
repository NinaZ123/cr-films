# 剪辑表：(类型, 素材, 入点秒, 时长秒)。类型 shot | black | title。
# 时长都是 0.5 的倍数，开头黑场 1 秒，所以每个剪点都落在 120 BPM 的拍子上（配乐见 audio.py）。
BPM = 120
EDL = [
 ("black", None, 0, 1.0),
 # 第一幕 · 日程
 ("shot", "vid/s01.mp4", 0.0, 4.0),
 ("shot", "vid/s02.mp4", 0.0, 3.0),
 ("shot", "vid/s03.mp4", 0.2, 2.5),
 ("shot", "vid/s04.mp4", 0.0, 4.0),
 ("shot", "vid/s05.mp4", 0.0, 4.0),
 ("shot", "vid/s06.mp4", 0.2, 4.0),
 # 第二幕 A · 召唤
 ("shot", "vid/s07.mp4", 0.0, 4.0),
 ("shot", "vid/s08-v2.mp4", 0.0, 3.5),
 ("shot", "vid/s09.mp4", 0.0, 4.0),
 ("shot", "vid/s10.mp4", 0.0, 5.0),
 # 第二幕 B · 考验
 ("shot", "vid/s11.mp4", 0.3, 4.0),
 ("shot", "vid/s12.mp4", 0.0, 4.5),
 ("shot", "vid/s13.mp4", 0.0, 3.0),
 ("shot", "vid/s14.mp4", 1.0, 4.0),
 ("shot", "vid/s15.mp4", 0.0, 4.0),
 ("shot", "vid/s16.mp4", 0.3, 4.0),
 ("shot", "vid/s17.mp4", 0.0, 3.5),
 ("shot", "vid/s18.mp4", 0.0, 4.0),
 ("shot", "vid/s19.mp4", 0.0, 4.0),
 ("shot", "vid/s20.mp4", 0.0, 4.0),
 # 第三幕 · 新世界
 ("shot", "vid/s21.mp4", 1.0, 4.0),
 ("shot", "vid/s22.mp4", 0.0, 5.0),
 ("shot", "vid/s23.mp4", 0.0, 4.0),
 ("shot", "vid/s24-v2.mp4", 0.0, 6.5),
 ("black", None, 0, 0.5),
 ("title", None, 0, 4.5),
]
# s08 上叠的终端字幕：出现时刻（相对 s08 开头）和长度
UNSCHEDULED = ("vid/s08-v2.mp4", 1.0, 2.5)


def timeline():
    t = 0.0; out = []
    for e in EDL:
        out.append((t,) + e); t += e[3]
    return out, t


def start_of(src):
    """某个素材在成片里的开始时刻"""
    for r in timeline()[0]:
        if r[2] == src:
            return r[0]
    raise KeyError(src)


if __name__ == "__main__":
    tl, T = timeline()
    for r in tl:
        print(f"{r[0]:6.2f}  {r[1]:5s} {str(r[2]):18s} in={r[3]} dur={r[4]}")
    print("total", T)
