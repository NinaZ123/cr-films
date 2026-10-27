import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, Easing } from "remotion";
import { T } from "./theme";

// 像素拼出界面：绿色方块从四面八方飞进来，按网格落位，拼成界面的轮廓；
// 落定后方块一格一格"翻"成真实画面（由调用方在下面放界面，这里只画方块层）。
// box 是界面在画面上的位置（全景状态）。
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const PixelAssemble: React.FC<{
  box: { x: number; y: number; w: number; h: number };
  gather: [number, number];   // 方块飞入、落位的帧区间
  reveal: [number, number];   // 方块翻成画面的帧区间
  cell?: number;
}> = ({ box, gather, reveal, cell = 32 }) => {
  const f = useCurrentFrame();
  const cols = Math.ceil(box.w / cell), rows = Math.ceil(box.h / cell);
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      // 每格飞入的起点：画面外随机方向；落位时间按到中心的距离错开
      const a = random("a" + i) * Math.PI * 2;
      const d = 900 + random("d" + i) * 900;
      const dist = Math.hypot(c - cols / 2, (r - rows / 2) * 1.6) / Math.hypot(cols / 2, rows * 0.8);
      const g0 = gather[0] + (gather[1] - gather[0]) * 0.55 * (1 - dist) + random("g" + i) * 6;
      const g = interpolate(f, [g0, g0 + (gather[1] - gather[0]) * 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      // 翻成画面：从中心向外扩散
      const r0 = reveal[0] + (reveal[1] - reveal[0]) * 0.75 * dist + random("r" + i) * 3;
      const v = interpolate(f, [r0, r0 + 5], [1, 0], clamp);
      if (g <= 0 || v <= 0) continue;
      const tx = box.x + c * cell, ty = box.y + r * cell;
      const x = tx + Math.cos(a) * d * (1 - g), y = ty + Math.sin(a) * d * (1 - g);
      const flash = interpolate(f, [r0 - 4, r0], [0, 1], clamp);   // 翻之前亮一下
      // 落定后只留描边和很淡的底，像一张网格线框；飞行中的方块亮一些
      const settled = g > 0.98;
      rects.push(
        <rect key={i} x={x + 2} y={y + 2} width={cell - 4} height={cell - 4} rx={2}
          fill={T.accent} fillOpacity={(settled ? 0.08 + 0.55 * flash : 0.6) * v}
          stroke={T.accent} strokeOpacity={(settled ? 0.35 : 0) * v} strokeWidth={1} />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1920} height={1080}>{rects}</svg>
    </AbsoluteFill>
  );
};

// 落位后的扫光：一道绿光从左扫到右，像屏幕通电
export const LightSweep: React.FC<{ box: { x: number; y: number; w: number; h: number }; at: [number, number] }> = ({ box, at }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at[0], at[1]], [-0.2, 1.2], { ...clamp, easing: Easing.inOut(Easing.quad) });
  if (t <= -0.2 || t >= 1.2) return null;
  const x = box.x + box.w * t;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div style={{
        position: "absolute", left: x - 160, top: box.y, width: 320, height: box.h,
        background: `linear-gradient(90deg, transparent, ${T.accent}55 45%, #ffffffaa 50%, ${T.accent}55 55%, transparent)`,
        clipPath: `inset(0 round 26px)`,
      }} />
    </AbsoluteFill>
  );
};
