import React from "react";
import { useCurrentFrame, interpolate, random } from "remotion";
import { T } from "./theme";

// atypica 头像 logo（~/Desktop/头像.jpeg）按 14px 一格采样出来的 13×17 像素图
export const GHOST = [
  "...#######...",
  "..#########..",
  ".###########.",
  "#############",
  "#############",
  "#############",
  "###.#####.###",
  "##...###...##",
  "###.#####.###",
  "#############",
  "#############",
  "#############",
  "#############",
  "#############",
  "#############",
  "##.###.###.##",
  "#...#...#...#",
];
export const GHOST_W = GHOST[0].length;
export const GHOST_H = GHOST.length;

const CELLS: { x: number; y: number }[] = [];
GHOST.forEach((row, y) => [...row].forEach((c, x) => c === "#" && CELLS.push({ x, y })));

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 静态小幽灵，cell = 每格像素
export const Ghost: React.FC<{ cell: number; color?: string; glow?: boolean; style?: React.CSSProperties }> = ({ cell, color = T.accent, glow = true, style }) => (
  <svg width={GHOST_W * cell} height={GHOST_H * cell} style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${cell * 1.2}px ${T.accentSoft})` : undefined, ...style }}>
    {CELLS.map((p, i) => <rect key={i} x={p.x * cell} y={p.y * cell} width={cell + 0.5} height={cell + 0.5} fill={color} />)}
  </svg>
);

// 像素爆炸：t 从 0（拼好的小幽灵）到 1（炸到画外），再反向用就是聚回来
export const GhostBurst: React.FC<{ cell: number; t: number; spread?: number; cx: number; cy: number; seed?: string }> = ({ cell, t, spread = 1400, cx, cy, seed = "g" }) => {
  const w = GHOST_W * cell, h = GHOST_H * cell;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {CELLS.map((p, i) => {
        const a = random(seed + i) * Math.PI * 2;
        const d = (0.35 + random(seed + "d" + i) * 0.65) * spread;
        const ox = cx - w / 2 + p.x * cell, oy = cy - h / 2 + p.y * cell;
        const e = 1 - Math.pow(1 - t, 3);
        const x = ox + Math.cos(a) * d * e, y = oy + Math.sin(a) * d * e;
        const s = cell * (1 - 0.55 * t);
        return <rect key={i} x={x} y={y} width={s} height={s} fill={T.accent} opacity={interpolate(t, [0.7, 1], [1, 0], clamp)} />;
      })}
    </svg>
  );
};

// 背景像素网格（贯穿全片的品牌母题），偶尔有格子亮一下
export const PixelGrid: React.FC<{ opacity?: number; cell?: number }> = ({ opacity = 1, cell = 40 }) => {
  const f = useCurrentFrame();
  const cols = Math.ceil(1920 / cell), rows = Math.ceil(1080 / cell);
  const lit = Array.from({ length: 18 }).map((_, i) => {
    const k = Math.floor(f / 9) + i * 37;
    return { x: Math.floor(random("x" + k) * cols), y: Math.floor(random("y" + k) * rows), a: random("a" + k) };
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        <pattern id="pg" width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke="rgba(24,255,25,0.07)" strokeWidth="1" />
        </pattern>
        <radialGradient id="pgv" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#pg)" />
      {lit.map((p, i) => <rect key={i} x={p.x * cell + 1} y={p.y * cell + 1} width={cell - 2} height={cell - 2} fill={T.accent} opacity={0.05 + 0.1 * p.a} />)}
      <rect width="100%" height="100%" fill="url(#pgv)" />
    </svg>
  );
};
