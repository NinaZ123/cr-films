import React from "react";
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T } from "./theme";
import { Ghost, GhostBurst, PixelGrid } from "./Ghost";

// 开场 0–10 秒样片（脚本 v6）。
// 0–3.5s 真实访谈，不露任何 AI 痕迹；3.5s 起三拍重鼓砸主标；7s 小幽灵像素炸开，聚成 logo。
// 音乐由 props 选 a/b/c，三版的鼓点位置不同，用 DROP 表对齐到第一记重拍。
export const FPS = 30;
export const OPENING_TOTAL = 10 * FPS;
const s = (sec: number) => Math.round(sec * FPS);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

// 主标三拍落点（秒）。音乐按 DROP[take] 偏移，让它自己的重拍落在 HIT[0] 上。
const HIT = [3.5, 4.3, 5.1];
const DROP: Record<string, number> = { a: 3.56, b: 3.62, c: 3.88 };

type Props = { music: "a" | "b" | "c" };

// ---------- 0–3.5s 冷开场：一通真实的视频访谈 ----------
// 主持人追问（原声）→ 切到她回答（侧拍 + 原声）。
// 这一段不加任何 AI 标签，看起来就是两个真人在视频。

const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, s(3.5)], [1.0, 1.06]);
  const look = { filter: "saturate(0.82) contrast(1.06) brightness(0.96)" };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 主持人："When you mentioned using a heavy cream…" */}
      <Sequence durationInFrames={s(1.55)}>
        <AbsoluteFill style={{ transform: `scale(${push})`, ...look }}>
          <OffthreadVideo src={staticFile("clips/mod-a.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
        <Sub text="When you mentioned using a heavy cream…" />
      </Sequence>
      {/* 接上 "what did that feel like?"（主持人原声，画面切到她） */}
      <Sequence from={s(1.55)} durationInFrames={s(0.9)} layout="none">
        <Audio src={staticFile("clips/mod-b.m4a")} />
      </Sequence>
      <Sequence from={s(1.55)} durationInFrames={s(1.95)}>
        <SideAnswer />
        <Sequence durationInFrames={s(0.9)}><Sub text="…what did that feel like?" /></Sequence>
      </Sequence>
      {/* 她："…a very heavy and sticky layer on my hand." */}
      <Sequence from={s(2.45)} durationInFrames={s(1.1)} layout="none">
        <Audio src={staticFile("clips/her.m4a")} volume={(fr) => interpolate(fr, [s(0.9), s(1.1)], [1, 0], clamp)} />
      </Sequence>
      <Sequence from={s(2.45)} durationInFrames={s(1.05)}>
        <Sub text="…a very heavy, sticky layer." />
      </Sequence>
    </AbsoluteFill>
  );
};

const SideAnswer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ filter: "saturate(0.82) contrast(1.06) brightness(0.96)" }}>
      <OffthreadVideo src={staticFile("clips/side1.mp4")} muted startFrom={s(2.6)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.12 + 0.0012 * f})`, transformOrigin: "30% 55%" }} />
    </AbsoluteFill>
  );
};

// 学 Higgsfield：粗体大字幕逐词跳出
const Sub: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}>
      <div style={{
        display: "flex", gap: "0 16px", flexWrap: "wrap", justifyContent: "center", maxWidth: 1500,
        fontFamily: T.display, fontWeight: 700, fontSize: 64, letterSpacing: "-0.02em", lineHeight: 1.08,
        color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.7)",
      }}>
        {words.map((w, i) => {
          const t = interpolate(f - i * 2.2, [0, 5], [0, 1], { ...clamp, easing: ease });
          return <span key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * 18}px) scale(${0.9 + 0.1 * t})`, display: "inline-block" }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3.5–7s 主标：三拍砸下来 ----------

