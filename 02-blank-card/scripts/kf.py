"""关键帧：每个镜头带上它用到的定稿资产（assets/locked）去编辑出一张图。

用法：python scripts/kf.py [镜头号 ...]      不给镜头号就跑全部
      python scripts/kf.py --suffix v2 s05   重做时换个名字，不覆盖旧图
输出 kf/<镜头>[-<suffix>]-0.png（3:2），再裁成 kf/<镜头>[-<suffix>]-169.png（16:9）。
"""
import subprocess, sys, json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "assets/locked"

STYLE = ("Cinematic 16:9 anime film still, flat 2D cel-shaded 1980s OVA anime, clean ink linework, "
         "hard cel shadows, subtle halftone and film grain, same art style as the reference images. "
         "Compose for a 16:9 frame: keep heads and key action away from the top and bottom edges. "
         "No text, no letters, no logos anywhere except the '07' patch on the girl's sleeve.")
SEVEN = ("the girl 'Seven' exactly as in her reference: black asymmetric bob with straight bangs, ONE orange "
         "streak on the right side of her face, silver-grey eyes, cream headphones with orange stripes and a short "
         "black coiled cord, oversized olive-green MA-1 jacket with orange lining, ONE '07' patch on her LEFT "
         "upper sleeve only, small safety pin on her LEFT chest, black turtleneck, dark grey shorts, black tights, "
         "chunky white sneakers")
SEVEN_B = SEVEN.replace("cream headphones with orange stripes and a short black coiled cord", "NO headphones")
ENF = ("the tall white 'Enforcer' android exactly as in its reference: slender glossy porcelain-white body, thin black "
       "joint seams, long white armor coat-tails, heeled white boots, smooth white helmet with one glossy black visor")
ENF_B = ENF + ", now wearing the girl's cream-and-orange headphones over its helmet"
CLERK = "identical short round beige 'Clerk' androids with blank face plates, olive vests and olive sleeve covers"
HALL = "the amber-lit retro-futurist bureau hall exactly as in its reference (beige desks, beige CRTs glowing amber, olive filing cabinets, brass tubes, orange floor lines)"

