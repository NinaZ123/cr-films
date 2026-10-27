// 全片时间轴和对白数据，唯一真相源（brand-hero-video skill 的 script.ts 做法）。
// 对白都是真实访谈原声（ElevenLabs Voice Isolator 清理过），逐词时间来自 faster-whisper。
// 剪辑跟着对白走：每句话从 at 秒开始播，界面上的逐字稿按 words 的时间一个词一个词出来。

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

export type Word = [string, number]; // [词, 相对本句开头的秒数]
export type Line = {
  id: string;            // public/vo/<id>.mp3
  who: "mod" | "p";      // 主持人 / 受访者
  at: number;            // 在全片里的开始时间（秒）
  dur: number;           // 播多久（秒）
  from?: number;         // 从音频第几秒开始播
  words: Word[];
  key?: string[];        // 字幕里要高亮的词
};

// "词@秒 词@秒 …"；shift 把所有时间减掉一个起点（配合 from 用）
const w = (str: string, shift = 0): Word[] =>
  str.split(" ").map((t) => { const [word, at] = t.split("@"); return [word, Math.max(0, Number(at) - shift)]; });

// ---------- 段落（秒） ----------
export const SEG = {
  cold: [0, 5.37],       // 一通访谈，不露 AI
  title: [5.37, 8.6],    // 主标三拍
  logo: [8.6, 10.6],     // 小幽灵 → logo
  qual: [10.6, 25.2],    // 能力一：定性深访
  hc: [25.2, 46.15],     // 能力二：产品体验测试 · 护手霜
  outro: [46.15, 51.0],  // 收尾
} as const;
export const TOTAL = s(51);

// 主标三拍（秒）。第一拍对准 music-b-full 实测的 drop（5.37s），后两拍隔 0.66s（120 BPM 的 1⅓ 拍）
export const HIT = [5.37, 6.03, 6.69];
// 片尾大鼓（music-b-full 实测 46.15s），收尾 logo 落在这一下
export const FINAL_HIT = 46.15;

// ---------- 对白 ----------
export const LINES: Line[] = [
  // 冷开场：主持人追问 → 她回答
  { id: "q1", who: "mod", at: 0.4, dur: 4.4, words: w("When@0.00 you@0.18 mentioned@0.30 using@0.56 a@0.88 heavy@1.06 cream@1.26 to@1.72 reduce@1.88 the@2.18 pain,@2.36 what@3.10 did@3.34 that@3.46 feel@3.58 like@3.80 on@4.02 your@4.16 skin?@4.26") },

  // 能力一：定性深访（耳机这场）
  // 他说"part of the outfit" → 主持人抓住这个词追问 → 他说复古 → 他没听懂下一题 → 主持人道歉、换个问法
  { id: "a6", who: "p", at: 11.6, dur: 3.2, from: 0.3, words: w("the@0.20 third@0.40 purpose@0.72 actually@1.18 is@1.64 part@2.34 of@2.62 the@2.84 outfit.@3.06", 0.3), key: ["outfit."] },
  { id: "q6", who: "mod", at: 14.8, dur: 3.1, words: w("You@0.00 mentioned@0.14 them@0.36 being@0.58 part@0.78 of@1.06 the@1.18 outfit.@1.24 What@2.18 makes@2.36 you@2.52 say@2.64 that?@2.82"), key: ["outfit."] },
  { id: "a8", who: "p", at: 18.2, dur: 2.7, from: 1.9, words: w("I@1.94 didn't@2.10 really@2.42 understand@2.60 the@3.08 question.@3.34", 1.9), key: ["understand"] },
  { id: "q8", who: "mod", at: 21.0, dur: 4.0, words: w("Sorry@0.00 about@0.60 that.@0.80 I@1.54 just@1.68 meant@1.82 as@2.02 you@2.34 keep@2.44 them@2.68 on@2.86 for@3.00 a@3.22 few@3.32 minutes…@3.42"), key: ["Sorry"] },

  // 能力二：产品体验测试（护手霜）
  { id: "q2", who: "mod", at: 27.2, dur: 2.7, words: w("Let's@0.00 try@0.32 this@0.42 one.@0.60 Go@1.12 ahead@1.24 and@1.40 put@1.52 some@1.62 of@1.78 the@1.86 cream@1.92 on@2.12 your@2.30 hand.@2.40") },
  { id: "a4", who: "p", at: 30.6, dur: 1.8, from: 0.8, words: w("It@0.84 absorbs@0.96 really@1.26 quickly.@1.72", 0.8), key: ["absorbs", "quickly."] },
  { id: "q4", who: "mod", at: 32.5, dur: 5.3, words: w("You@0.00 mentioned@0.58 it@0.86 absorbs@1.04 really@1.38 quickly.@1.98 When@2.96 you@3.02 say@3.16 that,@3.40 what@4.00 are@4.40 you@4.46 comparing@4.54 it@4.92 with?@5.14"), key: ["comparing"] },
  { id: "a9", who: "p", at: 38.0, dur: 4.6, words: w("comparing@0.00 with@0.54 the@0.86 old@1.54 very@2.14 heavy@2.82 hand@3.22 cream@3.84 I@4.06 used@4.30 this@4.62 winter.@4.80"), key: ["heavy"] },
  { id: "a10", who: "p", at: 42.6, dur: 2.3, words: w("I@0.12 need@0.20 to@0.38 type@0.60 on@0.90 my@1.06 keyboard@1.20 to@1.50 do@1.76 my@1.90 work.@2.04"), key: ["keyboard"] },
];

// 洞察卡：访谈结束时从原话里提炼出来
export const INSIGHTS = {
  qual: ["Headphones = part of the outfit", "Vintage look matters as much as sound"],
  hc: ["Absorbs fast vs. heavy winter creams", "Not sticky — can type right after"],
};

// 访谈计时器：画面角落一直在走，表示是长时间、实时的访谈
export const CLOCK_START = 23 * 60 + 41;
