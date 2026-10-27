// 纯器乐版音乐：用 prompt 模式 + forceInstrumental，保证没有人声。
//   node --env-file=../../.env.local scripts/gen-music-inst.mjs <版本名>
// 为什么不用 gen-music.mjs 的 composition plan：plan 模式下每段 text 会被当成歌词，
// 模型会用很轻的人声把它念出来（b-full、b、drop 都中招，听着像背景里有别人在说话）。
// forceInstrumental 只在 prompt 模式下可用。
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../../audio");
const TAKES = {
  // 前半段：替换 music-b-full。0–5s 很安静，5s 左右一记重低音冲击（主标），之后克制的律动
  intro: {
    ms: 12000,
    prompt: "Instrumental cinematic trailer music. Starts almost silent: a very soft, low dark drone and faint heartbeat thumps for the first 5 seconds, quiet and tense. Then a sudden huge trailer impact boom with deep sub bass, followed by two more heavy impact hits, then a dark sustained synth chord that rings out and slowly fades. Dark, powerful, premium. No vocals, no voice, no speech.",
  },
  // 炸：替换 music-drop。前 3 秒几乎静音 + 反向镲，3 秒处满能量 drop
  drop: {
    ms: 12000,
    prompt: "Instrumental high-energy electronic, 128 BPM. First 3 seconds: near silence with a single short reversed cymbal swell building up. At exactly 3 seconds: an explosive full-energy drop hitting hard on the first beat, massive kick and heavy sub bass, huge wide synth stabs, festival energy, bright and confident. Ends with one final massive hit and a short reverb tail. No vocals, no voice, no speech.",
  },
  // 产品章节底：克制、干净、有一点律动，不抢对白
  bed: {
    ms: 30000,
    prompt: "Instrumental minimal modern electronic, 110 BPM, restrained and clean: soft muted pulse, gentle plucked synth arpeggio, light hi-hats, warm pads, no lead melody, sparse and quiet throughout, premium product film background. No vocals, no voice, no speech.",
  },
  // 收尾：从中等能量推到最后一记大冲击，再留一个短尾
  finale: {
    ms: 14000,
    prompt: "Instrumental cinematic electronic finale, 124 BPM. Starts with confident driving drums and wide synths, builds quickly with a rising sweep, and at 9 seconds lands one huge final impact hit with deep sub bass, then a short reverb tail and silence. Triumphant, premium tech launch. No vocals, no voice, no speech.",
  },
};

const take = process.argv[2];
if (!TAKES[take]) { console.error(`用法: node --env-file=../../.env.local scripts/gen-music-inst.mjs <${Object.keys(TAKES).join("|")}>`); process.exit(2); }
const { ms, prompt } = TAKES[take];
const client = new ElevenLabsClient();
const audio = await client.music.compose({ prompt, musicLengthMs: ms, modelId: "music_v2_5", forceInstrumental: true });
const chunks = [];
for await (const c of audio) chunks.push(c);
const file = path.join(OUT, `music-inst-${take}.mp3`);
fs.writeFileSync(file, Buffer.concat(chunks));
fs.writeFileSync(path.join(OUT, `music-inst-${take}.json`), JSON.stringify({ model: "music_v2_5", forceInstrumental: true, prompt, musicLengthMs: ms }, null, 2));
console.log(JSON.stringify({ take, file, bytes: fs.statSync(file).size }));