# 镜头：(名字, [参考图], 提示词)
SHOTS = {
 "s01": (["hall-1-wide", "clerk-1-front"], f"Extreme wide high-angle establishing shot of {HALL}, the hall stretching endlessly to a vanishing point, thousands of desks, tiny {CLERK} working at the desks like dots. Grand, quiet, warm amber."),
 "s02": (["clerk-2-desk", "prop-card-blank", "hall-3-sort"], f"Extreme close-up: the beige rubber-gloved-looking hand of one of the {CLERK} presses a wooden rubber stamp down onto a cream punch card covered with rows of punched holes, on a beige desk. The clerk's olive sleeve has NO patch, NO number, NO badge; background is the sorting station softly out of focus, amber light."),
 "s03": (["hall-3-sort", "prop-capsule"], f"Medium shot inside {HALL}: a transparent glass pneumatic tube runs across the frame under the ceiling, and a brass-capped glass capsule (as in its reference) shoots through it with motion streaks. No people."),
 "s04": (["seven-a3-skate", "hall-2-aisle", "prop-skateboard"], f"Side tracking shot: {SEVEN} rides the black orange-wheeled skateboard down the long aisle of {HALL}, moving from left to right, full body, knees bent, jacket flaring behind her, cool calm face. Seated {CLERK} at the desks on both sides."),
 "s05": (["seven-a6-music", "hall-2-aisle", "clerk-2-desk"], f"Close-up of {SEVEN}, three-quarter view, eyes half closed, head tilted, quietly nodding to music in her headphones. Behind her, softly out of focus, a row of {CLERK} at their desks all stamping in perfect unison."),
 "s06": (["seven-a4-half", "hall-3-sort", "prop-capsule"], f"Medium shot at the sorting station of {HALL}: {SEVEN} catches a brass-capped glass capsule as it drops out of the pneumatic tube hatch, one-handed, already twisting it open with her thumb, practiced and casual."),
 "s07": (["prop-card-blank", "prop-capsule", "hall-3-sort"], f"Extreme close-up: a girl's hands (olive jacket sleeves with orange cuffs) hold an opened brass glass capsule, and a completely blank cream punch card with NO holes at all slides out of it into her palm, faintly glowing pale against the amber light of {HALL}."),
 "s08": (["hall-4-crt"], f"The giant wall of beige CRT monitors in {HALL}: the screens are turning from amber to alarming RED one after another in a wave from left to right, about half already red, a red rotating warning lamp on top. In front, rows of beige desks with the identical round beige Clerk androids (blank face plates, plain olive sleeves with NO patch, NO number, NO badge), NO humans at all. No readable text on any screen, only abstract red glow and scan lines."),
 "s09": (["seven-a2-back", "hall-2-aisle", "clerk-1-front"], f"Wide shot down the aisle of {HALL}: {SEVEN} stands in the center of the aisle seen from behind, small in frame; on both sides, all the {CLERK} have stopped and turned their blank faces toward her at the same time. The CRT screens glow red. Tense stillness."),
 "s10": (["seven-a7-surprise", "hall-3-sort", "prop-card-blank"], f"Medium close-up of {SEVEN} at the sorting station, holding the blank punch card (no holes) in both hands and looking down at it, eyes slightly widened in quiet surprise. Red light from screens behind her mixes with amber."),
 "s11": (["enf-a1-front", "hall-2-aisle"], f"Low-angle shot in the aisle of {HALL}: {ENF} has just landed from above, down on one knee in a graceful superhero landing, one hand on the floor, coat-tails settling, its white body has NO patch, NO number, NO markings, small shards of floor tile around. Red warning light. Elegant and menacing."),
 "s12": (["seven-a2-back", "hall-2-aisle", "enf-a1-front"], f"Dynamic chase shot from behind: {SEVEN} skates away from camera down a long corridor of tall olive archive shelves in {HALL}; behind her the shelves topple and shatter into thousands of white glowing particles like petals; far in the background {ENF} runs after her. Red and amber light."),
 "s13": (["seven-a3-skate", "hall-3-sort"], f"Side view: {SEVEN} leaps off her skateboard toward a huge round brass pneumatic tube opening at the end of the corridor in {HALL}, her body mid-air, being sucked in, hair and jacket pulled toward the dark opening with motion lines."),
 "s14": (["seven-a3-skate"], f"{SEVEN} flies feet-first through a tunnel made of glowing green wireframe vector grid lines on pure black, 1980s computer graphics style; her body is breaking apart into square green and orange pixels from the feet up, half of her still drawn normally."),
 "s14e": (["seven-a3-skate"], f"{SEVEN} flies through a tunnel made of glowing green wireframe vector grid lines on pure black, 1980s computer graphics style; her body is fully reassembled and drawn normally, a few last green pixels drifting off her, calm face."),
 "s15": (["seven-a1-front"], f"{SEVEN} falls and flips upside down through a vast black space full of vertical cascading waterfalls of green ASCII glyphs (abstract symbols, slashes, dots, brackets, no words), her jacket fluttering, calm face, full body, dramatic diagonal composition."),
 "s16": (["seven-a1-front", "white-1-door"], f"Wide shot of the vast white space with the glowing particle door, exactly as in its reference: {SEVEN} has just landed, small in frame on the left, crouching from the landing on the white floor, facing the particle door in the distance."),
 "s17": (["pair-height", "white-2-side", "seven-a5-calm"], f"Side view standoff in the vast white space, as in its reference: {SEVEN} stands on the LEFT facing right, {ENF} stands on the RIGHT facing left, in front of the particle door, several meters apart, their heights as in the height reference. Silent tension, wide shot."),
 "s18": (["seven-a4-half", "enf-a2-visor", "white-2-side"], f"Medium two-shot in the white space: {SEVEN} on the LEFT has taken off her headphones and holds them out with one hand toward {ENF} on the RIGHT, calmly, an offer not a threat. The Enforcer's black visor looks down at the headphones."),
 "s19": (["enf-b1-visor", "white-2-side"], f"Close-up of {ENF_B}, three-quarter view, in the white space: its hands are just lowering from placing the headphones on, and for the first time a soft glowing orange audio waveform line appears across the black visor. Its white shoulders have NO patch, NO number, NO markings."),
 "s20": (["enf-b1-visor", "white-1-door", "seven-b1-half"], f"Frontal wide shot of the white space: {ENF_B}, a soft orange waveform on its visor, stands still directly in front of the particle door, blocking it; in the foreground on the left, seen from behind and slightly cut by the frame, is {SEVEN_B}."),
 "s20e": (["enf-b2-side", "white-1-door", "seven-b1-half"], f"Same frontal wide shot of the white space: {ENF_B} has stepped aside to the right and stands in side view facing left, revealing the glowing particle door; in the foreground on the left, seen from behind and slightly cut by the frame, is {SEVEN_B}."),
 "s21": (["seven-a8-smile", "white-1-door", "prop-card-blank"], f"Close-up of {SEVEN_B}, three-quarter profile, sliding the blank punch card into a slit of the glowing particle door; white light from the door bathes her face, and the corner of her mouth lifts in a faint small smile."),
 "s21e": (["white-1-door"], "No people, no figures at all. The glowing particle door bursts open into pure white light filling almost the entire frame, a few particles flying outward, flat anime light rays."),
 "s22": (["seven-b2-back", "roof-1-sunrise"], f"Wide shot from behind: {SEVEN_B} stands at the very edge of the rooftop of the enormous building above the sea of clouds, exactly the location in its reference, facing the rising sun, full body seen from behind, wind blowing her jacket and hair to one side."),
 "s23": (["seven-b1-half", "prop-card-hole", "roof-1-sunrise"], f"Extreme close-up: the girl's hands (olive jacket sleeves with orange cuffs) hold the cream punch card and push the small silver safety pin from her jacket through it, making exactly ONE small hole near the top-left corner; warm golden sunrise light, blurred sky and clouds behind."),
 "s24": (["seven-b2-back", "enf-b3-back", "roof-2-wide"], f"Very wide side shot of the long rooftop above the clouds, exactly as in its reference, toward the rising sun: tiny in frame, {SEVEN_B} walks toward the horizon, and {ENF_B} follows half a step behind her. Both seen from behind at a slight angle. Hopeful, open sky."),
}


