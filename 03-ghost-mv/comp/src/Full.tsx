// 60 秒完整版。歌是 ElevenLabs 生成的 el-01（109.8 BPM），时间轴全部用秒写，
// 剪点放在 work/el-01-words.json 量出来的词和拍上。
//
// 视觉母题：打孔卡上的"孔"。
//   前奏：一张卡，每拍打一个孔 → 最后一个孔放大，变成第一个镜头的画框（孔转场）。
//   主歌：别人都按卡走，转场用"打孔"——黑方块一闪，下一个镜头从方孔里长出来。
//   过渡句：他戴上耳机，画面过曝成白，按耳机的特写从白里浮出来（白闪叠化）。
//   副歌：节奏放开，用动作接动作（跳起→落地、走出队列）；卡片标注从 ON SCHEDULE 翻成 UNSCHEDULED。
//   尾声：暖光，他坐在空地上，一张空白卡，只剩一个孔——结尾的孔和开头的孔是同一个。
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import DUR from "./durations.json";
import BM from "./beatmap.json";
import { PunchCard, FlipBoard, Label, BigWord, Viewfinder, Grain, Halftone, GREEN } from "./Overlays";

export const FPS = 24;
const s = (t: number) => Math.round(t * FPS);
// 音画对齐：所有时间先吸到实测的拍上（scripts/beatmap.py 量出来的 beatmap.json），再换成帧。
// 剪点、打孔、大字、字幕都走 at()，不直接用手填的秒数。
const BEATS: number[] = BM.beats;
const at = (t: number) => BEATS.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), BEATS[0]);
const S = (t: number) => s(at(t));
// 当前是第几拍（真实拍点，不是等距网格）
const beatIndex = (t: number) => { let i = -1; while (i + 1 < BEATS.length && BEATS[i + 1] <= t) i++; return i; };
export const FULL_TOTAL = s(60);

// 镜头：片段、入点秒、出点秒、片段内起始秒、进场转场
type Tr = "cut" | "hole" | "punch" | "white" | "dissolve";
// 片段来源：默认 vid/mm/<镜头>.mp4（minimax）；这里列出的用 vid/<镜头>.mp4（kling）
const SRC = "mm";
const KLING = ["n03-v1"];
const path = (clip: string) => (KLING.includes(clip) ? clip : `${SRC}/${clip}`);
const SHOTS: [string, number, number, number, Tr][] = [
  // 前奏 0–15.5：卡片和钟，世界按时运转
  ["n01", 3.3, 8.2, 0, "hole"],        // 只用前 5 秒：后面手抽走了        // 打卡机
  ["n06", 8.2, 12.0, 0, "dissolve"],   // 队列走来
  ["n05", 12.0, 15.5, 0, "punch"],     // 俯瞰工位，只有他在晃
  // 主歌 15.5–24.5
  ["g02", 15.5, 17.9, 0.3, "punch"],   // "Seven o'clock, everybody in line"
  ["g03", 17.9, 19.8, 0, "punch"],     // "punch the card, right on time"
  ["g04", 19.8, 21.9, 0, "punch"],     // "Same green face on every head"
  ["g05", 21.9, 24.5, 0, "punch"],     // "doing what the schedule said"
  // 过渡句 24.5–32.4
  ["g01", 24.5, 28.3, 0, "white"],     // "But I got my headphones on"
  ["g06", 28.3, 32.4, 0, "dissolve"],  // "playing my own song"
  // 副歌一 32.4–40.1
  ["n07", 32.4, 36.0, 1.0, "white"],     // "Blank card, blank card"
  ["n02", 36.0, 40.1, 1.5, "cut"],       // 跳起来 / "nothing written on it"
  // 副歌二 40.1–48.3
  ["n08", 40.1, 44.2, 0, "dissolve"],  // 走出队列 "Blank card, blank card"
  ["g07", 44.2, 48.3, 0, "cut"],       // "this time is mine"
  // 尾声 48.3–60
  ["n03-v1", 48.3, 53.0, 0, "dissolve"], // minimax 这条一开场就推近、头套出画，用 kling 那条  // 举起空白卡 "No schedule"
  ["n04", 53.0, 60.0, 0, "white"],     // 暖光，坐在地上 "Blank card"
];

