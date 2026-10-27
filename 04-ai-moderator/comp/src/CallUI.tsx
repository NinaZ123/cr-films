import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { T } from "./theme";
import { Ghost } from "./Ghost";
import { FPS, Line, LINES, CLOCK_START } from "./script";

// 重做的"视频访谈界面"：画面里是真实录屏和侧拍，界面是干净的 atypica 风格。
// 左：主持人大窗；右上：受访者摄像头；右下：可选的产品机位（侧拍）；底部：实时逐字稿。
// revealAI=false 时主持人名牌只写 "Moderator"，冷开场不露 AI。

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export type Tile = { src: string; startFrom?: number; fit?: string; origin?: string; scale?: number };

export const CallUI: React.FC<{
  t0: number;                 // 本场景在全片里的开始秒数（用来对齐对白和计时器）
  mod: Tile;                  // 主持人画面
  p: Tile;                    // 受访者摄像头
  cam?: Tile;                 // 产品机位（侧拍竖屏）
  revealAI?: boolean;
  focus?: "mod" | "p" | "cam";  // 当前谁占大窗
  topic: string;
  participant: string;
  insights?: string[];        // 有值时右侧滑出洞察卡
  insightAt?: number;         // 洞察卡出现的全片秒数
}> = ({ t0, mod, p, cam, revealAI = true, focus = "mod", topic, participant, insights, insightAt = 1e9 }) => {
  const f = useCurrentFrame();
  const now = t0 + f / FPS;
  const speaking = LINES.find((l) => now >= l.at && now < l.at + l.dur);
  const enter = interpolate(f, [0, 10], [0, 1], { ...clamp, easing: ease });

  // 布局：1920×1080，外边距 40，顶栏 64，底部逐字稿 190
  const big = { left: 40, top: 128, width: 1180, height: 664 };
  const sideW = 620, sideX = 1260;
  const tiles = { mod, p, cam } as Record<string, Tile | undefined>;
  const order = (["mod", "p", "cam"] as const).filter((k) => tiles[k]);
  const small = order.filter((k) => k !== focus);
  const rect = (k: string) => {
    if (k === focus) return big;
    const i = small.indexOf(k as never);
    const h = small.length === 1 ? 664 : 322;
    return { left: sideX, top: 128 + i * (h + 20), width: sideW, height: h };
  };

  return (
    <AbsoluteFill style={{ background: T.bg, opacity: enter }}>
      <TopBar topic={topic} now={now} />
      {order.map((k) => {
        const r = rect(k);
        const tile = tiles[k]!;
        const isMod = k === "mod";
        const talking = speaking && ((isMod && speaking.who === "mod") || (k === "p" && speaking.who === "p"));
        const name = isMod ? (revealAI ? "AI Moderator" : "Moderator") : k === "p" ? participant : "Product cam";
        return (
          <div key={k} style={{
            position: "absolute", ...r, borderRadius: 22, overflow: "hidden", background: "#000",
            boxShadow: talking ? `0 0 0 3px ${T.accent}, 0 0 40px ${T.accentSoft}` : `0 0 0 1px ${T.line}`,
            transition: "none",
          }}>
            <OffthreadVideo src={staticFile(tile.src)} muted startFrom={tile.startFrom ?? 0}
              style={{
                width: "100%", height: "100%", objectFit: (tile.fit as never) ?? "cover",
                transform: `scale(${tile.scale ?? 1})`, transformOrigin: tile.origin ?? "50% 50%",
                filter: "saturate(0.85) contrast(1.05)",
              }} />
            <NameTag name={name} ai={isMod && revealAI} talking={!!talking} />
          </div>
        );
      })}
      <Transcript now={now} revealAI={revealAI} participant={participant} />
      {insights && <InsightCard items={insights} since={now - insightAt} />}
    </AbsoluteFill>
  );
};

const TopBar: React.FC<{ topic: string; now: number }> = ({ topic, now }) => {
  const f = useCurrentFrame();
  const sec = Math.floor(CLOCK_START + now);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 36, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: T.display, color: T.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Ghost cell={2.6} glow={false} />
        <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>atypica<span style={{ color: T.accent }}>.AI</span> <span style={{ fontWeight: 300 }}>Interview</span></span>
        <span style={{ marginLeft: 18, fontSize: 22, color: T.dim }}>{topic}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: T.mono, fontSize: 22, letterSpacing: "0.08em" }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: "#FF3D4F", opacity: 0.55 + 0.45 * Math.abs(Math.sin(f / 10)) }} />
        <span style={{ color: T.text }}>LIVE</span>
        <span style={{ color: T.dim }}>{mm}:{ss}</span>
      </div>
    </div>
  );
};

