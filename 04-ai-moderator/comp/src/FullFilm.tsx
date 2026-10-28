import React from "react";
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T } from "./theme";
import { Intro, INTRO_SEC } from "./Intro";
import { Ghost, PixelGrid } from "./Ghost";
import {
  Sample, Stage, FloatingUI, Caption, words, s, FPS, DROP_AT,
} from "./Sample";

// 完整版（脚本 v7）。0–31.1s 原样播放已确认的样片 v6（Sample 组件，一帧不改），
// 31.1s 起接两个能力段和收尾。
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 样片里"炸"那段最后是 logo（DROP_AT + 6.2 起），完整版在这里接走
const HANDOFF = DROP_AT + 6.2;               // 31.1
const T_DEPTH = [HANDOFF, HANDOFF + 11.6];   // 31.1–42.7  01 深访
const T_TEST = [T_DEPTH[1], T_DEPTH[1] + 16.8]; // 42.7–59.5  02 产品测试
const T_END = [T_TEST[1], T_TEST[1] + 6.2];  // 59.5–65.7  收尾
const DRIVE_IN = HANDOFF - 3.2;               // drive 从 drop 尾巴下面开始浮出来
export const FILM_TOTAL = s(INTRO_SEC + T_END[1]);

// ---------- 章节卡：大号编号 + 标题，从左滑入，背景是像素网格 ----------
const ChapterCard: React.FC<{ n: string; title: string; sub: string }> = ({ n, title, sub }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f, fps, config: { damping: 16, stiffness: 200 } });
  const b = spring({ frame: f - 5, fps, config: { damping: 18, stiffness: 180 } });
  const c = interpolate(f, [10, 22], [0, 1], { ...clamp, easing: ease });
  return (
    <Stage>
      <PixelGrid opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, fontSize: 300, fontWeight: 800, letterSpacing: "-0.06em", color: T.accent, lineHeight: 0.85, opacity: a, transform: `scale(${1.25 - 0.25 * a})`, textShadow: `0 0 90px ${T.accentSoft}` }}>{n}</div>
        <div style={{ fontFamily: T.display, fontSize: 128, fontWeight: 800, letterSpacing: "-0.045em", color: "#fff", lineHeight: 0.95, marginTop: 10, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>{title}</div>
        <div style={{ fontFamily: T.mono, fontSize: 30, letterSpacing: "0.3em", color: T.dim, marginTop: 28, opacity: c }}>{sub}</div>
      </AbsoluteFill>
    </Stage>
  );
};

// 角落口号（同样片的 Slogan 风格，放左上）
const Corner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 15, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{
      position: "absolute", left: 90, top: 80, fontFamily: T.display, fontWeight: 800, fontSize: 112, lineHeight: 0.92,
      letterSpacing: "-0.045em", color: "#fff", textShadow: "0 8px 50px rgba(0,0,0,0.8)",
      opacity: t > 0.01 ? 1 : 0, transform: `translateY(${(1 - t) * 40}px) scale(${1.12 - 0.12 * t})`, transformOrigin: "left top",
    }}>{children}</div>
  );
};

// 左侧大字（和右侧卡片并排时用）
const BigLeft: React.FC<{ lines: string[]; accent?: number }> = ({ lines, accent = -1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div>
      {lines.map((l, i) => {
        const t = spring({ frame: f - 3 - i * 5, fps, config: { damping: 14, stiffness: 240, mass: 0.6 } });
        return <div key={i} style={{ fontFamily: T.display, fontWeight: 800, fontSize: 180, lineHeight: 0.9, letterSpacing: "-0.05em", color: i === accent ? T.accent : "#fff", opacity: t > 0.01 ? 1 : 0, transform: `translateX(${(1 - t) * -50}px)`, filter: `blur(${(1 - t) * 8}px)` }}>{l}</div>;
      })}
    </div>
  );
};