// 双语歌词：起、止、英、中
const LYRICS: [number, number, string, string][] = [
  [15.5, 17.9, "Seven o'clock, everybody in line,", "七点整，所有人排好队，"],
  [17.9, 19.8, "punch the card, right on time.", "打卡，一秒不差。"],
  [19.8, 21.9, "Same green face on every head,", "每颗头上，同一张绿脸，"],
  [21.9, 24.4, "doing what the schedule said.", "照着日程表做事。"],
  [24.5, 28.3, "But I got my headphones on,", "可我戴着耳机，"],
  [28.3, 32.4, "playing my own song.", "放着我自己的歌。"],
  [32.4, 36.0, "Blank card, blank card,", "空白卡，空白卡，"],
  [36.0, 40.1, "nothing written on it.", "上面什么都没写。"],
  [40.1, 44.2, "Blank card, blank card,", "空白卡，空白卡，"],
  [44.2, 48.4, "this time is mine.", "这段时间，是我的。"],
  [49.1, 52.5, "No schedule.", "没有日程。"],
  [53.9, 57.5, "Blank card.", "空白卡。"],
];

// 大字：只在副歌和尾声砸几次，放留白处
const WORDS: [string, number, number, "left" | "right" | "top" | "bottom" | "endcard" | "topright" | "lowleft" | "lowright"][] = [
  ["ON TIME.", 15.6, 17.9, "top"],
  ["BLANK.", 36.0, 38.0, "lowleft"],
  ["CARD.", 38.0, 40.1, "lowright"],
  ["MINE.", 46.9, 48.3, "right"],
];

