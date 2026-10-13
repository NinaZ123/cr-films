// 图形层：全部用细线、等宽小字、黑色，只有"打孔"和"UNSCHEDULED"用头套绿。
import { AbsoluteFill, useCurrentFrame, random } from "remotion";

const MONO = "Menlo, 'SF Mono', monospace";
const INK = "#111";
export const GREEN = "#5fd14a";

// 打孔卡：6 行 × 10 列小方格，前 holes 个打穿。big 时放在前奏画面左侧。
export const PunchCard = ({ holes, big = false }: { holes: number; big?: boolean }) => {
  const cols = 10, rows = 6, s = big ? 34 : 12, g = big ? 14 : 5;
  const w = cols * s + (cols - 1) * g, h = rows * s + (rows - 1) * g;
  const pos = big ? { left: 170, top: 540 - h / 2 - 40 } : { left: 64, bottom: 72 };
  return (
    <div style={{ position: "absolute", ...pos, fontFamily: MONO, color: INK }}>
      <div style={{ fontSize: big ? 18 : 11, letterSpacing: 2, marginBottom: big ? 18 : 8 }}>
        CARD 07 · {String(holes).padStart(2, "0")} / {cols * rows} PUNCHED
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${s}px)`, gap: g, width: w, height: h }}>
        {Array.from({ length: cols * rows }, (_, i) => (
          <div key={i} style={{ width: s, height: s, border: `1px solid ${INK}`,
            backgroundColor: i < holes ? INK : "transparent" }} />
        ))}
      </div>
    </div>
  );
};

// 翻页牌：5 格，每拍翻一下，翻的那一格有一帧的上下半错位
export const FlipBoard = ({ text, beat }: { text: string; beat: number }) => {
  const f = useCurrentFrame();
  const flipping = f % 12 < 3;
  const chars = text.padEnd(5, " ").slice(0, 5).split("");
  return (
    <div style={{ position: "absolute", right: 64, top: 64, fontFamily: MONO }}>
      <div style={{ display: "flex", gap: 6 }}>
        {chars.map((c, i) => (
          <div key={i} style={{ width: 54, height: 76, backgroundColor: "#141414", color: "#f2f2f2",
            fontSize: 52, lineHeight: "76px", textAlign: "center", position: "relative",
            transform: flipping && i === 4 ? "scaleY(0.82)" : undefined }}>
            {c}
            <div style={{ position: "absolute", left: 0, right: 0, top: 37, height: 2, backgroundColor: "#444" }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, letterSpacing: 2, marginTop: 8, color: INK }}>
        DEPARTURES · SCHEDULE · {text ? "ON TIME" : "— BLANK —"} · {String(beat + 1).padStart(2, "0")}
      </div>
    </div>
  );
};

// 档案标注：左上角两行等宽小字
export const Label = ({ top, sub, warn }: { top: string; sub: string; warn: boolean }) => (
  <div style={{ position: "absolute", left: 64, top: 64, fontFamily: MONO, color: INK }}>
    <div style={{ fontSize: 16, letterSpacing: 3, padding: "4px 8px",
      backgroundColor: warn ? GREEN : "transparent", border: `1px solid ${INK}`, display: "inline-block" }}>{top}</div>
    <div style={{ fontSize: 11, letterSpacing: 2, marginTop: 8 }}>{sub}</div>
    <div style={{ width: 360, height: 1, backgroundColor: INK, marginTop: 10 }} />
  </div>
);

// 大字带句号：粗黑体，放在留白一侧，进场时一帧空、一帧错位
const SIDES = {
  left: { left: 110, top: 430 },
  right: { right: 70, top: 470 },
  top: { left: 0, right: 0, top: 170, textAlign: "center" as const },
  bottom: { left: 300, bottom: 90 },
  endcard: { right: 110, bottom: 110 },
  topright: { right: 110, top: 190 },
  lowleft: { left: 80, bottom: 250 },
  lowright: { right: 80, bottom: 250 },
};
export const BigWord = ({ text, side }: { text: string; side: keyof typeof SIDES }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", ...SIDES[side], fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontWeight: 900, fontSize: 210, letterSpacing: -6, color: INK, mixBlendMode: "multiply",
      transform: f < 2 ? "translateX(-14px)" : undefined, opacity: f < 1 ? 0 : 1 }}>
      {text}
    </div>
  );
};

// 取景框：四角细线，每拍轻微呼吸
export const Viewfinder = ({ beat }: { beat: number }) => {
  const f = useCurrentFrame();
  const k = 1 - (f % 12) / 12;
  const m = 22 + 5 * k * k, L = 40;
  const c = (s: React.CSSProperties) => <div style={{ position: "absolute", width: L, height: L, ...s }} />;
  const b = `1.5px solid ${INK}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {c({ left: m, top: m, borderLeft: b, borderTop: b })}
      {c({ right: m, top: m, borderRight: b, borderTop: b })}
      {c({ left: m, bottom: m, borderLeft: b, borderBottom: b })}
      {c({ right: m, bottom: m, borderRight: b, borderBottom: b })}
      <div style={{ position: "absolute", right: 64, bottom: 64, fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: INK }}>
        LOOK {String(Math.floor(beat / 4) + 1).padStart(2, "0")} / 09 · REC ●
      </div>
    </AbsoluteFill>
  );
};

// 胶片颗粒：每帧换 seed 的 SVG 噪点
export const Grain = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(random(`g${f}`) * 1000);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.32 }}>
      <svg width="100%" height="100%">
        <filter id={`n${f}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${f})`} />
      </svg>
    </AbsoluteFill>
  );
};

// 复印网点：很淡的圆点阵
export const Halftone = () => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.1, mixBlendMode: "multiply",
    backgroundImage: "radial-gradient(#000 0.9px, transparent 1.3px)", backgroundSize: "5px 5px" }} />
);
