# 在录屏片段里逐帧找鼠标位置（模板匹配），输出每帧的坐标 JSON，给 Remotion 盖鼠标用。
# 用法：python find_cursor.py <视频> <起始秒> <时长> <输出.json>
import sys, json, cv2, numpy as np
src, t0, dur, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
ref = cv2.imread(__file__.rsplit("/", 2)[0] + "/work/cur/ref60.png")
tpl = ref[895:933, 2049:2075]  # 鼠标箭头本身（含白边）
th, tw = tpl.shape[:2]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
res = []
for i in range(int(dur * fps)):
    ok, fr = cap.read()
    if not ok: break
    m = cv2.matchTemplate(fr, tpl, cv2.TM_CCOEFF_NORMED)
    _, v, _, (x, y) = cv2.minMaxLoc(m)
    res.append({"t": round(i / fps, 3), "x": int(x), "y": int(y), "w": tw, "h": th, "score": round(float(v), 3)})
json.dump({"fps": fps, "frames": res}, open(out, "w"))
sc = [r["score"] for r in res]
print(out, len(res), "frames, score min/median", round(min(sc), 2), round(float(np.median(sc)), 2))