// 进场转场的蒙版：hole = 从画面中心一个方孔放大出来；punch = 黑方块闪一帧再开孔
const TransitionIn = ({ kind, children }: { kind: Tr; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  if (kind === "hole" || kind === "punch") {
    const dur = kind === "hole" ? 18 : 6;
    const p = interpolate(f, [0, dur], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const w = 4 + p * 96, h = 4 + p * 96; // 百分比
    const clip = `inset(${(100 - h) / 2}% ${(100 - w) / 2}% ${(100 - h) / 2}% ${(100 - w) / 2}%)`;
    return <AbsoluteFill style={{ clipPath: p >= 1 ? undefined : clip }}>{children}</AbsoluteFill>;
  }
  if (kind === "dissolve") {
    return <AbsoluteFill style={{ opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
  }
  return <AbsoluteFill>{children}</AbsoluteFill>;
};

// 白闪：前一个镜头过曝成白，再从白里浮出下一个
const WhiteFlash = ({ t0 }: { t0: number }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [S(t0) - 8, S(t0), S(t0) + 10], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#fbfbf9", opacity: o, pointerEvents: "none" }} />;
};

const BeatPulse = ({ t }: { t: number }) => {
  const i = beatIndex(t);
  const since = i >= 0 ? t - BEATS[i] : 1;
  const o = interpolate(since, [0, 0.12], [0.07, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: o, pointerEvents: "none" }} />;
};

// zh 为空时只显示英文（英文版用）；英文版字稍大，位置下移一点填掉中文那一行
const Lyric = ({ en, zh }: { en: string; zh: string }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: zh ? 118 : 128, textAlign: "center", opacity: o,
      fontFamily: "Menlo, 'SF Mono', monospace", color: "#111" }}>
      <span style={{ backgroundColor: "#f6f6f3", padding: zh ? "6px 14px" : "8px 18px", fontSize: zh ? 26 : 30, letterSpacing: 1 }}>{en}</span>
      {zh ? <div style={{ marginTop: 10 }}>
        <span style={{ backgroundColor: "#f6f6f3", padding: "4px 12px", fontSize: 20, letterSpacing: 4,
          fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif" }}>{zh}</span>
      </div> : null}
    </div>
  );
};

export const Full = ({ audio, zhSubs = true }: { audio: string; zhSubs?: boolean }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const beat = beatIndex(t);
  const unscheduled = t >= 32.4;
  const warm = interpolate(t, [53, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 打孔卡：前奏每拍打一个；主歌照打；副歌开始孔全部掉光变空白；尾声只剩一个孔
  const holes = t < 32.4 ? Math.max(0, Math.min(60, beat + 1)) : t < 53 ? 0 : 1;
  const hhmm = t < 32.4 ? `07:${String(Math.max(0, beat) % 60).padStart(2, "0")}` : "";
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f2" }}>
      {SHOTS.map(([clip, t0, t1, from, tr]) => {
        // 片段比槽位短就放慢一点填满，不让它播完露出空白
        const need = (S(t1) - S(t0)) / FPS + (tr === "dissolve" ? 0.5 : 0);
        const rate = Math.min(1, ((DUR as Record<string, number>)[path(clip)] - from - 0.08) / need);
        return (
        <Sequence key={clip} from={S(t0) - (tr === "dissolve" ? 12 : 0)} durationInFrames={S(t1) - S(t0) + (tr === "dissolve" ? 12 : 0)}>
          <TransitionIn kind={tr}>
            <OffthreadVideo src={staticFile(`vid/${path(clip)}.mp4`)} muted startFrom={s(from)} playbackRate={rate}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.1) brightness(1.05)" }} />
          </TransitionIn>
        </Sequence>
        );
      })}
      {SHOTS.filter(([, , , , tr]) => tr === "white").map(([clip, t0]) => <WhiteFlash key={clip} t0={t0} />)}
      {/* 每一拍一帧轻微的曝光跳（主歌和副歌），让画面在拍子上"呼吸" */}
      {t >= 15.4 && t < 48.4 ? <BeatPulse t={t} /> : null}
      {/* 尾声的暖光：全片唯一一次暖色 */}
      <AbsoluteFill style={{ backgroundColor: "#ffb15a", mixBlendMode: "soft-light", opacity: 0.55 * warm, pointerEvents: "none" }} />

      {/* 前奏 0–3.3：只有一张卡，每拍打一个孔，最后一个孔放大成第一个镜头 */}
      <Sequence from={0} durationInFrames={s(3.3)}>
        <AbsoluteFill style={{ backgroundColor: "#f4f4f2" }} />
        <PunchCard holes={Math.max(0, beat + 1)} big />
      </Sequence>

      <Halftone />
      <Grain />
      <Viewfinder beat={Math.max(0, beat)} />
      {t >= 3.3 && t < 53 ? <PunchCard holes={holes} /> : null}
      {t >= 3.3 ? <FlipBoard text={hhmm} beat={Math.max(0, beat)} /> : null}
      <Label top={unscheduled ? "UNIT 07 · UNSCHEDULED" : "UNIT 07 · ON SCHEDULE"} warn={unscheduled}
        sub={`BOARD · FINAL · ${String(Math.max(0, beat) + 1).padStart(3, "0")} / 109 BPM`} />

      {WORDS.map(([w, t0, t1, side]) => (
        <Sequence key={w + t0} from={S(t0)} durationInFrames={S(t1) - S(t0)}><BigWord text={w} side={side} /></Sequence>
      ))}
      {LYRICS.map(([t0, t1, en, zh]) => (
        <Sequence key={t0} from={S(t0)} durationInFrames={S(t1) - S(t0)}><Lyric en={en} zh={zhSubs ? zh : ""} /></Sequence>
      ))}

      {/* 收尾：卡片放大到画面中央，只剩一个孔，片名 */}
      <Sequence from={s(57.2)}>
        <AbsoluteFill style={{ backgroundColor: "#f4f4f2", opacity: interpolate(f - s(57.2), [0, 14], [0, 1], { extrapolateRight: "clamp" }) }} />
        <PunchCard holes={1} big />
        <BigWord text="BLANK CARD." side="endcard" />
      </Sequence>
      <AbsoluteFill style={{ backgroundColor: "white", pointerEvents: "none",
        opacity: interpolate(f, [0, 6], [1, 0], { extrapolateRight: "clamp" }) }} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
