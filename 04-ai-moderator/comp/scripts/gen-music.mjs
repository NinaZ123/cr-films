// 04 开场样片的背景音乐：ElevenLabs music_v2_5，按段落写 composition plan。
// key 由 ElevenLabs CLI 写在仓库根目录 .env.local，运行时用 node --env-file 读进来：
//   node --env-file=../../.env.local scripts/gen-music.mjs <版本名>
// 每个版本出一个 mp3 和一个 json（请求参数和元数据），放在 ../audio/。
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../../audio");
fs.mkdirSync(OUT, { recursive: true });

// 时间轴对应样片脚本 v3：0–2.5s 冷开场，2.5–4s 信号靠拢，4s 是 PASSED 的 drop，
// 5–11s 慢速大字和 logo，11–14s 三拍证明，14–20s 产品章节。
const BASE_NEG = ["vocals", "lyrics", "lo-fi", "acoustic guitar", "orchestral", "cheesy", "corporate ukulele"];
const TAKES = {
  // A：极简科技脉冲，Apple 发布会式的克制
  a: [
    { text: "[Intro]\nQuiet low sub pulse and a soft ticking hi-hat, sparse, suspenseful, tension rising toward a drop", duration_ms: 4000,
      positive_styles: ["minimal electronic", "premium tech launch film", "deep sub bass pulse", "crisp clean synths", "cinematic", "instrumental", "118 BPM"] },
    { text: "[Drop]\nBig impact hit on the downbeat, then a confident steady groove with wide warm pads", duration_ms: 7000,
      positive_styles: ["punchy kick", "wide analog pads", "confident", "spacious"] },
    { text: "[Build]\nDriving rhythm, plucky arpeggio, building energy, bright and modern", duration_ms: 9000,
      positive_styles: ["driving beat", "plucky synth arpeggio", "uplifting", "building"] },
  ],
  // B：更暗、更有压迫感，PASSED 处更狠
  b: [
    { text: "[Intro]\nDark ambient drone with heartbeat-like low thumps, tense, building suspense", duration_ms: 4000,
      positive_styles: ["dark cinematic electronic", "tension", "sub bass", "heartbeat pulse", "trailer sound design", "instrumental", "120 BPM"] },
    { text: "[Drop]\nMassive cinematic boom on the downbeat, then a heavy half-time groove with gritty bass", duration_ms: 7000,
      positive_styles: ["huge impact", "gritty synth bass", "half-time drums", "powerful"] },
    { text: "[Build]\nDrums open up to full tempo, energetic, triumphant, futuristic", duration_ms: 9000,
      positive_styles: ["energetic drums", "futuristic synths", "triumphant", "rising"] },
  ],
  // C：明亮、带点 8-bit 质感，呼应像素小幽灵
  c: [
    { text: "[Intro]\nSoft glitchy 8-bit blips over a quiet pulse, curious, anticipation", duration_ms: 4000,
      positive_styles: ["modern electronic", "subtle chiptune textures", "glitch", "playful but premium", "clean mix", "instrumental", "120 BPM"] },
    { text: "[Drop]\nBright impact and a bouncy confident groove, chiptune lead layered over modern drums", duration_ms: 7000,
      positive_styles: ["punchy drums", "chiptune lead", "bouncy bass", "confident"] },
    { text: "[Build]\nFull energy, catchy arpeggios, uplifting launch moment", duration_ms: 9000,
      positive_styles: ["uplifting", "catchy arpeggio", "driving", "bright"] },
  ],
};

const take = process.argv[2];
if (!TAKES[take]) {
  console.error(`用法: node --env-file=../../.env.local scripts/gen-music.mjs <${Object.keys(TAKES).join("|")}>`);
  process.exit(2);
}

const compositionPlan = {
  chunks: TAKES[take].map((c) => ({ ...c, negative_styles: BASE_NEG, context_adherence: "high" })),
};

const client = new ElevenLabsClient();
const t0 = Date.now();
const audio = await client.music.compose({ compositionPlan, modelId: "music_v2_5" });
const chunks = [];
for await (const c of audio) chunks.push(c);
const file = path.join(OUT, `music-${take}.mp3`);
fs.writeFileSync(file, Buffer.concat(chunks));
fs.writeFileSync(path.join(OUT, `music-${take}.json`), JSON.stringify({
  model: "music_v2_5", compositionPlan, seconds: (Date.now() - t0) / 1000, file: path.basename(file),
}, null, 2));
console.log(JSON.stringify({ take, file, bytes: fs.statSync(file).size }));
