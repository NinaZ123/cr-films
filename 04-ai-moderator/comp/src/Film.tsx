import React from "react";
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T } from "./theme";
import { Ghost, GhostBurst, PixelGrid } from "./Ghost";
import { CallUI } from "./CallUI";
import { FPS, s, SEG, HIT, FINAL_HIT, LINES, INSIGHTS, TOTAL } from "./script";

// 全片（脚本 v6）：一通真实访谈 → 主标三拍 → logo → 定性深访 → 产品体验测试 → 收尾。
// 访谈画面都套在重做的 CallUI 里，画面和原声都是真实的。
export { TOTAL };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const at = (sec: number) => s(sec);
const len = (seg: readonly [number, number]) => s(seg[1] - seg[0]);

// ---------- 大字口号：压在画面角落（学 Higgsfield） ----------
const Slogan: React.FC<{ lines: string[]; accent?: number; pos?: "tl" | "bl" }> = ({ lines, accent = -1, pos = "tl" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{
      position: "absolute", left: 40, width: 1180, ...(pos === "tl" ? { top: 128, borderRadius: "22px 22px 0 0", background: "linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0))", padding: "34px 40px 90px" } : { top: 520, borderRadius: "0 0 22px 22px", background: "linear-gradient(0deg, rgba(0,0,0,0.72), rgba(0,0,0,0))", padding: "110px 40px 34px" }),
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      {lines.map((l, i) => {
        const t = spring({ frame: f - i * 5, fps, config: { damping: 15, stiffness: 220, mass: 0.6 } });
        return (
          <div key={i} style={{
            fontFamily: T.display, fontWeight: 800, fontSize: 104, lineHeight: 0.92, letterSpacing: "-0.045em",
            color: i === accent ? T.accent : "#fff", textShadow: "0 6px 40px rgba(0,0,0,0.65)",
            opacity: t > 0.01 ? 1 : 0, transform: `translateY(${(1 - t) * 40}px) scale(${1.15 - 0.15 * t})`, transformOrigin: "left center",
          }}>{l}</div>
        );
      })}
    </div>
  );
};

// ---------- 章节标：产品空镜 + 01 Hand Cream ----------
const Chapter: React.FC<{ n: string; name: string; label: string; src: string; startFrom?: number }> = ({ n, name, label, src, startFrom = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 140 } });
  const flash = interpolate(f, [0, 5], [0.7, 0], clamp);
  return (
    <AbsoluteFill style={{ background: T.light }}>
      <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 110, top: 100, color: T.ink, fontFamily: T.display }}>
        <div style={{ fontFamily: T.mono, fontSize: 22, letterSpacing: "0.24em", opacity: 0.6 * t }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, marginTop: 8 }}>
          <span style={{ fontSize: 170, fontWeight: 700, letterSpacing: "-0.05em", color: "#13B814", opacity: t, transform: `translateX(${(1 - t) * -60}px)`, display: "inline-block" }}>{n}</span>
          <span style={{ fontSize: 86, fontWeight: 300, letterSpacing: "-0.03em", opacity: t, transform: `translateX(${(1 - t) * -30}px)`, display: "inline-block" }}>{name}</span>
        </div>
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

