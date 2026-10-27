# 从录屏里切出 AI 主持人的视频画面（原生分辨率，不放大），逐帧修掉 Tavus 水印和鼠标。
# 输出 1960×1102 的 mp4（无声）。
# 用法：python clean_mod.py <录屏> <起始秒> <时长> <鼠标.json 或 -> <输出.mp4>
import sys, json, subprocess, cv2
from patch import clean

src, t0, dur, cur, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5]
X0, Y0, X1, Y1 = 330, 498, 2290, 1600   # 主持人画面在录屏里的位置，左右各收一点避开名牌（16:9）
W, H = X1 - X0, Y1 - Y0
cursor = json.load(open(cur))["frames"] if cur != "-" else []
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS)
cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                        "-vf", "fps=30", "-c:v", "libx264", "-crf", "15", "-preset", "slow", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
for i in range(int(dur * fps)):
    ok, fr = cap.read()
    if not ok: break
    fr = clean(fr, cursor[i] if i < len(cursor) else None)
    enc.stdin.write(fr[Y0:Y1, X0:X1].tobytes())
enc.stdin.close(); enc.wait(); print(out)
