"""转写歌词并给出每个词的时间：python -I scripts/asr.py audio/el/el-01.mp3 > work/el-01-words.json
用 ffmpeg 先解成 16k 单声道再喂进去（faster-whisper 自带的 av 解码和这个版本的 PyAV 不兼容）。"""
import sys, json, subprocess
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
segs, _ = m.transcribe(np.frombuffer(pcm, np.float32), word_timestamps=True, vad_filter=False, beam_size=5)
out = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}", file=sys.stderr)
    out += [{"w": w.word.strip(), "t0": round(w.start, 2), "t1": round(w.end, 2)} for w in s.words]
print(json.dumps(out))