// ---------- 主标：三拍砸下来 ----------
const Headline: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k0 = (k: number) => s(HIT[k] - SEG.title[0]);
  const spr = (k: number) => spring({ frame: f - k0(k), fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  const hitK = [0, 1, 2].filter((k) => f >= k0(k)).pop() ?? -1;
  const since = hitK >= 0 ? f - k0(hitK) : 99;
  const flash = since < 3 ? interpolate(since, [0, 3], [0.55, 0]) : 0;
  const shake = since < 6 ? (6 - since) * (since % 2 ? 1 : -1) * 2.4 : 0;
  const hold = f >= k0(2) + 8;
  const L = (k: number, children: React.ReactNode, size: number) => {
    const t = spr(k);
    return (
      <div style={{
        fontFamily: T.display, fontWeight: 800, fontSize: size, lineHeight: 0.93, letterSpacing: "-0.045em", color: "#fff",
        opacity: t > 0.01 ? 1 : 0, transform: `scale(${1.35 - 0.35 * t})`, filter: `blur(${(1 - t) * 10}px)`,
      }}>{children}</div>
    );
  };
  return (
    <AbsoluteFill style={{ background: T.bg, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <AbsoluteFill style={{ opacity: 0.2, filter: "blur(10px) saturate(0.6)", transform: `scale(${1.08 + f * 0.0006})` }}>
        <OffthreadVideo src={staticFile("clips/mod-listen.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <PixelGrid opacity={0.9} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 6 }}>
        {L(0, "THE FIRST", 150)}
        {L(1, "AI MODERATOR", 196)}
        {L(2, <>TO PASS THE <span style={{ color: T.accent, textShadow: hold ? `0 0 60px ${T.accentSoft}` : undefined }}>TURING TEST.</span></>, 114)}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

// ---------- logo：小幽灵炸开再聚回 ----------
const LogoLockup: React.FC<{ tagline?: boolean; big?: boolean }> = ({ tagline = true, big = false }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(f, [0, s(0.4)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const gather = interpolate(f, [s(0.4), s(1.1)], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const word = spring({ frame: f - s(1.0), fps, config: { damping: 18, stiffness: 150 } });
  const sub = interpolate(f, [s(1.4), s(1.9)], [0, 1], { ...clamp, easing: ease });
  const settled = f >= s(1.1);
  const flash = interpolate(f, [0, 4], [0.8, 0], clamp);
  const cell = big ? 22 : 18;
  const gx = 960 - (big ? 380 : 340);
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <PixelGrid opacity={0.9} />
      {f < s(0.4) && <GhostBurst cell={cell * 3} t={burst} cx={960} cy={540} spread={1500} seed="burst" />}
      {f >= s(0.4) && !settled && <GhostBurst cell={cell} t={gather} cx={gx} cy={540} spread={1300} seed="gather" />}
      <div style={{ position: "absolute", left: gx - (13 * cell) / 2, top: 540 - (17 * cell) / 2, opacity: settled ? 1 : 0 }}>
        <Ghost cell={cell} />
      </div>
      <div style={{ position: "absolute", left: gx + (13 * cell) / 2 + 56, top: 540 - (big ? 140 : 124), opacity: word, transform: `translateX(${(1 - word) * -30}px)` }}>
        <div style={{ fontFamily: T.display, fontSize: big ? 150 : 128, fontWeight: 600, letterSpacing: "-0.035em", color: T.text, lineHeight: 1 }}>
          atypica<span style={{ color: T.accent }}>.AI</span>
        </div>
        <div style={{ fontFamily: T.display, fontSize: big ? 98 : 84, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 6, lineHeight: 1 }}>Interview</div>
      </div>
      {tagline && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", opacity: sub, fontFamily: T.display, fontSize: 40, fontWeight: 500, letterSpacing: "-0.01em", color: T.text }}>
          The first AI Moderator to pass the <span style={{ color: T.accent }}>Turing test.</span>
        </div>
      )}
      <AbsoluteFill style={{ background: T.accent, opacity: flash * 0.5, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

// 场景之间的像素擦除转场：一排排绿色方块扫过
const PixelWipe: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / dur;
  const cols = 24, rows = 14, cw = 1920 / cols, ch = 1080 / rows;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const x = i % cols, y = Math.floor(i / cols);
        const d = (x / cols) * 0.6 + ((y * 7 + x * 3) % 5) / 25;
        const v = interpolate(t, [d, d + 0.2, d + 0.35, d + 0.55], [0, 1, 1, 0], clamp);
        return <rect key={i} x={x * cw} y={y * ch} width={cw + 1} height={ch + 1} fill={T.accent} opacity={v} />;
      })}
    </svg>
  );
};

// ---------- 全片 ----------
export const Film: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 音乐：对白时压低，主标和片尾推上去 */}
      <Audio src={staticFile("music-b-full.mp3")} volume={(fr) => {
        const t = fr / FPS;
        return interpolate(t,
          [0, SEG.title[0] - 0.05, SEG.title[0], SEG.qual[0] - 0.2, SEG.qual[0] + 0.4, FINAL_HIT - 0.3, FINAL_HIT, 50.2, 51],
          [0.16, 0.18, 0.6, 0.55, 0.12, 0.13, 0.62, 0.62, 0], clamp);
      }} />
      {/* 对白：每句一条，单独一份列表，不和字幕共用（skill 铁律） */}
      {LINES.map((l) => (
        <Sequence key={l.id} from={at(l.at)} durationInFrames={s(l.dur)} layout="none">
          <Audio src={staticFile(`vo/${l.id}.mp3`)} startFrom={s(l.from ?? 0)}
            volume={(fr) => interpolate(fr, [s(l.dur) - 5, s(l.dur)], [1, 0], clamp)} />
        </Sequence>
      ))}

      {/* 1. 冷开场：访谈界面，主持人只叫 "Moderator" */}
      <Sequence from={at(SEG.cold[0])} durationInFrames={len(SEG.cold)}>
        <ColdOpen />
      </Sequence>

      {/* 2. 主标 */}
      <Sequence from={at(SEG.title[0])} durationInFrames={len(SEG.title)}><Headline /></Sequence>

      {/* 3. logo */}
      <Sequence from={at(SEG.logo[0])} durationInFrames={len(SEG.logo)}><LogoLockup tagline={false} /></Sequence>

      {/* 4. 定性深访（耳机这场） */}
      <Sequence from={at(SEG.qual[0])} durationInFrames={len(SEG.qual)}><Qual /></Sequence>

      {/* 5. 产品体验测试（护手霜） */}
      <Sequence from={at(SEG.hc[0])} durationInFrames={len(SEG.hc)}><Product /></Sequence>

      {/* 6. 收尾 */}
      <Sequence from={at(SEG.outro[0])} durationInFrames={len(SEG.outro)}><LogoLockup big /></Sequence>

      {/* 段落之间的像素转场 */}
      {[SEG.qual[0], SEG.hc[0]].map((t) => (
        <Sequence key={t} from={at(t) - 8} durationInFrames={16}><PixelWipe dur={16} /></Sequence>
      ))}
      <Grain />
    </AbsoluteFill>
  );
};

// 冷开场：一通正在进行的访谈。主持人追问的同时，受访者窗口和侧拍都在。
const ColdOpen: React.FC = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, len(SEG.cold)], [1, 1.04]);
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <CallUI t0={SEG.cold[0]} revealAI={false} topic="Hand cream · in-home test" participant="Participant"
        mod={{ src: "clips/mod-q1.mp4", startFrom: s(0) }}
        p={{ src: "clips/her-a1.mp4", startFrom: s(0) }}
        cam={{ src: "clips/side1.mp4", startFrom: s(2.6), origin: "30% 55%", scale: 1.15 }} />
    </AbsoluteFill>
  );
};