const NameTag: React.FC<{ name: string; ai: boolean; talking: boolean }> = ({ name, ai, talking }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", left: 18, bottom: 18, display: "flex", alignItems: "center", gap: 10,
      padding: "8px 14px", borderRadius: 999, background: "rgba(10,10,10,0.7)", backdropFilter: "blur(10px)",
      fontFamily: T.display, fontSize: 22, fontWeight: 500, color: T.text,
    }}>
      {ai && <Ghost cell={1.5} glow={false} />}
      <span>{name}</span>
      {talking && (
        <span style={{ display: "flex", gap: 3, alignItems: "center", height: 18 }}>
          {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 3, borderRadius: 2, background: T.accent, height: 6 + 12 * Math.abs(Math.sin(f / 3.5 + i * 1.3)) }} />)}
        </span>
      )}
    </div>
  );
};

// 实时逐字稿：当前一句逐词出来，关键词品牌绿；上一句留在上面，变灰
const Transcript: React.FC<{ now: number; revealAI: boolean; participant: string }> = ({ now, revealAI, participant }) => {
  const started = LINES.filter((l) => now >= l.at);
  const cur = started[started.length - 1];
  const prev = started[started.length - 2];
  const row = (l: Line, live: boolean) => {
    const t = now - l.at;
    const shown = live ? l.words.filter(([, a]) => a <= t) : l.words;
    const who = l.who === "mod" ? (revealAI ? "AI Moderator" : "Moderator") : participant;
    return (
      <div style={{ display: "flex", gap: 24, alignItems: "baseline", opacity: live ? 1 : 0.38 }}>
        <span style={{ width: 210, flexShrink: 0, fontFamily: T.mono, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", color: l.who === "mod" ? T.accent : T.dim }}>{who}</span>
        <span style={{ fontFamily: T.display, fontSize: live ? 46 : 30, fontWeight: live ? 600 : 400, letterSpacing: "-0.02em", color: T.text, lineHeight: 1.15 }}>
          {shown.map(([word, a], i) => {
            const k = l.key?.includes(word);
            const pop = live ? interpolate(t - a, [0, 0.12], [0, 1], clamp) : 1;
            return <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: pop, transform: `translateY(${(1 - pop) * 10}px)`, color: k ? T.accent : undefined }}>{word}</span>;
          })}
        </span>
      </div>
    );
  };
  // 这句说完 1.2 秒后淡掉
  const fade = cur ? interpolate(now - (cur.at + cur.dur), [0.6, 1.2], [1, 0], clamp) : 0;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 818, height: 222, borderRadius: 22, background: T.bgSoft, border: `1px solid ${T.line}`, padding: "26px 34px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 34, top: 18, fontFamily: T.mono, fontSize: 16, letterSpacing: "0.2em", color: T.dim }}>LIVE TRANSCRIPT</div>
      <div style={{ opacity: fade, display: "flex", flexDirection: "column", gap: 12 }}>
        {prev && now - (prev.at + prev.dur) < 3 && row(prev, false)}
        {cur && row(cur, true)}
      </div>
    </div>
  );
};

const InsightCard: React.FC<{ items: string[]; since: number }> = ({ items, since }) => {
  const { fps } = useVideoConfig();
  if (since < 0) return null;
  const s = spring({ frame: since * fps, fps, config: { damping: 18, stiffness: 150 } });
  return (
    <div style={{
      position: "absolute", left: 1220 - 40 - 580, top: 792 - 40 - 240, width: 580, minHeight: 240, padding: "30px 34px", borderRadius: 24,
      background: "rgba(17,17,17,0.92)", border: `1px solid ${T.accent}`, boxShadow: `0 0 60px ${T.accentSoft}`,
      backdropFilter: "blur(14px)", opacity: s, transform: `translateX(${(1 - s) * 60}px)`, fontFamily: T.display, color: T.text,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: T.mono, fontSize: 18, letterSpacing: "0.2em", color: T.accent }}>
        <Ghost cell={1.6} glow={false} /> INSIGHT
      </div>
      {items.map((it, i) => {
        const t = interpolate(since, [0.25 + i * 0.25, 0.55 + i * 0.25], [0, 1], clamp);
        return <div key={i} style={{ marginTop: 18, fontSize: 32, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2, opacity: t, transform: `translateY(${(1 - t) * 12}px)` }}>— {it}</div>;
      })}
    </div>
  );
};