const Headline: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = (k: number) => s(HIT[k] - 3.5);
  const line = (k: number) => spring({ frame: f - at(k), fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  // 每记重拍：白闪 2 帧 + 画面轻震
  const hitK = [0, 1, 2].filter((k) => f >= at(k)).pop() ?? -1;
  const since = hitK >= 0 ? f - at(hitK) : 99;
  const flash = since < 3 ? interpolate(since, [0, 3], [0.55, 0]) : 0;
  const shake = since < 6 ? (6 - since) * (since % 2 ? 1 : -1) * 2.2 : 0;
  // 背景：主持人在听，压暗、虚化
  const bgIn = interpolate(f, [0, 8], [0, 1], clamp);
  const hold = f >= at(2) + 8;
  const L = (k: number, children: React.ReactNode, size: number) => {
    const t = line(k);
    return (
      <div style={{
        fontFamily: T.display, fontWeight: 700, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.04em",
        color: "#fff", opacity: t > 0.01 ? 1 : 0, transform: `scale(${1.35 - 0.35 * t})`, filter: `blur(${(1 - t) * 10}px)`,
      }}>{children}</div>
    );
  };
  return (
    <AbsoluteFill style={{ background: T.bg, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <AbsoluteFill style={{ opacity: 0.22 * bgIn, filter: "blur(10px) saturate(0.6)", transform: `scale(${1.08 + f * 0.0006})` }}>
        <OffthreadVideo src={staticFile("clips/mod-listen.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <PixelGrid opacity={0.9} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 6 }}>
        {L(0, "THE FIRST", 150)}
        {L(1, "AI MODERATOR", 190)}
        {L(2, <>TO PASS THE <span style={{ color: T.accent, textShadow: hold ? `0 0 60px ${T.accentSoft}` : undefined }}>TURING TEST.</span></>, 112)}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

// ---------- 7–10s 小幽灵炸开，再聚成 logo ----------

const Logo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 0–0.45s 大号小幽灵从中心炸开；0.45–1.25s 像素聚回成小号小幽灵；之后出字
  const burst = interpolate(f, [0, s(0.45)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const gather = interpolate(f, [s(0.45), s(1.25)], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const word = spring({ frame: f - s(1.15), fps, config: { damping: 18, stiffness: 150 } });
  const sub = interpolate(f, [s(1.6), s(2.1)], [0, 1], { ...clamp, easing: ease });
  const settled = f >= s(1.25);
  const flash = interpolate(f, [0, 4], [0.8, 0], clamp);
  const cell = 16;
  // logo 组合的左边缘位置，小幽灵聚回的中心要对上
  const ghostCx = 960 - 330;
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <PixelGrid opacity={0.9} />
      {f < s(0.45) && <GhostBurst cell={cell * 3} t={burst} cx={960} cy={540} spread={1500} seed="burst" />}
      {f >= s(0.45) && !settled && <GhostBurst cell={cell} t={gather} cx={ghostCx} cy={540} spread={1300} seed="gather" />}
      <div style={{ position: "absolute", left: ghostCx - (13 * cell) / 2, top: 540 - (17 * cell) / 2, opacity: settled ? 1 : 0 }}>
        <Ghost cell={cell} />
      </div>
      <div style={{ position: "absolute", left: ghostCx + (13 * cell) / 2 + 50, top: 540 - 110, opacity: word, transform: `translateX(${(1 - word) * -30}px)` }}>
        <div style={{ fontFamily: T.display, fontSize: 108, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>
          atypica<span style={{ color: T.accent }}>.AI</span>
        </div>
        <div style={{ fontFamily: T.display, fontSize: 72, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 8, lineHeight: 1 }}>
          Interview
        </div>
        <div style={{ marginTop: 26, opacity: sub, fontFamily: T.mono, fontSize: 22, letterSpacing: "0.2em", color: T.dim, textTransform: "uppercase" }}>
          The first AI Moderator to pass the Turing test
        </div>
      </div>
      <AbsoluteFill style={{ background: T.accent, opacity: flash * 0.5, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

// ---------- 合成 ----------

export const Opening: React.FC<Props> = ({ music }) => {
  // 音乐偏移：让它第一记重拍对上 HIT[0]
  const offset = DROP[music] - HIT[0];
  const startFrom = Math.max(0, s(offset));
  const delay = Math.max(0, s(-offset));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={delay} layout="none">
        <Audio src={staticFile(`music-${music}.mp3`)} startFrom={startFrom}
          volume={(fr) => {
            const t = (fr + delay) / FPS;
            // 冷开场时压在对白下面；主标起来以后推满；片尾淡出
            return interpolate(t, [0, 3.3, 3.5, 9.3, 10], [0.28, 0.32, 0.9, 0.9, 0], clamp);
          }} />
      </Sequence>
      <Sequence durationInFrames={s(3.5)}><Cold /></Sequence>
      <Sequence from={s(3.5)} durationInFrames={s(3.5)}><Headline /></Sequence>
      <Sequence from={s(7)} durationInFrames={s(3)}><Logo /></Sequence>
      <Grain />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.1 }}>
      <svg width="100%" height="100%">
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 8} /></filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};
