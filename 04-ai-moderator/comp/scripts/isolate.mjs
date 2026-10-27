// 用 ElevenLabs Voice Isolator 清理访谈原声：去底噪和房间混响，再统一响度。
//   node --env-file=../../.env.local scripts/isolate.mjs
// 读 ../audio/raw/*.wav（或环境变量 RAW_DIR），写 ../public/vo/<name>.mp3（已清理）。
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAW = process.env.RAW_DIR || path.resolve(import.meta.dirname, "../../audio/raw");
const OUT = path.resolve(import.meta.dirname, "../public/vo");
fs.mkdirSync(OUT, { recursive: true });

const client = new ElevenLabsClient();
const names = fs.readdirSync(RAW).filter((f) => f.endsWith(".wav")).map((f) => f.replace(/\.wav$/, ""));

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

await Promise.all(names.map(async (n) => {
  const iso = path.join(OUT, `${n}.iso.mp3`);
  // 接口要求至少 4.6 秒：短的先在尾部补静音到 5 秒，清理完再截回原长
  const src = path.join(RAW, `${n}.wav`);
  const len = dur(src);
  const pad = path.join(OUT, `${n}.pad.wav`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", "apad=whole_dur=5", pad]);
  const stream = await client.audioIsolation.convert({ audio: fs.createReadStream(pad) });
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  fs.writeFileSync(iso, Buffer.concat(chunks));
  // 对白统一到 -16 LUFS（音乐另外压在下面）
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", iso, "-t", String(len), "-af", "loudnorm=I=-16:TP=-2:LRA=7", "-ar", "44100", path.join(OUT, `${n}.mp3`)]);
  fs.rmSync(iso);
  fs.rmSync(pad);
  console.log(n);
}));
