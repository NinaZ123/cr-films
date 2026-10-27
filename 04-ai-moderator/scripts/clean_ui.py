# 切出完整的访谈界面（整个浏览器内容区），盖掉 Tavus 水印和鼠标，原生分辨率输出。
# 用法：python clean_ui.py <录屏> <起始秒> <时长> <鼠标.json 或 -> <输出.mp4>
import sys, json, subprocess, cv2
from patch import clean, clean_ui_bugs

src, t0, dur, cur, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5]
Y0, Y1 = 120, 1840                     # 录屏上下黑边之间
cursor = json.load(open(cur))["frames"] if cur != "-" else []
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS)
cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
W, H = 3024, Y1 - Y0
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                        "-vf", "fps=30", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
for i in range(int(dur * fps)):
    ok, fr = cap.read()
    if not ok: break
    fr = clean_ui_bugs(clean(fr, cursor[i] if i < len(cursor) else None))
    enc.stdin.write(fr[Y0:Y1].tobytes())
enc.stdin.close(); enc.wait(); print(out)
