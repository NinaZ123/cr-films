import React from "react";
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T } from "./theme";
import { Ghost, GhostBurst, PixelGrid } from "./Ghost";

// 15 秒样片（方向：原生分辨率，不抠像、不放大）。
// 真实访谈界面像产品一样浮在深色空间里，镜头在上面推、拉；AI 主持人用原生分辨率的清晰画面；
// 一屏只讲一件事。
export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const SAMPLE_TOTAL = s(16);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 时间轴（秒）。music-b-full 实测 drop 在 5.37s
const HIT = [5.37, 6.03, 6.69];
const T_COLD = [0, 5.37];
const T_TITLE = [5.37, 8.6];
const T_LOGO = [8.6, 10.4];
const T_QUAL = [10.4, 16];

// ---------- 背景空间 ----------
const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, #18241c 0%, #0c0e0d 55%, #070707 100%)` }}>
    {children}
  </AbsoluteFill>
);

// ---------- 浮在空间里的产品界面（录屏原片 3024×1720） ----------
// cam: 0 = 全景（界面整体浮着），1 = 推到主持人画面
const UI_W = 3024, UI_H = 1720;
const MOD_BOX = { x: 330, y: 378, w: 1960, h: 1102 }; // 主持人画面在界面里的位置（去掉上边 120 之后）
const FloatingUI: React.FC<{ src: string; startFrom?: number; cam: number; tilt?: number }> = ({ src, startFrom = 0, cam, tilt = 0 }) => {
  // 全景：界面缩到 1600 宽居中；推近：主持人画面正好铺满 1920
  const wide = { scale: 1600 / UI_W, cx: UI_W / 2, cy: UI_H / 2 };
  const close = { scale: 1920 / MOD_BOX.w, cx: MOD_BOX.x + MOD_BOX.w / 2, cy: MOD_BOX.y + MOD_BOX.h / 2 };
  const k = cam;
  const scale = wide.scale + (close.scale - wide.scale) * k;
  const cx = wide.cx + (close.cx - wide.cx) * k, cy = wide.cy + (close.cy - wide.cy) * k;
  const radius = 26 * (1 - k);
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <div style={{
        position: "absolute", left: 960 - cx * scale, top: 540 - cy * scale,
        width: UI_W * scale, height: UI_H * scale, borderRadius: radius, overflow: "hidden",
        boxShadow: k < 0.95 ? `0 40px 120px rgba(0,0,0,${0.7 * (1 - k)}), 0 0 0 1px rgba(255,255,255,${0.08 * (1 - k)})` : undefined,
        transform: `rotateX(${tilt}deg)`, transformOrigin: "50% 100%",
      }}>
        <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 大字幕：原话逐词出来，关键词品牌绿 ----------
type W = [string, number];
const Caption: React.FC<{ who: string; words: W[]; keys?: string[]; ai?: boolean; y?: number }> = ({ who, words, keys = [], ai = false, y = 860 }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const box = interpolate(f, [0, 8], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: box }}>
      <div style={{
        maxWidth: 1500, padding: "22px 34px", borderRadius: 22, background: "rgba(10,10,10,0.72)", backdropFilter: "blur(18px)",
        border: `1px solid ${T.line}`, display: "flex", gap: 22, alignItems: "baseline",
      }}>
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: T.mono, fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: ai ? T.accent : T.dim }}>
          {ai && <Ghost cell={1.6} glow={false} />}{who}
        </span>
        <span style={{ fontFamily: T.display, fontSize: 46, fontWeight: 600, letterSpacing: "-0.02em", color: T.text, lineHeight: 1.15 }}>
          {words.filter(([, a]) => a <= t).map(([w, a], i) => {
            const p = interpolate(t - a, [0, 0.12], [0, 1], clamp);
            return <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: p, transform: `translateY(${(1 - p) * 10}px)`, color: keys.includes(w) ? T.accent : undefined }}>{w}</span>;
          })}
        </span>
      </div>
    </div>
  );
};
const words = (str: string, shift = 0): W[] => str.split(" ").map((x) => { const [w, a] = x.split("@"); return [w, Math.max(0, Number(a) - shift)]; });

