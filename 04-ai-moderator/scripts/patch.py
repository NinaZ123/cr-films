# 修掉录屏里的 Tavus 水印、"…" 气泡和鼠标。只从主持人画面内部取样，不让黑条和右侧面板的颜色渗进来。
import cv2, numpy as np

V_TOP, V_RIGHT = 494, 2397          # 主持人画面在录屏里的上沿、右沿
WM = (2080, V_TOP, V_RIGHT, 580)    # 水印 + 气泡（含外圈）

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