// 产品棚拍镜头 + 章节标（浅色）
const ProductShot: React.FC<{ src: string; startFrom?: number; label?: string }> = ({ src, startFrom = 0, label }) => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [0, 5], [0.6, 0], clamp);
  const t = interpolate(f, [4, 16], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ background: T.light }}>
      <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {label && (
        <div style={{ position: "absolute", left: 110, top: 100, fontFamily: T.display, color: T.ink, opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
          <div style={{ fontFamily: T.mono, fontSize: 24, letterSpacing: "0.24em", opacity: 0.6 }}>PRODUCT</div>
          <div style={{ fontSize: 96, fontWeight: 300, letterSpacing: "-0.03em", marginTop: 6 }}>{label}</div>
        </div>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

// 侧拍（手机竖屏 540×960）：做成居中的圆角竖卡浮在深色空间里，不铺满全屏，所以不显糊
const SideCard: React.FC<{ src: string; startFrom?: number; label: string }> = ({ src, startFrom = 0, label }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f, fps, config: { damping: 18, stiffness: 170 } });
  return (
    <Stage>
      <PixelGrid opacity={0.4} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 220 }}>
        <div style={{
          width: 540, height: 960 * 0.92, borderRadius: 30, overflow: "hidden", position: "relative",
          boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)`,
          opacity: a, transform: `translateY(${(1 - a) * 60}px) scale(${0.96 + 0.04 * a})`,
        }}>
          <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.9) contrast(1.04)" }} />
          <div style={{ position: "absolute", left: 18, top: 18, display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 999, background: "rgba(10,10,10,0.65)", backdropFilter: "blur(10px)", fontFamily: T.mono, fontSize: 18, letterSpacing: "0.14em", color: T.text }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: "#FF3D4F" }} />{label}
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// 主持人居中特写（原生分辨率片段）
const ModClose: React.FC<{ src: string; startFrom?: number; dur: number; children?: React.ReactNode }> = ({ src, startFrom = 0, dur, children }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, s(dur)], [1.0, 1.05])})` }}>
        <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

// 完整界面，镜头往右上角受访者小窗推
const UIPan: React.FC<{ src: string; startFrom?: number; push: [number, number]; children?: React.ReactNode }> = ({ src, startFrom = 0, push, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, push, [0, 1], { ...clamp, easing: inOut });
  return (
    <Stage>
      <PixelGrid opacity={0.4} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${-p * 520}px, ${p * 230}px) scale(${1 + p * 0.75})` }}>
        <FloatingUI src={src} startFrom={startFrom} cam={0} />
      </div>
      {children}
    </Stage>
  );
};

// ---------- 01 深访：他说 outfit → AI 抓住这个词追问 ----------
// vo/outfit.mp3（原片 35.0s 起）："Oh, and the third purpose actually is part of the outfit. So, that's it."
//   "That's interesting. You mentioned them being part of the outfit. What makes you say that?"
const Depth: React.FC = () => {
  const card = s(1.6);
  const p0 = card;                   // 他说话，从音频 0.6s（"and the third…"）开始
  const m0 = card + s(6.3);          // 主持人追问，音频 7.0s（"That's interesting"）
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={card}><ChapterCard n="01" title="DEPTH INTERVIEW" sub="IT DIGS DEEPER" /></Sequence>
      <Sequence from={p0} durationInFrames={m0 - p0}>
        <UIPan src="clips/ui-outfit.mp4" startFrom={s(0.6)} push={[0, s(3.4)]}>
          <Caption who="Participant" words={words("the@0.02 third@0.30 purpose@0.60 actually@1.06 is@1.60 part@2.24 of@2.52 the@2.74 outfit.@2.96")} keys={["outfit."]} />
        </UIPan>
      </Sequence>
      <Sequence from={m0}>
        <ModClose src="clips/hd-q6b.mp4" startFrom={0} dur={5.3}>
          <Caption who="AI Moderator" ai words={words("That's@0.14 interesting.@0.68 You@1.86 mentioned@2.02 them@2.28 being@2.50 part@2.68 of@2.96 the@3.08 outfit.@3.14 What@4.10 makes@4.24 you@4.42 say@4.54 that?@4.72")} keys={["outfit.", "What"]} />
          <Sequence from={s(2.9)}><Corner>IT HEARS<br /><span style={{ color: T.accent }}>WHAT YOU MEANT.</span></Corner></Sequence>
        </ModClose>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- 02 产品体验测试：护手霜，边用边问 ----------
// vo/tryit.mp3（原片 82.0s 起）："I understand. Let's try this one. Go ahead and put some of the cream on your hand."
// vo/feel.mp3（原片 96.5s 起）："What does it feel like on your skin right now?" / "It feels very wet and have a good smell, moisturizing and hydrating."
const Test: React.FC = () => {
  const card = s(1.6);
  const hero = card, macro = hero + s(1.7), ask = macro + s(1.1);
  const side = ask + s(3.1);         // 侧拍：她拿起护手霜、挤到手上
  const feel = side + s(2.4);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={card}><ChapterCard n="02" title="LIVE PRODUCT TEST" sub="THEY TRY IT. IT ASKS." /></Sequence>
      <Sequence from={hero} durationInFrames={macro - hero}><ProductShot src="clips/hc-hero.mp4" startFrom={12} label="Hand Cream" /></Sequence>
      <Sequence from={macro} durationInFrames={ask - macro}><ProductShot src="clips/hc-macro.mp4" startFrom={s(2.6)} /></Sequence>
      {/* 主持人："Let's try this one. Go ahead and put some of the cream on your hand." */}
      <Sequence from={ask} durationInFrames={feel - ask}>
        <ModClose src="clips/hd-q2.mp4" startFrom={s(1.1)} dur={3.1}>
          <Caption who="AI Moderator" ai words={words("Let's@0.10 try@0.42 this@0.52 one.@0.72 Go@1.22 ahead@1.34 and@1.50 put@1.60 some@1.72 of@1.88 the@1.96 cream@2.02 on@2.22 your@2.38 hand.@2.52")} keys={["cream"]} />
        </ModClose>
      </Sequence>
      <Sequence from={side} durationInFrames={feel - side}>
        <SideCard src="clips/tu-squeeze.mp4" startFrom={s(1.0)} label="PRODUCT CAM" />
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
          <BigLeft lines={["THEY", "TRY IT."]} accent={1} />
        </AbsoluteFill>
      </Sequence>
      {/* 完整界面：主持人问感受，她边抹边答；镜头推到她的小窗 */}
      <Sequence from={feel}>
        <UIPan src="clips/ui-q3.mp4" push={[s(2.4), s(6.0)]}>
          <Sequence durationInFrames={s(2.6)}>
            <Caption who="AI Moderator" ai words={words("What@0.00 does@0.42 it@0.54 feel@0.66 like@0.84 on@1.10 your@1.26 skin@1.38 right@1.66 now?@1.90")} keys={["feel"]} />
          </Sequence>
          <Sequence from={s(2.7)}>
            <Caption who="Participant" words={words("It@0.20 feels@0.24 very@0.96 wet@1.68 and@2.40 have@3.34 a@3.68 good@3.78 smell,@3.94 moisturizing@4.58 and@5.10 hydrating.@5.82")} keys={["wet", "smell,", "hydrating."]} />
          </Sequence>
          <Sequence from={s(0.3)} durationInFrames={s(2.6)}><Corner><span style={{ color: T.accent }}>IT ASKS.</span></Corner></Sequence>
        </UIPan>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- 收尾 ----------
const END_LINES = [
  { at: 0.0, l1: "HOUR-LONG.", l2: "" },
  { at: 0.75, l1: "HOUR-LONG.", l2: "LIVE." },
  { at: 1.5, l1: "HOUR-LONG.", l2: "LIVE. ON CAMERA." },
];
const End: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  const logoAt = s(3.0);
  if (f < logoAt) {
    const cur = [...END_LINES].reverse().find((e) => t >= e.at)!;
    const since = f - s(cur.at);
    const flash = since < 3 ? interpolate(since, [0, 3], [0.45, 0]) : 0;
    const sp = spring({ frame: since, fps, config: { damping: 13, stiffness: 280, mass: 0.55 } });
    return (
      <AbsoluteFill style={{ background: T.bg }}>
        <AbsoluteFill style={{ opacity: 0.45, filter: "saturate(0.6) brightness(0.7)", transform: `scale(${1.04 + f * 0.0008})` }}>
          <OffthreadVideo src={staticFile("clips/hd-listen.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.82))" }} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 168, lineHeight: 0.92, letterSpacing: "-0.05em", color: "#fff" }}>{cur.l1}</div>
          {cur.l2 && <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: 168, lineHeight: 0.92, letterSpacing: "-0.05em", color: T.accent, transform: `scale(${1.3 - 0.3 * sp})`, filter: `blur(${(1 - sp) * 10}px)` }}>{cur.l2}</div>}
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      </AbsoluteFill>
    );
  }
  const since = f - logoAt;
  const a = spring({ frame: since, fps, config: { damping: 16, stiffness: 160 } });
  const b = interpolate(since, [s(0.4), s(0.9)], [0, 1], { ...clamp, easing: ease });
  const flash = interpolate(since, [0, 4], [0.7, 0], clamp);
  return (
    <Stage>
      <PixelGrid opacity={0.7} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 54, opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>
          <Ghost cell={20} />
          <div>
            <div style={{ fontFamily: T.display, fontSize: 140, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>atypica<span style={{ color: T.accent }}>.AI</span></div>
            <div style={{ fontFamily: T.display, fontSize: 92, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 6, lineHeight: 1 }}>Interview</div>
          </div>
        </div>
        <div style={{ opacity: b, transform: `translateY(${(1 - b) * 16}px)`, fontFamily: T.display, fontSize: 46, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>
          The first AI Moderator to pass the <span style={{ color: T.accent }}>Turing test.</span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: T.accent, opacity: flash * 0.4, mixBlendMode: "screen" }} />
    </Stage>
  );
};

// ---------- 合成 ----------
export const FullFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={s(INTRO_SEC)}><Intro /></Sequence>
    <Sequence from={s(INTRO_SEC)}><Main /></Sequence>
  </AbsoluteFill>
);

// 片头之后的正片（时间从 0 算，0–31.1s 是锁定的样片 v6）
const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* 0–31.1s：已确认的样片画面；声音换成 film 版（冷开场+主标用 music-b-full 纯器乐，drop 不变） */}
    <Sequence durationInFrames={s(HANDOFF)}><Sample music="film" /></Sequence>

    {/* drop 之后音乐不断：同一首 drive 准备两轨（闷的低通版 + 原版），同时播放保持同步。
        先让闷的那轨在 drop 尾巴下面慢慢浮出来，垫在 01 深访对白下当背景；
        进 02 产品测试时原版轨开始渗进来（像滤波器慢慢打开）；到收尾三拍才真正推满。 */}
    {(["lp", "full"] as const).map((k) => (
      <Sequence key={k} from={s(DRIVE_IN)} durationInFrames={s(T_END[0] + 3.2 - DRIVE_IN)} layout="none">
        <Audio src={staticFile(k === "lp" ? "music-inst-drive-long-lp.mp3" : "music-inst-drive-long.mp3")} volume={(fr) => {
          const t = fr / FPS + DRIVE_IN;                    // 换算成正片时间
          const talk = (a: number, b: number) => (t > a - 0.25 && t < b + 0.25 ? 1 : 0);
          const dialogue = Math.max(
            talk(T_DEPTH[0] + 1.6, T_DEPTH[0] + 11.6),        // 01 对白
            talk(T_TEST[0] + 4.4, T_TEST[0] + 7.5),           // 02 主持人
            talk(T_TEST[0] + 9.9, T_TEST[1]),                 // 02 问答
          );
          const duck = dialogue ? 0.5 : 1;
          if (k === "lp") return duck * interpolate(t,
            [DRIVE_IN, HANDOFF, T_END[0] - 0.4, T_END[0] + 0.2], [0, 0.6, 0.6, 0], clamp);
          return interpolate(t,
            [T_TEST[0] - 0.2, T_TEST[0] + 1.2, T_END[0] - 0.4, T_END[0], T_END[0] + 2.6, T_END[0] + 3.2],
            [0, 0.4, 0.4, 0.85, 0.85, 0], clamp) * (t < T_END[0] - 0.4 ? duck * 0.8 : 1);
        }} />
      </Sequence>
    ))}
    {/* 收尾：drive 一路燃到三拍大字，logo 落定时音乐切断，只剩最后一记冲击 + 定音 */}
    {/* 章节转场 whoosh */}
    {[T_DEPTH[0], T_TEST[0]].map((t) => (
      <Sequence key={t} from={s(t) - 6} layout="none"><Audio src={staticFile("sfx/whoosh.mp3")} volume={0.7} /></Sequence>
    ))}
    {/* 收尾三拍、logo */}
    {[0, 0.75, 1.5].map((d) => (
      <Sequence key={d} from={s(T_END[0] + d) - 10} layout="none"><Audio src={staticFile("sfx/hit.mp3")} volume={0.7} /></Sequence>
    ))}
    <Sequence from={s(T_END[0] + 3.0) - 10} layout="none"><Audio src={staticFile("sfx/hit.mp3")} volume={0.95} /></Sequence>
    <Sequence from={s(T_END[0] + 3.0) - 3} layout="none"><Audio src={staticFile("sfx/sting.mp3")} volume={0.9} /></Sequence>

    {/* 对白 */}
    <Sequence from={s(T_DEPTH[0] + 1.6)} durationInFrames={s(10.0)} layout="none">
      <Audio src={staticFile("vo/outfit.mp3")} startFrom={s(0.6)} volume={(fr) => {
        // 跳过中间 "So, that's it."（音频 4.5–6.9s），只留他那句和主持人追问
        const t = fr / FPS + 0.6;
        return t > 4.2 && t < 6.9 ? 0 : 1;
      }} />
    </Sequence>
    <Sequence from={s(T_TEST[0] + 1.6 + 1.7 + 1.1)} durationInFrames={s(3.1)} layout="none">
      <Audio src={staticFile("vo/tryit.mp3")} startFrom={s(1.1)} />
    </Sequence>
    <Sequence from={s(T_TEST[0] + 1.6 + 1.7 + 1.1 + 3.1 + 2.4)} durationInFrames={s(T_TEST[1] - (T_TEST[0] + 9.9))} layout="none">
      <Audio src={staticFile("vo/feel.mp3")} volume={(fr) => interpolate(fr / FPS, [8.4, 8.9], [1, 0], clamp)} />
    </Sequence>

    <Sequence from={s(T_DEPTH[0])} durationInFrames={s(T_DEPTH[1] - T_DEPTH[0])}><Depth /></Sequence>
    <Sequence from={s(T_TEST[0])} durationInFrames={s(T_TEST[1] - T_TEST[0])}><Test /></Sequence>
    <Sequence from={s(T_END[0])} durationInFrames={s(T_END[1] - T_END[0])}><End /></Sequence>
  </AbsoluteFill>
);
