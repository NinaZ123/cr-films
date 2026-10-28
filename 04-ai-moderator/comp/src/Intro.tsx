import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { T } from "./theme";
import { Ghost } from "./Ghost";

// 标准片头：小幽灵 logo 从侧面翻转进来（3D Y 轴），落定后一道扫光，文字从下浮出，然后整体淡出。
// 约 1.6 秒（v9 起缩短一半）。声音：翻转一声"唰"，落定一声定音。
export const INTRO_SEC = 1.6;
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 翻转：从 -90°（侧面，看不见）转到 0°，带一点回弹
  const flip = spring({ frame: f - 1, fps, config: { damping: 15, stiffness: 190, mass: 0.7 } });
  const rotY = -90 + 90 * flip;
  const land = s(0.4);                                   // 基本转正的时刻
  const word = interpolate(f, [land, land + 8], [0, 1], { ...clamp, easing: ease });
  const tag = interpolate(f, [land + 5, land + 12], [0, 1], { ...clamp, easing: ease });
  const sweep = interpolate(f, [land + 2, land + 14], [-0.3, 1.3], clamp);
  const glow = interpolate(f, [land - 3, land + 4, land + 22], [0, 1, 0.45], clamp);
  const out = interpolate(f, [s(INTRO_SEC) - 6, s(INTRO_SEC)], [1, 0], clamp);
  const cell = 22;
  return (
    <AbsoluteFill style={{ background: "#050605", opacity: out }}>
      {/* 背后的柔光 */}
      <AbsoluteFill style={{ opacity: glow, background: `radial-gradient(ellipse 38% 46% at 50% 46%, ${T.accent}2a, transparent 70%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", perspective: 1400 }}>
        <div style={{ position: "relative", transform: `rotateY(${rotY}deg)`, transformStyle: "preserve-3d" }}>
          <Ghost cell={cell} />
          {/* 扫光：限制在 logo 形状内 */}
          <div style={{
            position: "absolute", inset: 0, mixBlendMode: "screen", pointerEvents: "none",
            background: `linear-gradient(105deg, transparent ${sweep * 100 - 18}%, rgba(255,255,255,0.85) ${sweep * 100}%, transparent ${sweep * 100 + 18}%)`,
            WebkitMaskImage: "linear-gradient(#000,#000)",
          }} />
        </div>
        <div style={{ marginTop: 46, opacity: word, transform: `translateY(${(1 - word) * 22}px)`, textAlign: "center" }}>
          <div style={{ fontFamily: T.display, fontSize: 112, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>
            atypica<span style={{ color: T.accent }}>.AI</span> <span style={{ fontWeight: 300 }}>Interview</span>
          </div>
        </div>
        <div style={{ marginTop: 28, opacity: tag, fontFamily: T.mono, fontSize: 26, letterSpacing: "0.32em", color: T.dim }}>
          INTRODUCING
        </div>
      </AbsoluteFill>
      <Sequence from={0} layout="none"><Audio src={staticFile("sfx/flip.mp3")} volume={0.7} /></Sequence>
      <Sequence from={land - 5} layout="none"><Audio src={staticFile("sfx/sting.mp3")} volume={0.85} /></Sequence>
    </AbsoluteFill>
  );
};
