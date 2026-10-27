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
export const SAMPLE_TOTAL = s(33);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 时间轴（秒）。主标三拍沿用之前对 B 版音乐卡的点；现在前半段只用音效，冲击音落在这三拍上
const HIT = [5.37, 6.03, 6.69];
const T_COLD = [0, 5.37];
const T_TITLE = [5.37, 8.6];
const T_LOGO = [8.6, 10.4];
const T_QUAL = [10.4, 24.9];   // 包袱：AI 问 → 没听懂 → 道歉换个问法（对白 0–14.0s）
const DROP_AT = 24.9;           // 炸：music-drop 的第一拍（道歉说到 "I just meant…" 后停 0.5 秒）
const T_BOOM = [24.9, 33.0];

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

// 冷开场：真实访谈界面从暗处浮上来（由虚到实、带一点仰角），然后慢慢推近到主持人
const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const rise = interpolate(f, [0, s(1.4)], [0, 1], { ...clamp, easing: ease });
  const cam = interpolate(f, [s(1.2), s(4.8)], [0, 1], { ...clamp, easing: inOut });
  const tilt = interpolate(f, [0, s(4.8)], [10, 0], { ...clamp, easing: inOut });
  return (
    <Stage>
      <PixelGrid opacity={0.4} />
      <AbsoluteFill style={{
        opacity: rise, filter: `blur(${(1 - rise) * 14}px)`,
        transform: `translateY(${(1 - rise) * 60}px) scale(${0.94 + 0.06 * rise})`,
      }}>
        <FloatingUI src="clips/ui-q1.mp4" cam={cam} tilt={tilt} />
      </AbsoluteFill>
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

// 包袱：一段连续的真实对话（耳机那场，原片 147.3s 起）。
// 时间是清理后音频 vo/qa.mp3 里的秒数（原片 147.3s 起）：
// 0      AI："As you continue wearing them and listening, what, if anything, changes?"
// 6.4    受访者："Can you repeat that? … I didn't really understand the question."
// 12.2   AI："Sorry about that. I just meant…"
const QA = 147.3;
const Qual: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const r = (sec: number) => s(sec);                // 本段秒数 → 帧
  const pan = interpolate(f, [r(6.1), r(10.6)], [0, 1], { ...clamp, easing: inOut });
  return (
    <AbsoluteFill>
      {/* AI 提问：主持人居中特写 */}
      <Sequence durationInFrames={r(6.1)}>
        <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, r(6.1)], [1.0, 1.04])})` }}>
          <OffthreadVideo src={staticFile("clips/hd-qa.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
        <Caption who="AI Moderator" ai words={words("As@0.00 you@0.36 continue@0.88 wearing@1.14 them@1.50 and@1.80 listening,@2.00 what,@2.94 if@3.54 anything,@3.84 changes?@4.60")} keys={["changes?"]} />
      </Sequence>
      {/* 受访者没听懂：切到完整界面，镜头往右上角他的小窗推 */}
      <Sequence from={r(6.1)} durationInFrames={r(11.9) - r(6.1)}>
        <Stage>
          <PixelGrid opacity={0.4} />
          <div style={{ position: "absolute", inset: 0, transform: `translate(${-pan * 520}px, ${pan * 230}px) scale(${1 + pan * 0.75})` }}>
            <FloatingUI src="clips/ui-qa.mp4" startFrom={r(6.1)} cam={0} />
          </div>
          <Caption who="Participant" words={words("Can@0.32 you@0.54 repeat@0.68 that?@0.90 I@1.66 didn't@1.66 really@3.00 understand@3.20 the@3.62 question.@3.94")} keys={["understand"]} />
        </Stage>
      </Sequence>
      {/* AI 道歉、换个问法：主持人居中特写 */}
      <Sequence from={r(11.9)}>
        <AbsoluteFill style={{ transform: `scale(${interpolate(f - r(11.9), [0, s(3)], [1.0, 1.05])})` }}>
          <OffthreadVideo src={staticFile("clips/hd-qa.mp4")} muted startFrom={r(11.9)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
        <Caption who="AI Moderator" ai words={words("Sorry@0.26 about@0.82 that.@1.02 I@1.80 just@1.90 meant…@2.04")} keys={["Sorry"]} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 炸：音乐 drop 进来，大字一句一句砸，介绍产品
const BOOM_LINES: { at: number; lines: React.ReactNode[]; bg?: string; startFrom?: number }[] = [
  { at: 0.0, lines: [<>NOT A SCRIPT.</>, <span style={{ color: T.accent }}>A CONVERSATION.</span>], bg: "clips/hd-qa.mp4", startFrom: 14.2 },
  { at: 1.9, lines: [<>IT LISTENS.</>], bg: "clips/hd-listen.mp4" },
  { at: 2.85, lines: [<>IT FOLLOWS UP.</>], bg: "clips/hd-q6.mp4", startFrom: 1.8 },
  { at: 3.8, lines: [<>IT REPHRASES.</>], bg: "clips/hd-qa.mp4", startFrom: 12.2 },
  { at: 4.75, lines: [<>QUAL DEPTH.</>, <span style={{ color: T.accent }}>QUANT SCALE.</span>] },
  { at: 6.2, lines: [] },
];
const Boom: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  const idx = BOOM_LINES.findIndex((b, i) => t >= b.at && (i === BOOM_LINES.length - 1 || t < BOOM_LINES[i + 1].at));
  const cur = BOOM_LINES[idx];
  const since = f - s(cur.at);
  const flash = since < 3 ? interpolate(since, [0, 3], [0.6, 0]) : 0;
  const shake = since < 6 ? (6 - since) * (since % 2 ? 1 : -1) * 3 : 0;
  const isLogo = idx === BOOM_LINES.length - 1;
  return (
    <AbsoluteFill style={{ background: T.bg, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      {cur.bg && (
        <AbsoluteFill style={{ opacity: 0.6, filter: "saturate(0.7) brightness(0.8)", transform: `scale(${1.04 + since * 0.0012})` }}>
          <OffthreadVideo src={staticFile(cur.bg)} muted startFrom={s(cur.startFrom ?? 0)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}
      {!cur.bg && !isLogo && <PixelGrid opacity={0.8} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.8))" }} />
      {!isLogo && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          {cur.lines.map((l, i) => {
            const sp = spring({ frame: since - i * 4, fps, config: { damping: 13, stiffness: 280, mass: 0.55 } });
            return <div key={i} style={{ fontFamily: T.display, fontWeight: 800, fontSize: 168, lineHeight: 0.92, letterSpacing: "-0.05em", color: "#fff", opacity: sp > 0.01 ? 1 : 0, transform: `scale(${1.4 - 0.4 * sp})`, filter: `blur(${(1 - sp) * 12}px)` }}>{l}</div>;
          })}
        </AbsoluteFill>
      )}
      {isLogo && <BoomLogo since={since} />}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};
const BoomLogo: React.FC<{ since: number }> = ({ since }) => {
  const { fps } = useVideoConfig();
  const a = spring({ frame: since, fps, config: { damping: 16, stiffness: 160 } });
  const b = interpolate(since, [s(0.35), s(0.8)], [0, 1], { ...clamp, easing: ease });
  const cell = 20;
  return (
    <Stage>
      <PixelGrid opacity={0.7} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 54, opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>
          <Ghost cell={cell} />
          <div>
            <div style={{ fontFamily: T.display, fontSize: 140, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>atypica<span style={{ color: T.accent }}>.AI</span></div>
            <div style={{ fontFamily: T.display, fontSize: 92, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 6, lineHeight: 1 }}>Interview</div>
          </div>
        </div>
        <div style={{ opacity: b, transform: `translateY(${(1 - b) * 16}px)`, fontFamily: T.display, fontSize: 46, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>
          The first AI Moderator to pass the <span style={{ color: T.accent }}>Turing test.</span>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// ---------- 合成 ----------
export const Sample: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* 前半段：不用整段音乐（ElevenLabs 分段生成的音乐里混进了很轻的人声，听着像背景里有别的访谈），
        改成音效：冷开场一层安静的暗底，主标三拍各一记重低音冲击，最后一拍后接长尾，logo 出现时一声 8-bit */}
    <Sequence durationInFrames={s(T_COLD[1])} layout="none">
      <Audio src={staticFile("sfx/bed.mp3")} loop volume={(fr) => interpolate(fr / FPS, [0, 0.8, T_COLD[1] - 0.4, T_COLD[1]], [0, 0.35, 0.35, 0], clamp)} />
    </Sequence>
    {HIT.map((h, i) => (
      <Sequence key={h} from={s(h) - 10} layout="none">
        {/* hit.mp3 的峰值在 0.33s，提前 10 帧放，让冲击正好落在拍点上 */}
        <Audio src={staticFile("sfx/hit.mp3")} volume={i === 2 ? 0.95 : 0.8} />
      </Sequence>
    ))}
    <Sequence from={s(HIT[2]) + 4} layout="none">
      <Audio src={staticFile("sfx/tail.mp3")} volume={(fr) => interpolate(fr / FPS, [0, 2.6, 3.4], [0.55, 0.4, 0], clamp)} />
    </Sequence>
    <Sequence from={s(T_LOGO[0] + 0.95)} layout="none"><Audio src={staticFile("sfx/ghost.mp3")} volume={0.9} /></Sequence>
    {/* 炸：纯器乐版（forceInstrumental），实测 4.53s 第一拍，对齐到 DROP_AT */}
    <Sequence from={s(DROP_AT - 4.53)} layout="none">
      <Audio src={staticFile("music-inst-drop.mp3")} volume={(fr) => {
        const t = fr / FPS;
        return interpolate(t, [0, 4.4, 4.53, 10.5, 11.8], [0.6, 0.6, 0.9, 0.9, 0], clamp);
      }} />
    </Sequence>
    {/* 对白（清理过的原声） */}
    <Sequence from={s(0.4)} durationInFrames={s(4.6)} layout="none"><Audio src={staticFile("vo/q1.mp3")} /></Sequence>
    {/* 包袱：一整段连续原声，不剪断对话 */}
    {/* 只播到 "I just meant…"（14.1s），后面留约 0.4 秒空白再接 drop */}
    <Sequence from={s(T_QUAL[0])} durationInFrames={s(14.3)} layout="none">
      <Audio src={staticFile("vo/qa.mp3")} volume={(fr) => interpolate(fr, [s(14.05), s(14.3)], [1, 0], clamp)} />
    </Sequence>

    <Sequence from={s(T_COLD[0])} durationInFrames={s(T_COLD[1] - T_COLD[0])}><Cold /></Sequence>
    <Sequence from={s(T_TITLE[0])} durationInFrames={s(T_TITLE[1] - T_TITLE[0])}><Headline /></Sequence>
    <Sequence from={s(T_LOGO[0])} durationInFrames={s(T_LOGO[1] - T_LOGO[0])}><Logo /></Sequence>
    <Sequence from={s(T_QUAL[0])} durationInFrames={s(T_QUAL[1] - T_QUAL[0])}><Qual /></Sequence>
    <Sequence from={s(T_BOOM[0])} durationInFrames={s(T_BOOM[1] - T_BOOM[0])}><Boom /></Sequence>
  </AbsoluteFill>
);
