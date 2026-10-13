"""歌：ElevenLabs 音乐模型按歌词生成整首歌（music_v1 + composition_plan）。

用法：python scripts/song_el.py <名字>
key 读自仓库根目录 .env 的 ELEVENLABS_API_KEY（.env 已 gitignore，模板见 .env.example）。
输出 audio/el/<名字>.mp3 和 <名字>.json（请求体，不含 key）。
"""
import json, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT.parent / ".env"
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in ENV.read_text().splitlines() if l.startswith("ELEVENLABS_API_KEY="))

# 故事：所有人按时间表走，只有他戴着耳机听自己的歌；空白卡 = 没被安排的时间，是他自己的。
# 120 BPM，一小节 2 秒，段落都按整小节。
PLAN = {
 "positive_global_styles": ["minimal electro-pop", "120 BPM", "dry tight drum machine", "ticking clock hi-hat",
                            "deep warm sub bass", "young male vocalist, soft clear voice", "clear English diction",
                            "catchy", "clean modern mix"],
 "negative_global_styles": ["heavy reverb", "echo", "orchestral", "rock guitar", "rap", "female vocals"],
 "sections": [
  {"section_name": "Intro", "duration_ms": 8000, "lines": [],
   "positive_local_styles": ["instrumental", "only ticking clock and a soft synth pulse", "builds into the beat"],
   "negative_local_styles": ["vocals"]},
  {"section_name": "Verse", "duration_ms": 16000,
   "lines": ["Seven o'clock, everybody in line,", "punch the card, right on time.",
             "Same green face on every head,", "doing what the schedule said."],
   "positive_local_styles": ["deadpan half-spoken vocal", "mechanical, on the grid", "sparse"], "negative_local_styles": []},
  {"section_name": "Pre-Chorus", "duration_ms": 8000,
   "lines": ["But I got my headphones on,", "playing my own song."],
   "positive_local_styles": ["melody opens up", "rising", "drums drop out on the last bar"], "negative_local_styles": []},
  {"section_name": "Chorus", "duration_ms": 16000,
   "lines": ["Blank card, blank card,", "nothing written on it.", "Blank card, blank card,", "this time is mine."],
   "positive_local_styles": ["full beat", "big catchy sung hook", "bright synth lead", "joyful"], "negative_local_styles": []},
  {"section_name": "Outro", "duration_ms": 12000,
   "lines": ["No schedule.", "Blank card."],
   "positive_local_styles": ["beat strips back", "last line sung softly", "song ends cleanly on a final chord that fades naturally"],
   "negative_local_styles": ["abrupt cut", "echo"]},
 ],
}

name = sys.argv[1]
body = {"composition_plan": PLAN, "model_id": "music_v1", "output_format": "mp3_44100_192"}
(ROOT / f"audio/el/{name}.json").write_text(json.dumps(body, ensure_ascii=False, indent=1))
req = urllib.request.Request("https://api.elevenlabs.io/v1/music", data=json.dumps(body).encode(),
                             headers={"xi-api-key": KEY, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=600) as r:
        data = r.read()
        (ROOT / f"audio/el/{name}.mp3").write_bytes(data)
        print("ok", name, len(data), "bytes", {k: v for k, v in r.headers.items() if k.lower().startswith(("x-", "song", "character"))})
except urllib.error.HTTPError as e:
    print("http", e.code, e.read()[:600].decode(errors="replace"))
    sys.exit(1)
