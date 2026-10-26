import React from "react";
import {
  AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T } from "./theme";

// 开场 15 秒样片。还没有音乐，先按 120 BPM 的网格剪：一拍 15 帧。
export const FPS = 30;
const BEAT = 15;
const b = (n: number) => Math.round(n * BEAT);
export const OPENING_TOTAL = b(30); // 15s

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

// ---------- 通用件 ----------

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.12 }}>
      <svg width="100%" height="100%">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 8} />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};

const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{
    pointerEvents: "none",
    background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
  }} />
);

// 逐词砸出来：每个词从下往上弹，带一点模糊
const SlamWords: React.FC<{
  words: { t: string; accent?: boolean }[]; start: number; step: number;
  size: number; color?: string; weight?: number; align?: "center" | "left";
}> = ({ words, start, step, size, color = T.text, weight = 600, align = "center" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.26}px`,
      justifyContent: align === "center" ? "center" : "flex-start",
      fontFamily: T.display, fontWeight: weight, fontSize: size,
      letterSpacing: "-0.035em", lineHeight: 1.02, color,
    }}>
      {words.map((w, i) => {
        const s = spring({ frame: f - start - i * step, fps, config: { damping: 16, stiffness: 180, mass: 0.7 } });
        return (
          <span key={i} style={{
            display: "inline-block",
            opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
            transform: `translateY(${(1 - s) * size * 0.45}px) scale(${0.92 + 0.08 * s})`,
            filter: `blur(${(1 - s) * 14}px)`,
            color: w.accent ? T.accent : undefined,
            textShadow: w.accent ? `0 0 ${size * 0.5}px ${T.accentSoft}` : undefined,
          }}>{w.t}</span>
        );
      })}
    </div>
  );
};

const Wordmark: React.FC<{ size: number; sub?: string; color?: string }> = ({ size, sub, color = T.text }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.35, fontFamily: T.display, color }}>
    <span style={{ fontSize: size, fontWeight: 600, letterSpacing: "-0.03em" }}>
      atypica<span style={{ color: T.accent }}>.AI</span>
    </span>
    {sub && <span style={{ fontSize: size * 0.62, fontWeight: 300, letterSpacing: "-0.01em", opacity: 0.85 }}>{sub}</span>}
  </div>
);

// 录屏里的"Interview in progress"小标，复刻成干净的 UI 件
const LivePill: React.FC<{ label: string; style?: React.CSSProperties }> = ({ label, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 20px",
      borderRadius: 999, background: "rgba(10,10,10,0.6)", border: `1px solid ${T.line}`,
      backdropFilter: "blur(12px)", fontFamily: T.mono, fontSize: 20, color: T.text,
      letterSpacing: "0.14em", textTransform: "uppercase", ...style,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: 5, background: T.accent,
        boxShadow: `0 0 12px ${T.accent}`, opacity: 0.5 + 0.5 * Math.abs(Math.sin(f / 9)),
      }} />
      {label}
    </div>
  );
};

// 实时声波条
const Waveform: React.FC<{ bars?: number; height?: number; active?: number }> = ({ bars = 36, height = 56, active = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, height }}>
      {Array.from({ length: bars }).map((_, i) => {
        const v = 0.18 + 0.82 * active * Math.abs(Math.sin(f / 4.2 + i * 0.7) * Math.cos(f / 7.3 + i * 0.31));
        return <span key={i} style={{ width: 5, height: height * v, borderRadius: 3, background: T.accent, opacity: 0.85 }} />;
      })}
    </div>
  );
};

// ---------- S1：定位（0–5s）----------

const S1Position: React.FC = () => {
  const f = useCurrentFrame();
  const dur = b(10);
  // AI 主持人从黑里亮起，慢推近；第 5 拍后压暗退后，让位给大字
  const lift = interpolate(f, [0, b(2)], [0, 1], { ...clamp, easing: ease });
  const dim = interpolate(f, [b(4.5), b(6)], [1, 0.32], { ...clamp, easing: ease });
  const scale = interpolate(f, [0, dur], [1.12, 1.0]);
  const out = interpolate(f, [dur - 6, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: T.bg, opacity: out }}>
      <AbsoluteFill style={{ opacity: lift * dim, transform: `scale(${scale})`, filter: "saturate(0.85) contrast(1.05)" }}>
        <OffthreadVideo src={staticFile("clips/mod-hc.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <Vignette strength={0.8} />
      {/* 扫描框：表示"这是一个 AI" */}
      <Sequence from={b(1)} durationInFrames={b(4)} layout="none">
        <ScanFrame />
      </Sequence>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 160px" }}>
        <div style={{ marginTop: -40 }}>
          <SlamWords start={b(5)} step={3} size={118}
            words={[{ t: "The" }, { t: "first" }, { t: "AI" }, { t: "Moderator" }]} />
          <div style={{ height: 6 }} />
          <SlamWords start={b(6.5)} step={3} size={118} weight={300}
            words={[{ t: "that" }, { t: "passes" }, { t: "the" }, { t: "Turing", accent: true }, { t: "test.", accent: true }]} />
        </div>
      </AbsoluteFill>
      <Sequence from={b(8.4)} layout="none">
        <FadeUp style={{ position: "absolute", bottom: 120, width: "100%", display: "flex", justifyContent: "center" }}>
          <Wordmark size={46} sub="Interview" />
        </FadeUp>
      </Sequence>
    </AbsoluteFill>
  );
};

const ScanFrame: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 20, stiffness: 120 } });
  const fade = interpolate(f, [b(2.6), b(3.4)], [1, 0], clamp);
  const w = 520 + 80 * (1 - s), h = 620 + 80 * (1 - s);
  const corner = (rot: number, pos: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 56, height: 56, borderTop: `3px solid ${T.accent}`, borderLeft: `3px solid ${T.accent}`, transform: `rotate(${rot}deg)`, ...pos }} />
  );
  const scanY = interpolate(f % 40, [0, 40], [0, h]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: s * fade }}>
      <div style={{ position: "relative", width: w, height: h, marginTop: -60 }}>
        {corner(0, { left: 0, top: 0 })}
        {corner(90, { right: 0, top: 0 })}
        {corner(180, { right: 0, bottom: 0 })}
        {corner(270, { left: 0, bottom: 0 })}
        <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`, opacity: 0.7 }} />
        <div style={{ position: "absolute", left: 0, bottom: -64 }}>
          <LivePill label="AI Moderator · Live" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FadeUp: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ children, style, delay = 0 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f - delay, [0, 14], [0, 1], { ...clamp, easing: ease });
  return <div style={{ ...style, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>{children}</div>;
};

// ---------- S2：降维（5–10s）----------
// 传统流程是一条很长的时间线：寄样品 → 约时间 → 60 分钟深访 → 等几周。
// 整条被压扁，收成一个 Start interview 按钮。

const OLD = [
  { icon: "box", label: "Ship samples", meta: "3–5 days" },
  { icon: "cal", label: "Schedule", meta: "1 week" },
  { icon: "timer", label: "60-min sessions", meta: "× 20" },
  { icon: "glass", label: "Wait for insights", meta: "weeks" },
];

const Icon: React.FC<{ k: string; size?: number; color?: string }> = ({ k, size = 64, color = "currentColor" }) => {
  const p = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {k === "box" && <><path {...p} d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path {...p} d="M3 7.5 12 12l9-4.5M12 12v9" /></>}
      {k === "cal" && <><rect {...p} x="3.5" y="5" width="17" height="15" rx="2" /><path {...p} d="M3.5 10h17M8 3v4M16 3v4" /></>}
      {k === "timer" && <><circle {...p} cx="12" cy="13" r="7.5" /><path {...p} d="M12 13V9M9.5 2.5h5" /></>}
      {k === "glass" && <><path {...p} d="M6.5 3h11M6.5 21h11M7.5 3c0 5 9 5 9 9s-9 4-9 9M16.5 3c0 5-9 5-9 9" /></>}
    </svg>
  );
};

