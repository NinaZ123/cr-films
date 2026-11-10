"""ElevenLabs 配音：每句一个 mp3，已经有的不重新生成（省额度）。

用法：python3 scripts/tts.py [--en] [--only 句号,句号] [--dry]
--en：英文配音（script_en.py），输出到 audio_en/；英文按字符 1:1 计费。
key 读仓库根目录 .env.local 的 ELEVENLABS_API_KEY。
输出：audio/NNN.mp3 + audio/NNN.json（请求参数和用量）。
"""
import json, os, sys, urllib.request, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from script import LINES
EN = "--en" in sys.argv
if EN:
    from script_en import EN as EN_LINES
    LINES = [(l[0], l[1], l[2], e) for l, (_, e) in zip(LINES, EN_LINES)]

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parents[1]
OUT = HERE / ("audio_en" if EN else "audio")
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in (ROOT / ".env.local").read_text().splitlines()
           if l.startswith("ELEVENLABS_API_KEY="))

VOICE = "Xb7hH8MSUJpSbSDYk0k2"   # Alice - Clear, Engaging Educator（多语种模型下念中文）
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 1.0 if EN else 1.1}
CAP = 10000  # 用户要求：总用量不超过这个数


def used():
    req = urllib.request.Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": KEY})
    return json.load(urllib.request.urlopen(req))["character_count"]


def say(i, text):
    mp3 = OUT / f"{i:03d}.mp3"
    if mp3.exists():
        return False
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    mp3.write_bytes(urllib.request.urlopen(req).read())
    (OUT / f"{i:03d}.json").write_text(json.dumps(
        {"voice": VOICE, "model": MODEL, "settings": SETTINGS, "text": text, "chars": len(text)},
        ensure_ascii=False, indent=1))
    return True


def main():
    OUT.mkdir(exist_ok=True)
    only = None
    if "--only" in sys.argv:
        only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
    todo = [(i, l[3]) for i, l in enumerate(LINES) if (only is None or i in only) and not (OUT / f"{i:03d}.mp3").exists()]
    need = sum(len(x) for _, x in todo)
    now = used()
    print(f"已用 {now}，这次要生成 {len(todo)} 句 {need} 字，生成后约 {now + need} / {CAP}")
    if now + need > CAP:
        sys.exit("会超过上限，停下")
    if "--dry" in sys.argv:
        return
    for i, text in todo:
        say(i, text)
        print("ok", i, len(text), flush=True)
    print("实际已用", used())


if __name__ == "__main__":
    main()
