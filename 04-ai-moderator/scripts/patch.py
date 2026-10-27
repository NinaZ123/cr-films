# 修掉录屏里的 Tavus 水印、"…" 气泡和鼠标。只从主持人画面内部取样，不让黑条和右侧面板的颜色渗进来。
import cv2, numpy as np
from pathlib import Path

V_TOP, V_RIGHT = 494, 2397          # 主持人画面在录屏里的上沿、右沿
WM = (2080, V_TOP, V_RIGHT, 580)    # 水印 + 气泡（含外圈）

# 底部工具栏的两个 UI bug，用干净的参考图整块盖掉：
# 左：护手霜那场冒出来的橙色 "1 Insight ×"，压住 Turn off / Mute（参考图取自耳机那场，同一位置没有药丸）
# 中：纸飞机按钮压住 "People" "Share"（按原字体 Helvetica Neue 26px 重写了这两个标签）
HERE = Path(__file__).parent
TB_LEFT = cv2.imread(str(HERE / "toolbar-left.png"))   # 放在 (34, 1688)
TB_MID = cv2.imread(str(HERE / "toolbar-mid.png"))     # 放在 (1400, 1688)
SAY = (20, 1496, 262, 1596)          # 左侧面板里的 "说点什么…" 输入框（含圆角深色底，右端压进画面约 20px）
PANEL = (31, 24, 18)                 # 左侧面板底色（BGR）
MARGIN = (16, 10, 8)                 # 面板左边那条更暗的外沿
VIDEO_L = 240                        # 主持人画面左沿

def _match(patch, fr, ref_xy):
    # 参考图来自另一帧，白底亮度和这一帧略有差别：按工具栏上一块空白处的颜色整体校正
    x, y = ref_xy
    gain = fr[y - 3:y + 3, x - 3:x + 3].reshape(-1, 3).mean(0) / patch_ref_white
    return np.clip(patch.astype(np.float32) * gain, 0, 255).astype(np.uint8)

patch_ref_white = np.array([254.0, 254.0, 254.0])

def clean_ui_bugs(fr):
    h, w = TB_LEFT.shape[:2]; fr[1688:1688 + h, 34:34 + w] = _match(TB_LEFT, fr, (1200, 1760))
    h, w = TB_MID.shape[:2]; fr[1688:1688 + h, 1400:1400 + w] = _match(TB_MID, fr, (1200, 1760))
    fr[1803:1808, 1400:1400 + w] = fr[1810, 1300]   # 纸飞机按钮底边比工具栏多出 2–3px，涂回下面的深色
    x0, y0, x1, y1 = SAY
    fr[y0:y1, x0:33] = MARGIN
    fr[y0:y1, 33:VIDEO_L] = PANEL
    # 压进画面的那一截：用画面内部补
    m = np.zeros(fr.shape[:2], np.uint8); m[y0 - 4:y1 + 4, VIDEO_L - 1:x1] = 255
    sl = (slice(y0 - 30, y1 + 30), slice(VIDEO_L - 1, x1 + 40))
    roi = fr[sl].copy(); fr[sl] = cv2.inpaint(roi, m[sl], 7, cv2.INPAINT_TELEA)
    return fr

def clean(fr, cursor=None):
    fr[470:V_TOP, 2080:2400] = 0                    # 气泡伸进上方黑条的一截，涂回黑色
    fr[470:580, V_RIGHT:2425] = fr[700, 2420]       # 伸出画面右沿的一截，涂成右侧面板底色
    x0, y0, x1, y1 = WM
    src = fr.copy()
    # 把画面里水印下方和左侧的内容镜像到画面外，inpaint 取样时只看得到画面
    src[y0 - 54:y0, x0:x1] = src[y1:y1 + 54, x0:x1][::-1]
    src[y0:y1, x1:x1 + 40] = src[y1:y1 + (y1 - y0), x1 - 40:x1]   # 右边用水印正下方那段墙面
    mask = np.zeros(fr.shape[:2], np.uint8)
    mask[y0:y1, x0:x1] = 255
    if cursor:
        c = cursor
        mask[max(0, c["y"] - 4):c["y"] + c["h"] + 4, max(0, c["x"] - 4):c["x"] + c["w"] + 4] = 255
    out = cv2.inpaint(src, mask, 9, cv2.INPAINT_TELEA)
    fr[y0:y1, x0:x1] = out[y0:y1, x0:x1]
    if cursor:
        sl = (slice(max(0, c["y"] - 4), c["y"] + c["h"] + 4), slice(max(0, c["x"] - 4), c["x"] + c["w"] + 4))
        fr[sl] = out[sl]
    return fr