const S2Compress: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = b(10);
  // 节奏：4 张卡各占一拍出现 → 第 5 拍划线 → 第 6–7 拍整条压扁 → 按钮弹出
  const strike = interpolate(f, [b(4.6), b(5.4)], [0, 1], { ...clamp, easing: ease });
  const squeeze = interpolate(f, [b(5.8), b(6.8)], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const btn = spring({ frame: f - b(6.6), fps, config: { damping: 13, stiffness: 160 } });
  const out = interpolate(f, [dur - 6, dur], [1, 0], clamp);
  const pressed = interpolate(f, [b(8.6), b(8.9), b(9.2)], [1, 0.94, 1], clamp);
  const cardW = 300, gap = 36;
  const lineW = OLD.length * cardW + (OLD.length - 1) * gap;
  return (
    <AbsoluteFill style={{ background: T.bg, opacity: out }}>
      <GridFloor />
      <AbsoluteFill style={{ top: 150, alignItems: "center" }}>
        <FadeUp style={{ fontFamily: T.mono, fontSize: 22, letterSpacing: "0.22em", color: T.dim, textTransform: "uppercase" }}>
          Product testing, the old way
        </FadeUp>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          position: "relative", display: "flex", gap,
          transform: `scaleX(${1 - squeeze * 0.86}) scaleY(${1 - squeeze * 0.55})`,
          opacity: 1 - interpolate(squeeze, [0.6, 1], [0, 1], clamp),
          filter: `blur(${squeeze * 6}px)`,
        }}>
          {OLD.map((o, i) => {
            const s = spring({ frame: f - b(0.4 + i), fps, config: { damping: 15, stiffness: 170 } });
            return (
              <div key={i} style={{
                width: cardW, height: 230, borderRadius: 22, background: T.card, border: `1px solid ${T.line}`,
                display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 28,
                color: T.text, opacity: s, transform: `translateY(${(1 - s) * 50}px)`,
              }}>
                <Icon k={o.icon} size={56} color="rgba(250,250,250,0.8)" />
                <div>
                  <div style={{ fontFamily: T.display, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>{o.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 20, color: T.dim, marginTop: 6 }}>{o.meta}</div>
                </div>
              </div>
            );
          })}
          {/* 划线 */}
          <div style={{
            position: "absolute", left: -20, top: "50%", height: 4, width: (lineW + 40) * strike,
            background: "#FF3D4F", borderRadius: 2, boxShadow: "0 0 18px rgba(255,61,79,0.6)",
          }} />
        </div>
      </AbsoluteFill>
      {/* 新方式：一个按钮 */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: btn, transform: `scale(${(0.6 + 0.4 * btn) * pressed})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 18, padding: "30px 56px", borderRadius: 999,
            background: T.accent, color: T.ink, fontFamily: T.display, fontSize: 48, fontWeight: 600,
            letterSpacing: "-0.02em", boxShadow: `0 0 80px ${T.accentSoft}, 0 0 0 ${interpolate(f, [b(8.9), b(10)], [0, 60], clamp)}px rgba(24,255,25,${interpolate(f, [b(8.9), b(10)], [0.35, 0], clamp)})`,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24"><path d="M15 10l4.5-3v10L15 14M4 7h11v10H4z" fill="none" stroke={T.ink} strokeWidth="2" strokeLinejoin="round" /></svg>
            Start interview
          </div>
          <div style={{ fontFamily: T.display, fontSize: 40, fontWeight: 300, color: T.text, letterSpacing: "-0.02em" }}>
            One link. <span style={{ color: T.accent, fontWeight: 500 }}>Live.</span> Today.
          </div>
        </div>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

// 官网同款的透视网格地面
const GridFloor: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ perspective: 900, overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: "-50%", right: "-50%", bottom: -200, height: 900,
        transform: "rotateX(72deg)", transformOrigin: "bottom",
        backgroundImage: `linear-gradient(${T.accent}22 1px, transparent 1px), linear-gradient(90deg, ${T.accent}22 1px, transparent 1px)`,
        backgroundSize: "80px 80px", backgroundPosition: `0 ${(f * 1.2) % 80}px`,
        maskImage: "linear-gradient(to top, black 10%, transparent 75%)",
      }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, background: `radial-gradient(ellipse at bottom, ${T.accent}26, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

// ---------- S3：护手霜章节开场（10–15s）----------

const S3HandCream: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.light }}>
      {/* A1 全屏脸 1 秒：只有 4 帧可用，定格 + 推近 */}
      <Sequence durationInFrames={b(2)}>
        <FaceHold />
      </Sequence>
      {/* A2 产品 hero：veo 生成的棚拍运镜 */}
      <Sequence from={b(2)} durationInFrames={b(3)}>
        <ProductHero />
      </Sequence>
      {/* A2b 膏体微距 */}
      <Sequence from={b(5)} durationInFrames={b(2)}>
        <AbsoluteFill>
          <OffthreadVideo src={staticFile("clips/hc-macro.mp4")} startFrom={Math.round(2.4 * 24 / 24 * FPS)} muted playbackRate={0.8}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f - b(5), [0, b(2)], [1.04, 1.12])})` }} />
        </AbsoluteFill>
      </Sequence>
      {/* A3 实拍：挤护手霜，分屏嵌套，右边 AI 主持人 */}
      <Sequence from={b(7)} durationInFrames={b(3)}>
        <SplitSqueeze />
      </Sequence>
    </AbsoluteFill>
  );
};

const FaceHold: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [0, 4], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile("clips/fhc.png")} style={{
        width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${interpolate(f, [0, b(2)], [1.0, 1.07])})`, filter: "saturate(0.9) contrast(1.06)",
      }} />
      <Vignette strength={0.5} />
      <div style={{ position: "absolute", left: 80, bottom: 80 }}>
        <LivePill label="Participant · Live" />
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