// ---------- 口号：大，左上，一次一句 ----------
const Slogan: React.FC<{ text: React.ReactNode }> = ({ text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 15, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{
      position: "absolute", left: 90, top: 80, fontFamily: T.display, fontWeight: 800, fontSize: 120, lineHeight: 0.92,
      letterSpacing: "-0.045em", color: "#fff", textShadow: "0 8px 50px rgba(0,0,0,0.75)",
      opacity: t > 0.01 ? 1 : 0, transform: `translateY(${(1 - t) * 40}px) scale(${1.12 - 0.12 * t})`, transformOrigin: "left top",
    }}>{text}</div>
  );
};

// ---------- 段落 ----------

// 冷开场：界面浮在空间里，慢慢推近到主持人；他在追问
const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const cam = interpolate(f, [s(0.2), s(4.6)], [0, 1], { ...clamp, easing: inOut });
  const tilt = interpolate(f, [0, s(4.6)], [8, 0], { ...clamp, easing: inOut });
  return (
    <Stage>
      <PixelGrid opacity={0.5} />
      <FloatingUI src="clips/ui-q1.mp4" cam={cam} tilt={tilt} />
      <Sequence from={s(0.4)}>
        <Caption who="Moderator" words={words("When@0.00 you@0.18 mentioned@0.30 using@0.56 a@0.88 heavy@1.06 cream@1.26 to@1.72 reduce@1.88 the@2.18 pain,@2.36 what@3.10 did@3.34 that@3.46 feel@3.58 like@3.80 on@4.02 your@4.16 skin?@4.26")} keys={["heavy", "cream"]} />
      </Sequence>
    </Stage>
  );
};

