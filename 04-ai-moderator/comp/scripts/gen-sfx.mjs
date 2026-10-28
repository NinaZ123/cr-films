// 音效：ElevenLabs text-to-sound-effects。
//   node --env-file=../../.env.local scripts/gen-sfx.mjs
// 输出 ../public/sfx/<name>.mp3，参数和用量记录在 ../../audio/sfx/<name>.json
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../public/sfx");
const LOG = path.resolve(import.meta.dirname, "../../audio/sfx");
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(LOG, { recursive: true });

const CUES = {
  // 冷开场下面的底：安静、暗、有一点心跳感，可循环
  bed: { text: "Very quiet dark cinematic ambient drone with soft low heartbeat pulse, tense, sparse, no melody", duration_seconds: 6, prompt_influence: 0.5, loop: true },
  // 主标三拍，每拍一记
  hit: { text: "Huge cinematic trailer impact boom, deep sub bass hit with a short metallic tail", duration_seconds: 1.6, prompt_influence: 0.6 },
  // 主标最后一拍后的长尾
  tail: { text: "Dark sustained synth drone swelling then slowly fading out, cinematic, ominous", duration_seconds: 3.5, prompt_influence: 0.5 },
  // 小幽灵 logo 出现
  whoosh: { text: "Fast clean cinematic whoosh transition, airy, modern", duration_seconds: 0.8, prompt_influence: 0.6 },
  tick: { text: "Soft digital UI click tick, subtle, clean", duration_seconds: 0.5,   // 接口最短 0.5 秒
    prompt_influence: 0.7 },
  // 片头：logo 翻转时的"唰"，落定时一声干净的低频定音
  flip: { text: "Quick sleek swoosh of a logo flipping in 3D, modern tech brand intro, clean", duration_seconds: 0.8, prompt_influence: 0.6 },
  sting: { text: "Clean modern tech brand logo sting: one deep warm sub impact with a bright shimmering digital chime on top, short tail", duration_seconds: 2.5, prompt_influence: 0.6 },
  ghost: { text: "Short retro 8-bit digital chime, bright and clean, video game power up", duration_seconds: 1.0, prompt_influence: 0.6 },
};

const client = new ElevenLabsClient();
const only = process.argv.slice(2);
await Promise.all(Object.entries(CUES).filter(([n]) => !only.length || only.includes(n)).map(async ([name, c]) => {
  const audio = await client.textToSoundEffects.convert({
    text: c.text, durationSeconds: c.duration_seconds, promptInfluence: c.prompt_influence, loop: c.loop,
  });
  const chunks = [];
  for await (const ch of audio) chunks.push(ch);
  fs.writeFileSync(path.join(OUT, `${name}.mp3`), Buffer.concat(chunks));
  fs.writeFileSync(path.join(LOG, `${name}.json`), JSON.stringify({ model: "eleven_text_to_sound_v2", ...c }, null, 2));
  console.log(name);
}));