def run(name, suffix):
    refs, prompt = SHOTS[name]
    out = f"{name}-{suffix}" if suffix else name
    imgs = []
    for r in refs:
        imgs += ["--image", str(LOCK / f"{r}.png")]
    labels = " ".join(f"Image {i+1} is the reference for {r}." for i, r in enumerate(refs))
    cmd = [str(ROOT / "bin/cr-image"), "--model", "gpt-image-2.5-flare", "--size", "1536x1024",
           "--out", str(ROOT / "kf"), "--name", out, "--timeout", "900", *imgs,
           "--prompt", f"{labels} {STYLE} {prompt}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        info = json.loads(last)
    except json.JSONDecodeError:
        info = {"status": "error", "stderr": r.stderr[-300:]}
    src = ROOT / f"kf/{out}-0.png"
    if info.get("status") == "completed" and src.exists():
        im = Image.open(src)
        h = im.width * 9 // 16
        top = (im.height - h) // 2
        im.crop((0, top, im.width, top + h)).save(ROOT / f"kf/{out}-169.png")
    return name, info.get("status"), info.get("waited_s")


if __name__ == "__main__":
    args = sys.argv[1:]
    suffix = ""
    if args[:1] == ["--suffix"]:
        suffix, args = args[1], args[2:]
    names = args or list(SHOTS)
    with ThreadPoolExecutor(max_workers=10) as ex:
        for res in ex.map(lambda n: run(n, suffix), names):
            print(*res, flush=True)