// 定性深访：他说 outfit → 主持人追问 → 他没听懂 → 主持人道歉、换个问法
const Qual: React.FC = () => {
  const t0 = SEG.qual[0];
  const rel = (sec: number) => s(sec - t0);
  return (
    <AbsoluteFill>
      {/* 章节标：耳机棚拍运镜（veo 只有前 2.5 秒能用） */}
      <Sequence durationInFrames={rel(11.6)}>
        <Chapter n="01" name="Headphones" label="DEPTH INTERVIEW · WEARING IT" src="clips/hp-hero.mp4" startFrom={6} />
      </Sequence>
      {/* 他在说：受访者占大窗 */}
      <Sequence from={rel(11.6)} durationInFrames={rel(14.8) - rel(11.6)}>
        <CallUI t0={11.6} focus="p" topic="Headphones · depth interview" participant="Participant"
          mod={{ src: "clips/mod-listen.mp4" }} p={{ src: "clips/him-a6.mp4", startFrom: s(0.4) }} cam={{ src: "clips/hs.mp4", startFrom: s(2) }} />
        <Sequence from={s(0.5)}><Slogan lines={["IT LISTENS."]} /></Sequence>
      </Sequence>
      {/* 主持人追问：主持人占大窗 */}
      <Sequence from={rel(14.8)} durationInFrames={rel(18.2) - rel(14.8)}>
        <CallUI t0={14.8} focus="mod" topic="Headphones · depth interview" participant="Participant"
          mod={{ src: "clips/mod-q6.mp4", startFrom: s(1.8) }} p={{ src: "clips/him-a7.mp4" }} cam={{ src: "clips/hs.mp4", startFrom: s(6) }} />
        <Sequence from={s(0.6)}><Slogan lines={["IT FOLLOWS UP."]} /></Sequence>
      </Sequence>
      {/* 他没听懂 */}
      <Sequence from={rel(18.2)} durationInFrames={rel(21.0) - rel(18.2)}>
        <CallUI t0={18.2} focus="p" topic="Headphones · depth interview" participant="Participant"
          mod={{ src: "clips/mod-listen.mp4", startFrom: s(3) }} p={{ src: "clips/him-a8.mp4", startFrom: s(2.2) }} cam={{ src: "clips/hs.mp4", startFrom: s(10) }} />
      </Sequence>
      {/* 主持人道歉、换个问法 */}
      <Sequence from={rel(21.0)} durationInFrames={len(SEG.qual) - rel(21.0)}>
        <CallUI t0={21.0} focus="mod" topic="Headphones · depth interview" participant="Participant"
          mod={{ src: "clips/mod-q8.mp4", startFrom: s(0) }} p={{ src: "clips/him-adjust.mp4" }} cam={{ src: "clips/hs.mp4", startFrom: s(14) }}
          insights={INSIGHTS.qual} insightAt={23.2} />
        <Sequence from={s(0.5)}><Slogan lines={["IT REPHRASES.", "NO SCRIPT."]} accent={1} /></Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};

// 产品体验测试：章节标 → 挤护手霜 → 抹开 → 追问"是跟什么比" → 回答 → 洞察
const Product: React.FC = () => {
  const t0 = SEG.hc[0];
  const rel = (sec: number) => s(sec - t0);
  return (
    <AbsoluteFill>
      {/* 章节标：棚拍运镜 + 膏体微距 */}
      <Sequence durationInFrames={rel(26.4)}>
        <Chapter n="02" name="Hand Cream" label="LIVE PRODUCT TEST" src="clips/hc-hero.mp4" startFrom={12} />
      </Sequence>
      <Sequence from={rel(26.4)} durationInFrames={rel(27.2) - rel(26.4)}>
        <AbsoluteFill><OffthreadVideo src={staticFile("clips/hc-macro.mp4")} muted startFrom={s(2.6)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
      </Sequence>
      {/* 主持人："Go ahead and put some on your hand." 产品机位占大窗：她挤护手霜 */}
      <Sequence from={rel(27.2)} durationInFrames={rel(30.6) - rel(27.2)}>
        <CallUI t0={27.2} focus="cam" topic="Hand cream · in-home test" participant="Participant"
          mod={{ src: "clips/mod-q2.mp4", startFrom: s(0) }} p={{ src: "clips/her-a3.mp4" }}
          cam={{ src: "clips/tu-squeeze.mp4", startFrom: s(0.4), origin: "40% 62%", scale: 1.45 }} />
        <Sequence from={s(0.4)}><Slogan lines={["THEY TRY IT."]} pos="bl" /></Sequence>
      </Sequence>
      {/* 她："It absorbs really quickly." 产品机位：抹开 */}
      <Sequence from={rel(30.6)} durationInFrames={rel(32.5) - rel(30.6)}>
        <CallUI t0={30.6} focus="cam" topic="Hand cream · in-home test" participant="Participant"
          mod={{ src: "clips/mod-listen.mp4" }} p={{ src: "clips/her-a3.mp4", startFrom: s(2) }}
          cam={{ src: "clips/s2-rub.mp4", startFrom: s(0.4), origin: "62% 66%", scale: 1.35 }} />
      </Sequence>
      {/* 主持人追问："You mentioned it absorbs really quickly. What are you comparing it with?" */}
      <Sequence from={rel(32.5)} durationInFrames={rel(38.0) - rel(32.5)}>
        {/* 这句只在第二场里有，第二场没有录屏：大窗用第二场侧拍（能看到她在听、屏幕上是主持人），
            主持人小窗用第一场里他说话的画面，口型对不上，所以放小 */}
        <CallUI t0={32.5} focus="cam" topic="Hand cream · in-home test" participant="Participant"
          mod={{ src: "clips/mod-q6.mp4", startFrom: s(0.2) }} p={{ src: "clips/her-a1.mp4", startFrom: s(1) }}
          cam={{ src: "clips/s2-explain.mp4", startFrom: s(0), origin: "34% 50%", scale: 1.25 }} />
        <Sequence from={s(1.2)}><Slogan lines={["IT ASKS", "WHY."]} accent={1} /></Sequence>
      </Sequence>
      {/* 她解释：冬天厚重的护手霜、要打字 */}
      <Sequence from={rel(38.0)} durationInFrames={len(SEG.hc) - rel(38.0)}>
        <CallUI t0={38.0} focus="cam" topic="Hand cream · in-home test" participant="Participant"
          mod={{ src: "clips/mod-listen.mp4", startFrom: s(2) }} p={{ src: "clips/her-a1.mp4", startFrom: s(3) }}
          cam={{ src: "clips/s2-explain.mp4", startFrom: s(1.5), origin: "56% 58%", scale: 1.3 }}
          insights={INSIGHTS.hc} insightAt={43.0} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.08 }}>
      <svg width="100%" height="100%">
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 8} /></filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};
