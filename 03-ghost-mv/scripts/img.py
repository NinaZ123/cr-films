"""静帧：带上 XD 的原图（ref/ 里 4 张）用 flare 编辑出每个镜头的静帧。
不用自己生成的三视图：它的侧面是方盒子，跟原图差太远。

用法：python scripts/img.py [镜头号 ...]      不给就跑全部
      python scripts/img.py --suffix v2 g03   重做时换名字
输出 img/<镜头>[-<suffix>]-0.png（3:2），再裁成 img/<镜头>[-<suffix>]-169.png（16:9）。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REFS = [ROOT / "ref" / n for n in ("Screenshot 2025-12-31 at 15.28.15.png",
        "C3C603EC-4083-49A9-84C4-1986715AB965_1_105_c.jpeg",
        "A1E96B97-BAA1-4ADF-B106-72C7E631978C_1_105_c.jpeg",
        "C4951934-40DF-4090-9B47-17D108D1F040_1_105_c.jpeg")]

STYLE = ("Black-and-white high-key 35mm film photograph, overexposed and airy, blown-out whites, heavy film grain, "
         "faint photocopy halftone texture, slight softness, editorial fashion photography. Everything is monochrome grey "
         "EXCEPT the mask, which keeps exactly its soft light mint-green paper colour from the reference images (do not "
         "saturate or brighten it) — the only colour in the picture. Lots of empty white negative space. "
         "Compose for a 16:9 crop. No text, no letters, no logos, no watermark.")
GHOST = ("the masked person EXACTLY as in the reference images — copy the mask shape faithfully: a soft light mint-green "
         "crumpled-paper Pac-Man ghost mask, its silhouette is a pixel ghost with a stepped rounded dome top, straight "
         "sides and a pixel zigzag bottom edge, with some thickness but NOT a cube or box or cylinder; two black plus-sign "
         "eyes on the front; chunky faceted off-white pixel-block headphones with a stepped pixel headband over the dome "
         "and a thin black boom microphone from the right ear cup; oversized beige hoodie, black trousers. "
         "The mask face and the body ALWAYS face the same direction, toward the camera. The mask is long enough to "
         "reach down to the hoodie collar: no chin, no jaw, no skin of the face visible anywhere")
CROWD = ("people wearing the same mint-green paper ghost masks, each mask exactly the same shape as the reference, "
         "with NO headphones, NO ear cups, NO ear muffs, nothing on the sides of the mask, in plain grey hoodies and black "
         "trousers, all facing the camera")

SHOTS = {
 "g01": f"Close-up, frontal, odd crop: the mask fills the right half of the frame facing the camera, both black plus-sign eyes visible, the top of the dome cut off by the frame edge, the left half is pure blown-out white. Of {GHOST}.",
 "g02": f"Very wide frontal shot: {GHOST}, standing small in the lower third of a vast empty white hall with a white floor, facing the camera, arms loose. Huge empty white space above.",
 "g03": f"Wide frontal shot: a straight line-up of five figures standing shoulder to shoulder, filling the frame width on a white floor, knee-up framing, arms at their sides: four of them are {CROWD}. The one in the exact centre (third from left) is {GHOST} — the ONLY person in the picture with headphones — and he tilts his head to one side, listening to music. Flat overexposed light.",
 "g04": f"Slightly high-angle frontal shot across rows of identical empty white office desks in a bright white room; at one desk {GHOST} sits alone facing the camera, looking down at a cream punch card on the desk. Everything else empty.",
 "g05": f"Odd crop, high angle in a white spiral stairwell: {GHOST} walks down the stairs toward the camera, small in frame, the mask the only colour. Geometric white railings.",
 "g06": f"Close-up, three-quarter front view: {GHOST}, one hand raised pressing the off-white headphone ear cup, as if turning the music up, head tilted into the music. Framed off-centre to the left, rest is white.",
 "g07": f"Medium shot, frontal, slightly low angle: {GHOST} stands in an empty white space and sings into the thin black boom microphone, one hand holding the microphone stem. Hoodie fills the bottom of frame.",
 # 60 秒版补的镜头
 "n01": f"Extreme close-up: a hand in a beige hoodie sleeve pushes a plain cream-white paper punch card (NOT green — off-white paper) into the slot of an old grey metal wall-mounted punch clock with a plain WHITE clock face and black hands reading seven o'clock — the clock is completely grey and white, NOT green. Only the hand, the card and the clock in frame, rest is blown-out white. No mask in frame.",
 "n02": f"Medium shot, frontal, slightly low angle, in an empty white space: {GHOST} throws his head back with both hands pressing the headphones to his head, lost in the music, shoulders up, chest open, natural candid moment like a real concert photo, not posed.",
 "n03": f"Medium close-up, frontal: {GHOST} holds a completely blank cream punch card up toward the camera with both hands at chest height, the card has no holes and no writing. The mask fills the top of frame, the card is the centre of attention.",
 "n05": f"High-angle shot looking down over three rows of three identical white desks, at every desk sits one of the {CROWD}, all heads bowed at exactly the same angle over cream punch cards. In the exact centre desk {GHOST} — the only one with headphones — leans back with his head tilted up. Overexposed, graphic, symmetrical.",
 "n06": f"Frontal shot down a long white corridor: a column of {CROWD} marches toward the camera in perfect lockstep, same leg forward, three abreast, the front row large in frame, receding to a vanishing point. Symmetrical, overexposed.",
 "n07": f"Wide frontal shot: a straight line-up of five figures on a white floor filling the frame width, four of them are {CROWD} standing rigidly still with arms at their sides; in the centre {GHOST} — the ONLY one with headphones — is caught mid-groove like a real person enjoying a song: knees slightly bent, weight on one leg, shoulders dropped, head tilted to one side, one hand lightly on a headphone, relaxed and cool, not a dance pose. Flat overexposed light.",
 "n08": f"Low-angle frontal shot: {GHOST} steps forward out of a straight line of {CROWD} who stay behind him slightly out of focus, he walks toward the camera with a relaxed swagger, hands in hoodie pocket. Overexposed white background.",
 # 群众单人精修：之后在 Remotion 里复制成队列，头套和阿绿一样精细
 "c01": f"Full-body frontal portrait, centred, standing straight with arms relaxed at the sides, on a pure seamless white studio background: ONE person wearing the same soft light mint-green crumpled-paper Pac-Man ghost mask as the reference — same stepped dome top, same pixel zigzag bottom edge reaching the hoodie collar, same black plus-sign eyes, same paper texture and quality, crisp and detailed — but WITHOUT headphones and without microphone, nothing on the sides of the mask; plain mid-grey hoodie, black trousers, white sneakers. Neutral, motionless, like a uniform. Head to toe in frame with white margin all round.",
 "n04": f"Very wide frontal shot: {GHOST} sits alone cross-legged in the middle of a vast empty white floor, facing the camera, relaxed, hands resting on his knees, listening to music. Soft warm morning light from the side — the only warm tone in the film — long soft shadow.",
}


import re as _re
SHOTS_SRC = {k: v for k, v in _re.findall(r'"(\w+)": f"(.*?)",\n', open(__file__).read())}

# 有群众的镜头多带一张群众单人精修图（c01），让每个人的头套都照它画
CROWD_REF = ROOT / "img/c01-0.png"


def run(name, suffix):
    out = f"{name}-{suffix}" if suffix else name
    crowd = "CROWD" in SHOTS_SRC.get(name, "")
    cmd = [str(ROOT / "bin/cr-image"), "--model", "gpt-image-2.5-flare", "--size", "1536x1024",
           "--out", str(ROOT / "img"), "--name", out, "--timeout", "900", *[a for r in REFS for a in ("--image", str(r))],
           *(["--image", str(CROWD_REF)] if crowd else []),
           "--prompt", f"Images 1-4 are reference photos of the masked person; match the mask shape, colour and headphones exactly. "
                       + ("Image 5 is the reference for every crowd member: each one must have exactly that crisp, detailed mask, drawn at the same quality as the main character. " if crowd else "")
                       + f"{STYLE} {SHOTS[name]}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    src = ROOT / f"img/{out}-0.png"
    if info.get("status") == "completed" and src.exists():
        im = Image.open(src)
        h = im.width * 9 // 16
        top = (im.height - h) // 2
        im.crop((0, top, im.width, top + h)).save(ROOT / f"img/{out}-169.png")
    return name, info.get("status"), info.get("waited_s")


if __name__ == "__main__":
    args = sys.argv[1:]
    suffix = ""
    if args[:1] == ["--suffix"]:
        suffix, args = args[1], args[2:]
    names = args or list(SHOTS)
    with ThreadPoolExecutor(max_workers=8) as ex:
        for res in ex.map(lambda n: run(n, suffix), names):
            print(*res, flush=True)
