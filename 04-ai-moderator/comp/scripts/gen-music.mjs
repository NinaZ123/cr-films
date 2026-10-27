// 04 开场样片的背景音乐：ElevenLabs music_v2_5，按段落写 composition plan。
// key 由 ElevenLabs CLI 写在仓库根目录 .env.local，运行时用 node --env-file 读进来：
//   node --env-file=../../.env.local scripts/gen-music.mjs <版本名>
// 每个版本出一个 mp3 和一个 json（请求参数和元数据），放在 ../audio/。
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../../audio");
fs.mkdirSync(OUT, { recursive: true });

// 时间轴对应脚本 v6 开场：0–3.5s 真实访谈下铺一层安静的脉冲，3.5s 起三拍重鼓砸主标，
// 7s 小幽灵像素炸开出 logo，之后进入能力段，持续往上推。
const BASE_NEG = ["vocals", "lyrics", "lo-fi", "acoustic guitar", "orchestral", "cheesy", "corporate ukulele"];
const TAKES = {
  // A：极简科技脉冲，Apple 发布会式的克制
  a: [
    { text: "[Intro]\nQuiet low sub pulse and a soft ticking hi-hat, sparse, suspenseful, tension rising toward a drop", duration_ms: 3500,
      positive_styles: ["minimal electronic", "premium tech launch film", "deep sub bass pulse", "crisp clean synths", "cinematic", "instrumental", "118 BPM"] },
    { text: "[Drop]\nBig impact hit on the downbeat, then a confident steady groove with wide warm pads", duration_ms: 6500,
      positive_styles: ["punchy kick", "wide analog pads", "confident", "spacious"] },
    { text: "[Build]\nDriving rhythm, plucky arpeggio, building energy, bright and modern", duration_ms: 10000,
      positive_styles: ["driving beat", "plucky synth arpeggio", "uplifting", "building"] },
  ],
  // B：更暗、更有压迫感，PASSED 处更狠
  b: [
    { text: "[Intro]\nDark ambient drone with heartbeat-like low thumps, tense, building suspense", duration_ms: 3500,
      positive_styles: ["dark cinematic electronic", "tension", "sub bass", "heartbeat pulse", "trailer sound design", "instrumental", "120 BPM"] },
    { text: "[Drop]\nMassive cinematic boom on the downbeat, then a heavy half-time groove with gritty bass", duration_ms: 6500,
      positive_styles: ["huge impact", "gritty synth bass", "half-time drums", "powerful"] },
    { text: "[Build]\nDrums open up to full tempo, energetic, triumphant, futuristic", duration_ms: 10000,
      positive_styles: ["energetic drums", "futuristic synths", "triumphant", "rising"] },
  ],
  // B-full：用户选定 B 的风格，按全片 51 秒的结构重写（对白多的段落压低能量，片尾推满）
  "b-full": [
    { text: "[Intro]\nDark ambient drone with heartbeat-like low thumps under dialogue, tense, sparse, leaving room for speech", duration_ms: 4600,
      positive_styles: ["dark cinematic electronic", "tension", "sub bass", "heartbeat pulse", "trailer sound design", "instrumental", "120 BPM"] },
    { text: "[Drop]\nMassive cinematic boom on the downbeat, three heavy hits, then a wide sustained chord", duration_ms: 5800,
      positive_styles: ["huge impact", "gritty synth bass", "half-time drums", "powerful"] },
    { text: "[Verse]\nLow, steady, minimal pulse under spoken dialogue, restrained, no lead melody, soft hi-hats", duration_ms: 14600,
      positive_styles: ["minimal", "restrained", "under dialogue", "soft pulse"] },
    { text: "[Verse 2]\nSame groove continues slightly fuller, gentle arpeggio enters, still quiet enough for dialogue", duration_ms: 20000,
      positive_styles: ["subtle arpeggio", "building slowly", "restrained", "under dialogue"] },
    { text: "[Finale]\nDrums open up to full tempo, triumphant, futuristic, big final hit and short tail", duration_ms: 6000,
      positive_styles: ["energetic drums", "futuristic synths", "triumphant", "final hit"] },
  ],
  // C：明亮、带点 8-bit 质感，呼应像素小幽灵
  c: [
    { text: "[Intro]\nSoft glitchy 8-bit blips over a quiet pulse, curious, anticipation", duration_ms: 3500,
      positive_styles: ["modern electronic", "subtle chiptune textures", "glitch", "playful but premium", "clean mix", "instrumental", "120 BPM"] },
    { text: "[Drop]\nBright impact and a bouncy confident groove, chiptune lead layered over modern drums", duration_ms: 6500,
      positive_styles: ["punchy drums", "chiptune lead", "bouncy bass", "confident"] },
    { text: "[Build]\nFull energy, catchy arpeggios, uplifting launch moment", duration_ms: 10000,
      positive_styles: ["uplifting", "catchy arpeggio", "driving", "bright"] },
  ],
};

const take = process.argv[2];
if (!TAKES[take]) {
  console.error(`用法: node --env-file=../../.env.local scripts/gen-music.mjs <${Object.keys(TAKES).join("|")}>`);
  process.exit(2);
}

const compositionPlan = {
  // JS SDK 要驼峰写法（skill 里的 TypeScript 示例也是这样）
  chunks: TAKES[take].map((c) => ({
    text: c.text, durationMs: c.duration_ms, positiveStyles: c.positive_styles,
    negativeStyles: BASE_NEG, contextAdherence: "high",
  })),
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
