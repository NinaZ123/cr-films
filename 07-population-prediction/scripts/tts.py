"""ElevenLabs 英文男声配音：每句一个 audio/NNN.mp3，已有的跳过。
用法：python3 scripts/tts.py [--only 3,4] [--dry]
key：仓库根目录 .env.local 的 ELEVENLABS_API_KEY。总用量上限 10000（Nina 定的）。
"""
import json, os, sys, urllib.request, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from script import LINES

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(__file__).resolve().parents[1] / "audio"
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in (ROOT / ".env.local").read_text().splitlines()
           if l.startswith("ELEVENLABS_API_KEY="))
VOICE = "onwK4e9ZLuTAKqWW03F9"   # Daniel - Steady Broadcaster（英文男声）
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.55, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 1.0}
CAP = 10000

def used():
    r = urllib.request.Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": KEY})
    return json.load(urllib.request.urlopen(r))["character_count"]

def main():
    OUT.mkdir(exist_ok=True)
    only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")} if "--only" in sys.argv else None
    todo = [(i, l[2]) for i, l in enumerate(LINES) if (only is None or i in only) and not (OUT / f"{i:03d}.mp3").exists()]
    need, now = sum(len(x) for _, x in todo), used()
    print(f"已用 {now}，这次 {len(todo)} 句 {need} 字符，之后约 {now + need} / {CAP}")
    if now + need > CAP: sys.exit("会超过上限，停下")
    if "--dry" in sys.argv: return
    for i, text in todo:
        body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
        r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
                                   data=body, headers={"xi-api-key": KEY, "Content-Type": "application/json"})
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(r, timeout=120).read(); break
            except Exception as e:
                print("retry", i, e, flush=True); import time; time.sleep(3 * (attempt + 1))
        else:
            sys.exit(f"第 {i} 句四次都失败")
        (OUT / f"{i:03d}.mp3").write_bytes(data)
        (OUT / f"{i:03d}.json").write_text(json.dumps({"voice": VOICE, "model": MODEL, "settings": SETTINGS, "text": text}, ensure_ascii=False, indent=1))
        print("ok", i, len(text), flush=True)

if __name__ == "__main__":
    main()