const Headline: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k0 = (k: number) => s(HIT[k] - T_TITLE[0]);
  const spr = (k: number) => spring({ frame: f - k0(k), fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  const hitK = [0, 1, 2].filter((k) => f >= k0(k)).pop() ?? -1;
  const since = hitK >= 0 ? f - k0(hitK) : 99;
  const flash = since < 3 ? interpolate(since, [0, 3], [0.5, 0]) : 0;
  const shake = since < 6 ? (6 - since) * (since % 2 ? 1 : -1) * 2.4 : 0;
  const L = (k: number, children: React.ReactNode, size: number) => {
    const t = spr(k);
    return <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: size, lineHeight: 0.93, letterSpacing: "-0.045em", color: "#fff", opacity: t > 0.01 ? 1 : 0, transform: `scale(${1.35 - 0.35 * t})`, filter: `blur(${(1 - t) * 10}px)` }}>{children}</div>;
  };
  return (
    <AbsoluteFill style={{ background: T.bg, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      {/* 背景：他的清晰脸，压暗 */}
      <AbsoluteFill style={{ opacity: 0.28, filter: "saturate(0.5) brightness(0.7)", transform: `scale(${1.02 + f * 0.0006})` }}>
        <OffthreadVideo src={staticFile("clips/hd-listen.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.2), rgba(0,0,0,0.85))" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 6 }}>
        {L(0, "THE FIRST", 150)}
        {L(1, "AI MODERATOR", 196)}
        {L(2, <>TO PASS THE <span style={{ color: T.accent, textShadow: `0 0 60px ${T.accentSoft}` }}>TURING TEST.</span></>, 114)}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

const Logo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(f, [0, s(0.4)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const gather = interpolate(f, [s(0.4), s(1.05)], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const word = spring({ frame: f - s(0.95), fps, config: { damping: 18, stiffness: 150 } });
  const settled = f >= s(1.05);
  const cell = 18, gx = 960 - 340;
  return (
    <Stage>
      <PixelGrid opacity={0.7} />
      {f < s(0.4) && <GhostBurst cell={cell * 3} t={burst} cx={960} cy={540} spread={1500} seed="burst" />}
      {f >= s(0.4) && !settled && <GhostBurst cell={cell} t={gather} cx={gx} cy={540} spread={1300} seed="gather" />}
      <div style={{ position: "absolute", left: gx - (13 * cell) / 2, top: 540 - (17 * cell) / 2, opacity: settled ? 1 : 0 }}><Ghost cell={cell} /></div>
      <div style={{ position: "absolute", left: gx + (13 * cell) / 2 + 56, top: 540 - 124, opacity: word, transform: `translateX(${(1 - word) * -30}px)` }}>
        <div style={{ fontFamily: T.display, fontSize: 128, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>atypica<span style={{ color: T.accent }}>.AI</span></div>
        <div style={{ fontFamily: T.display, fontSize: 84, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 6, lineHeight: 1 }}>Interview</div>
      </div>
    </Stage>
  );
};

// 定性深访：他说没听懂 → 主持人道歉，换个问法
const Qual: React.FC = () => {
  const f = useCurrentFrame();
  // 0–2.6s 全景界面（受访者在右上角小窗里说话），镜头稍微往小窗方向偏
  const pan = interpolate(f, [0, s(2.6)], [0, 0.18], { ...clamp, easing: inOut });
  const cut = s(2.6);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={cut}>
        <Stage>
          <PixelGrid opacity={0.5} />
          <div style={{ position: "absolute", inset: 0, transform: `translate(${-pan * 380}px, ${pan * 140}px) scale(${1 + pan * 0.6})` }}>
            <FloatingUI src="clips/ui-a8.mp4" startFrom={s(1.4)} cam={0} />
          </div>
          <Caption who="Participant" words={words("I@0.04 didn't@0.20 really@0.52 understand@0.70 the@1.18 question.@1.44")} keys={["understand"]} />
        </Stage>
      </Sequence>
      <Sequence from={cut}>
        <AbsoluteFill style={{ transform: `scale(${interpolate(f - cut, [0, s(3.4)], [1.0, 1.05])})` }}>
          <OffthreadVideo src={staticFile("clips/hd-q8.mp4")} muted startFrom={s(6.9)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
        <Sequence from={s(0.25)}><Slogan text={<>IT REPHRASES.<br /><span style={{ color: T.accent }}>NO SCRIPT.</span></>} /></Sequence>
        <Caption who="AI Moderator" ai words={words("Sorry@0.00 about@0.60 that.@0.80 I@1.54 just@1.68 meant…@1.82")} keys={["Sorry"]} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- 合成 ----------
export const Sample: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("music-b-full.mp3")} volume={(fr) => {
      const t = fr / FPS;
      return interpolate(t, [0, 5.3, 5.37, 10.2, 10.6, 15.4, 16], [0.14, 0.16, 0.55, 0.5, 0.12, 0.12, 0], clamp);
    }} />
    {/* 对白（清理过的原声） */}
    <Sequence from={s(0.4)} durationInFrames={s(4.6)} layout="none"><Audio src={staticFile("vo/q1.mp3")} /></Sequence>
    <Sequence from={s(10.4)} durationInFrames={s(2.4)} layout="none"><Audio src={staticFile("vo/a8.mp3")} startFrom={s(1.9)} /></Sequence>
    <Sequence from={s(13.0)} durationInFrames={s(3.0)} layout="none"><Audio src={staticFile("vo/q8.mp3")} volume={(fr) => interpolate(fr, [s(2.5), s(3.0)], [1, 0], clamp)} /></Sequence>

    <Sequence from={s(T_COLD[0])} durationInFrames={s(T_COLD[1] - T_COLD[0])}><Cold /></Sequence>
    <Sequence from={s(T_TITLE[0])} durationInFrames={s(T_TITLE[1] - T_TITLE[0])}><Headline /></Sequence>
    <Sequence from={s(T_LOGO[0])} durationInFrames={s(T_LOGO[1] - T_LOGO[0])}><Logo /></Sequence>
    <Sequence from={s(T_QUAL[0])} durationInFrames={s(T_QUAL[1] - T_QUAL[0])}><Qual /></Sequence>
  </AbsoluteFill>
);