const ProductHero: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(f, [0, 8], [0, 1], clamp);
  const num = spring({ frame: f - 6, fps, config: { damping: 18, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <OffthreadVideo src={staticFile("clips/hc-hero.mp4")} muted startFrom={12}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {/* 章节标：大号 01 + 产品名，从产品背后滑出 */}
      <div style={{ position: "absolute", left: 120, top: 120, color: T.ink, fontFamily: T.display }}>
        <div style={{ fontFamily: T.mono, fontSize: 22, letterSpacing: "0.24em", opacity: 0.55 * num, textTransform: "uppercase" }}>
          Live product test
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 10 }}>
          <span style={{ fontSize: 150, fontWeight: 600, letterSpacing: "-0.05em", color: "#16C417", opacity: num, transform: `translateX(${(1 - num) * -60}px)`, display: "inline-block" }}>01</span>
          <span style={{ fontSize: 76, fontWeight: 300, letterSpacing: "-0.03em", opacity: num, transform: `translateX(${(1 - num) * -30}px)`, display: "inline-block" }}>Hand Cream</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SplitSqueeze: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inL = spring({ frame: f, fps, config: { damping: 18, stiffness: 150 } });
  const inR = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 150 } });
  const q = spring({ frame: f - 10, fps, config: { damping: 16, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: T.bg, padding: 40, flexDirection: "row", gap: 24 }}>
      {/* 侧拍竖屏：TU 9s 起挤护手霜 */}
      <div style={{ width: 560, borderRadius: 28, overflow: "hidden", position: "relative", transform: `translateY(${(1 - inL) * 80}px)`, opacity: inL }}>
        <OffthreadVideo src={staticFile("clips/tu.mp4")} muted startFrom={Math.round(1.6 * FPS)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.7)", transformOrigin: "38% 68%", filter: "saturate(0.88)" }} />
        <div style={{ position: "absolute", left: 22, top: 22 }}><Tag text="Side cam" /></div>
      </div>
      {/* AI 主持人 + 问题卡 */}
      <div style={{ flex: 1, borderRadius: 28, overflow: "hidden", position: "relative", transform: `translateY(${(1 - inR) * 80}px)`, opacity: inR }}>
        <OffthreadVideo src={staticFile("clips/mod-hc.mp4")} startFrom={0}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.85)" }} />
        <div style={{ position: "absolute", left: 22, top: 22 }}><Tag text="AI Moderator" accent /></div>
        <div style={{
          position: "absolute", left: 40, right: 40, bottom: 40, padding: "28px 34px", borderRadius: 22,
          background: "rgba(10,10,10,0.72)", backdropFilter: "blur(16px)", border: `1px solid ${T.line}`,
          display: "flex", alignItems: "center", gap: 28, opacity: q, transform: `translateY(${(1 - q) * 30}px)`,
        }}>
          <Waveform bars={14} height={48} />
          <div style={{ fontFamily: T.display, fontSize: 40, fontWeight: 500, color: T.text, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            <Typed text="Go ahead and put some of the cream on your hand." start={10} cps={1.6} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ text: string; accent?: boolean }> = ({ text, accent }) => (
  <div style={{
    padding: "8px 16px", borderRadius: 999, background: "rgba(10,10,10,0.6)", backdropFilter: "blur(10px)",
    border: `1px solid ${accent ? T.accent : T.line}`, color: accent ? T.accent : T.text,
    fontFamily: T.mono, fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase",
  }}>{text}</div>
);

// 逐字打出（cps = 每帧字符数）
const Typed: React.FC<{ text: string; start: number; cps: number }> = ({ text, start, cps }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor((f - start) * cps));
  return <span>{text.slice(0, n)}<span style={{ opacity: n < text.length ? 1 : 0, color: T.accent }}>▍</span></span>;
};

// ---------- 合成 ----------

export const Opening: React.FC = () => (
  <AbsoluteFill style={{ background: T.bg }}>
    <Sequence durationInFrames={b(10)}><S1Position /></Sequence>
    <Sequence from={b(10)} durationInFrames={b(10)}><S2Compress /></Sequence>
    <Sequence from={b(20)} durationInFrames={b(10)}><S3HandCream /></Sequence>
    <Grain />
  </AbsoluteFill>
);
