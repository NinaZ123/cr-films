import React from "react";
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { T, ZH } from "./theme";
import { Intro, INTRO_SEC } from "./Intro";
import { Ghost, PixelGrid } from "./Ghost";
import {
  Sample, Stage, FloatingUI, Caption, words, s, FPS, DROP_AT, HIT, Zh,
} from "./Sample";

// 完整版（脚本 v7）。0–31.1s 原样播放已确认的样片 v6（Sample 组件，一帧不改），
// 31.1s 起接两个能力段和收尾。
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 样片里"炸"那段最后是 logo（DROP_AT + 6.2 起），完整版在这里接走
// v15：整片压到 60 秒内。各段内部的节点都写在这里，画面和对白共用，改一处就一起动。
const HANDOFF = DROP_AT + 6.0;               // 28.7
// 01 深访：章节卡 → 1 秒耳机空镜 → 他说 outfit → AI 追问
const D = { card: 1.0, hero: 0.8, p: 3.55, gap: 0.4, m: 5.0, tail: 0.15 };
const D_P = D.card + D.hero;                 // 他开口
const D_M = D_P + D.p + D.gap;               // AI 开口（vo/outfit.mp3 6.9s 起）
const D_LEN = D_M + D.m + D.tail;            // 10.9
// 02 产品测试：章节卡 → 护手霜空镜 → 膏体 → AI 说试试 → 侧拍挤出来 → 完整界面问感受
const P = { card: 1.0, hero: 0.8, macro: 0.5, ask: 2.9, side: 1.3, feel: 7.0 };
const P_HERO = P.card, P_MACRO = P_HERO + P.hero, P_ASK = P_MACRO + P.macro, P_SIDE = P_ASK + P.ask, P_FEEL = P_SIDE + P.side;
const P_LEN = P_FEEL + P.feel;               // 13.5
const END_LOGO = 2.4;                        // 收尾三拍之后 logo 落定
const END_LEN = 5.0;
const T_DEPTH = [HANDOFF, HANDOFF + D_LEN];
const T_TEST = [T_DEPTH[1], T_DEPTH[1] + P_LEN];
const T_END = [T_TEST[1], T_TEST[1] + END_LEN];
const BED_IN = DROP_AT + 3.6;                 // 结尾大鼓段开始收的时候接史诗配乐
const EPIC_SHIFT = T_END[0] + END_LOGO - 61.0; // 正片时间 - hype-b 时间：它 61.0s 的最后一记大鼓落在收尾 logo 上（切入点约在它 31.8s，停顿之后往上冲的地方）
export const FILM_TOTAL = 2 + s(INTRO_SEC + T_END[1]);

// ---------- 章节卡：大号编号 + 标题，从左滑入，背景是像素网格 ----------
const ChapterCard: React.FC<{ n: string; title: string; sub: string; zh?: string }> = ({ n, title, sub, zh }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f, fps, config: { damping: 16, stiffness: 200 } });
  const b = spring({ frame: f - 5, fps, config: { damping: 18, stiffness: 180 } });
  const c = interpolate(f, [10, 22], [0, 1], { ...clamp, easing: ease });
  return (
    <Stage>
      <PixelGrid opacity={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, fontSize: 300, fontWeight: 500, letterSpacing: T.tight, color: T.accent, lineHeight: 0.85, opacity: a, transform: `scale(${1.25 - 0.25 * a})`, textShadow: `0 0 90px ${T.accentSoft}` }}>{n}</div>
        <div style={{ fontFamily: T.display, fontSize: 128, fontWeight: 500, letterSpacing: T.tight, color: "#fff", lineHeight: 0.95, marginTop: 10, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>{title}</div>
        <Zh size={64} text={zh} style={{ opacity: b, marginTop: 22 }} />
        <div style={{ fontFamily: T.mono, fontSize: 30, letterSpacing: "0.3em", color: T.dim, marginTop: 28, opacity: c }}>{sub}</div>
      </AbsoluteFill>
    </Stage>
  );
};

// 角落口号（同样片的 Slogan 风格，放左上）
const Corner: React.FC<{ children: React.ReactNode; zh?: React.ReactNode }> = ({ children, zh }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 15, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{
      position: "absolute", left: 60, top: 54, padding: "26px 34px 30px", borderRadius: 28,
      background: "rgba(8,8,8,0.72)", backdropFilter: "blur(18px)",
      fontFamily: T.display, fontWeight: 500, fontSize: 112, lineHeight: 0.92,
      letterSpacing: T.tight, color: "#fff",
      opacity: t > 0.01 ? 1 : 0, transform: `translateY(${(1 - t) * 40}px) scale(${1.12 - 0.12 * t})`, transformOrigin: "left top",
    }}>{children}<Zh size={52} text={zh} style={{ marginTop: 20 }} /></div>
  );
};

// 左侧大字（和右侧卡片并排时用）
const BigLeft: React.FC<{ lines: string[]; accent?: number; zh?: React.ReactNode }> = ({ lines, accent = -1, zh }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div>
      {lines.map((l, i) => {
        const t = spring({ frame: f - 3 - i * 5, fps, config: { damping: 14, stiffness: 240, mass: 0.6 } });
        return <div key={i} style={{ fontFamily: T.display, fontWeight: 500, fontSize: 180, lineHeight: 0.9, letterSpacing: T.tight, color: i === accent ? T.accent : "#fff", opacity: t > 0.01 ? 1 : 0, transform: `translateX(${(1 - t) * -50}px)`, filter: `blur(${(1 - t) * 8}px)` }}>{l}</div>;
      })}
      <Zh size={64} text={zh} style={{ marginTop: 30 }} />
    </div>
  );
};

// 产品棚拍镜头 + 章节标（浅色）
const ProductShot: React.FC<{ src: string; startFrom?: number; label?: string; zh?: string }> = ({ src, startFrom = 0, label, zh }) => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [0, 5], [0.6, 0], clamp);
  const t = interpolate(f, [4, 16], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ background: T.light }}>
      <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {label && (
        <div style={{ position: "absolute", left: 80, top: 70, padding: "26px 34px 28px", borderRadius: 24, background: "rgba(244,243,240,0.82)", backdropFilter: "blur(14px)", fontFamily: T.display, color: T.ink, opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
          <div style={{ fontFamily: T.mono, fontSize: 24, letterSpacing: "0.24em", opacity: 0.6 }}>PRODUCT</div>
          <div style={{ fontSize: 96, fontWeight: 300, letterSpacing: T.tight, marginTop: 6 }}>{label}</div>
          <Zh size={48} color={T.ink} text={zh} style={{ marginTop: 8, opacity: 0.75 }} />
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
  const card = s(D.card);
  const p0 = s(D_P);                 // 他说话，从音频 0.6s（"and the third…"）开始
  const m0 = s(D_M);                 // 主持人追问，音频 6.9s 起（"That's interesting" 在 7.04s）
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={card}><ChapterCard n="01" title="Depth interview" sub="IT DIGS DEEPER" zh="深度访谈" /></Sequence>
      <Sequence from={card} durationInFrames={p0 - card}><ProductShot src="clips/hp-hero.mp4" startFrom={s(3.0)} label="Headphones" zh="耳机" /></Sequence>
      <Sequence from={p0} durationInFrames={m0 - p0}>
        <UIPan src="clips/ui-outfit.mp4" startFrom={s(0.6)} push={[0, s(3.4)]}>
          <Caption who="Participant" words={words("the@0.02 third@0.30 purpose@0.60 actually@1.06 is@1.60 part@2.24 of@2.52 the@2.74 outfit.@2.96")} keys={["outfit."]} zh="第三个用途，@0.02 其实是@1.06 *穿搭的一部分@2.24" />
        </UIPan>
      </Sequence>
      <Sequence from={m0}>
        <ModClose src="clips/hd-q6b.mp4" startFrom={0} dur={D.m + D.tail}>
          <Caption who="AI Moderator" ai words={words("That's@0.14 interesting.@0.68 You@1.86 mentioned@2.02 them@2.28 being@2.50 part@2.68 of@2.96 the@3.08 outfit.@3.14 What@4.10 makes@4.24 you@4.42 say@4.54 that?@4.72")} keys={["outfit.", "What"]} zh="很有意思，@0.14 你说它是@1.86 *穿搭的一部分，@2.68 *为什么这么说？@4.10" />
          <Sequence from={s(2.9)}><Corner zh={<>它听懂了<span style={{ color: T.accent }}>你的言外之意</span></>}>It hears<br /><span style={{ color: T.accent }}>what you meant.</span></Corner></Sequence>
        </ModClose>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- 02 产品体验测试：护手霜，边用边问 ----------
// vo/tryit.mp3（原片 82.0s 起）："I understand. Let's try this one. Go ahead and put some of the cream on your hand."
// vo/feel.mp3（原片 96.5s 起）："What does it feel like on your skin right now?" / "It feels very wet and have a good smell, moisturizing and hydrating."
const Test: React.FC = () => {
  const card = s(P.card);
  const hero = s(P_HERO), macro = s(P_MACRO), ask = s(P_ASK);
  const side = s(P_SIDE);            // 侧拍：她拿起护手霜、挤到手上
  const feel = s(P_FEEL);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={card}><ChapterCard n="02" title="Live product test" sub="THEY TRY IT. IT ASKS." zh="现场产品测试" /></Sequence>
      <Sequence from={hero} durationInFrames={macro - hero}><ProductShot src="clips/hc-hero.mp4" startFrom={12} label="Hand Cream" zh="护手霜" /></Sequence>
      <Sequence from={macro} durationInFrames={ask - macro}><ProductShot src="clips/hc-macro.mp4" startFrom={s(2.6)} /></Sequence>
      {/* 主持人："Let's try this one. Go ahead and put some of the cream on your hand." */}
      <Sequence from={ask} durationInFrames={feel - ask}>
        <ModClose src="clips/hd-q2.mp4" startFrom={s(1.1)} dur={P.ask}>
          <Caption who="AI Moderator" ai words={words("Let's@0.10 try@0.42 this@0.52 one.@0.72 Go@1.22 ahead@1.34 and@1.50 put@1.60 some@1.72 of@1.88 the@1.96 cream@2.02 on@2.22 your@2.38 hand.@2.52")} keys={["cream"]} zh="我们来试试这款，@0.10 取一点@1.22 *抹在手上吧@2.02" />
        </ModClose>
      </Sequence>
      <Sequence from={side} durationInFrames={feel - side}>
        <SideCard src="clips/tu-squeeze.mp4" startFrom={s(1.0)} label="PRODUCT CAM" />
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
          <BigLeft lines={["They", "try it."]} accent={1} zh={<>受访者<span style={{ color: T.accent }}>亲手试用</span></>} />
        </AbsoluteFill>
      </Sequence>
      {/* 完整界面：主持人问感受，她边抹边答；镜头推到她的小窗 */}
      <Sequence from={feel}>
        <UIPan src="clips/ui-q3.mp4" push={[s(2.4), s(6.0)]}>
          <Sequence durationInFrames={s(2.6)}>
            <Caption who="AI Moderator" ai words={words("What@0.00 does@0.42 it@0.54 feel@0.66 like@0.84 on@1.10 your@1.26 skin@1.38 right@1.66 now?@1.90")} keys={["feel"]} zh="现在皮肤上@0.66 是什么@1.10 *感觉？@1.38" />
          </Sequence>
          <Sequence from={s(2.7)}>
            <Caption who="Participant" words={words("It@0.20 feels@0.24 very@0.96 wet@1.68 and@2.40 have@3.34 a@3.68 good@3.78 smell,@3.94 moisturizing@4.58 and@5.10 hydrating.@5.82")} keys={["wet", "smell,", "hydrating."]} zh="感觉@0.24 *很水润，@1.68 味道也@3.34 *很好闻@3.78" />
          </Sequence>
          <Sequence from={s(0.3)} durationInFrames={s(2.6)}><Corner zh={<span style={{ color: T.accent }}>它边看边问</span>}><span style={{ color: T.accent }}>It asks.</span></Corner></Sequence>
        </UIPan>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- 收尾 ----------
const END_LINES = [
  { at: 0.0, l1: "Hour-long.", l2: "", zh: "可支持 1 小时" },
  { at: 0.6, l1: "Hour-long.", l2: "Live.", zh: "可支持 1 小时　实时进行" },
  { at: 1.2, l1: "Hour-long.", l2: "Live. On camera.", zh: "可支持 1 小时　实时进行　全程出镜" },
];
const End: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  const logoAt = s(END_LOGO);
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
          <div style={{ fontFamily: T.display, fontWeight: 500, fontSize: 168, lineHeight: 0.92, letterSpacing: T.tight, color: "#fff" }}>{cur.l1}</div>
          {cur.l2 && <div style={{ fontFamily: T.display, fontWeight: 500, fontSize: 168, lineHeight: 0.92, letterSpacing: T.tight, color: T.accent, transform: `scale(${1.3 - 0.3 * sp})`, filter: `blur(${(1 - sp) * 10}px)` }}>{cur.l2}</div>}
          <Zh size={64} text={cur.zh} style={{ marginTop: 36 }} />
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
            <div style={{ fontFamily: T.display, fontSize: 140, fontWeight: 500, letterSpacing: T.tight, color: T.text, lineHeight: 1 }}>atypica<span style={{ color: T.accent }}>.AI</span></div>
            <div style={{ fontFamily: T.display, fontSize: 92, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, marginTop: 6, lineHeight: 1 }}>Interview</div>
          </div>
        </div>
        <div style={{ opacity: b, transform: `translateY(${(1 - b) * 16}px)`, fontFamily: T.display, fontSize: 46, fontWeight: 500, color: T.text, letterSpacing: "-0.01em" }}>
          The first AI Moderator to pass the <span style={{ color: T.accent }}>Turing test.</span>
          <Zh size={38} text={<>首个通过<span style={{ color: T.accent }}>图灵测试</span>的 AI 主持人</>} style={{ textAlign: "center", marginTop: 14 }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: T.accent, opacity: flash * 0.4, mixBlendMode: "screen" }} />
    </Stage>
  );
};

// ---------- 合成 ----------
// 首帧：播放器没点开时显示的是第 0 帧，所以把片头落定那一帧的截图（public/poster.png，= 片头 1.1s）
// 静态放在最前面 2 帧，不然封面是黑的。用截图而不是重放片头，是为了不带进片头的音效。之后片头从头正常播。
const POSTER_FRAMES = 2;
const Poster: React.FC = () => <Img src={staticFile("poster.png")} style={{ width: "100%", height: "100%" }} />;
export const FullFilm: React.FC<{ zh?: boolean }> = ({ zh = false }) => (
  <ZH.Provider value={zh}>
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={POSTER_FRAMES}><Poster /></Sequence>
    <Sequence from={POSTER_FRAMES} durationInFrames={s(INTRO_SEC)}><Intro /></Sequence>
    <Sequence from={POSTER_FRAMES + s(INTRO_SEC)}><Main /></Sequence>
  </AbsoluteFill>
  </ZH.Provider>
);

// 片头之后的正片（时间从 0 算，0–31.1s 是锁定的样片 v6）
const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* 0–31.1s：已确认的样片画面；声音换成 film 版（music-b-full 原版：主标用带人声的炸裂段，drop 用同一首的结尾大鼓段） */}
    <Sequence durationInFrames={s(HANDOFF)}><Sample music="film" /></Sequence>

    {/* drop 之后到片尾：一整首预告片式史诗配乐（music-inst-hype-b：braams、太鼓、弦乐推进），中间不换歌。
        drop 结尾大鼓收掉时，从它停顿之后往上冲的地方接进来，一路往上推（它 61s 的大鼓落在收尾三拍上）。有对白时压低。 */}
    <Sequence from={s(BED_IN)} durationInFrames={s(T_END[0] + END_LOGO + 0.4 - BED_IN)} layout="none">
      <Audio src={staticFile("music-inst-hype-b.mp3")} startFrom={s(BED_IN - EPIC_SHIFT)} volume={(fr) => {
        const t = fr / FPS + BED_IN;
        const talk = (a: number, b: number) => (t > a - 0.25 && t < b + 0.25 ? 1 : 0);
        const dialogue = Math.max(
          talk(T_DEPTH[0] + D_P, T_DEPTH[1]),
          talk(T_TEST[0] + P_ASK, T_TEST[0] + P_SIDE),
          talk(T_TEST[0] + P_FEEL, T_TEST[1]),
        );
        const base = interpolate(t, [BED_IN, BED_IN + 1.0, T_END[0] + END_LOGO, T_END[0] + END_LOGO + 0.4], [0.5, 0.75, 0.85, 0], clamp);
        return base * (dialogue ? 0.4 : 1);
      }} />
    </Sequence>
    {/* 收尾：drive 一路燃到三拍大字，logo 落定时音乐切断，只剩最后一记冲击 + 定音 */}
    {/* 章节转场 whoosh */}
    {[T_DEPTH[0], T_TEST[0]].map((t) => (
      <Sequence key={t} from={s(t) - 6} layout="none"><Audio src={staticFile("sfx/whoosh.mp3")} volume={0.7} /></Sequence>
    ))}
    {/* 收尾三拍、logo */}
    {[0, 0.6, 1.2].map((d) => (
      <Sequence key={d} from={s(T_END[0] + d) - 10} layout="none"><Audio src={staticFile("sfx/hit.mp3")} volume={0.7} /></Sequence>
    ))}
    <Sequence from={s(T_END[0] + END_LOGO) - 10} layout="none"><Audio src={staticFile("sfx/hit.mp3")} volume={0.95} /></Sequence>
    <Sequence from={s(T_END[0] + END_LOGO) - 3} layout="none"><Audio src={staticFile("sfx/sting.mp3")} volume={0.9} /></Sequence>

    {/* 对白 */}
    {/* 01：他那句（音频 0.6–4.15）和 AI 追问（6.9–11.9）各一段，中间 "So, that's it." 和空白都剪掉 */}
    <Sequence from={s(T_DEPTH[0] + D_P)} durationInFrames={s(D.p)} layout="none">
      <Audio src={staticFile("vo/outfit.mp3")} startFrom={s(0.6)} volume={(fr) => interpolate(fr, [s(D.p) - 4, s(D.p)], [1, 0], clamp)} />
    </Sequence>
    <Sequence from={s(T_DEPTH[0] + D_M)} durationInFrames={s(D.m)} layout="none">
      <Audio src={staticFile("vo/outfit.mp3")} startFrom={s(6.9)} />
    </Sequence>
    {/* 02：只到 "…on your hand."（音频 3.84）；感受那句播到 "good smell,"（7.02）淡出 */}
    <Sequence from={s(T_TEST[0] + P_ASK)} durationInFrames={s(P.ask)} layout="none">
      <Audio src={staticFile("vo/tryit.mp3")} startFrom={s(1.1)} />
    </Sequence>
    <Sequence from={s(T_TEST[0] + P_FEEL)} durationInFrames={s(P.feel)} layout="none">
      <Audio src={staticFile("vo/feel.mp3")} volume={(fr) => interpolate(fr / FPS, [P.feel - 0.25, P.feel], [1, 0], clamp)} />
    </Sequence>

    <Sequence from={s(T_DEPTH[0])} durationInFrames={s(T_DEPTH[1] - T_DEPTH[0])}><Depth /></Sequence>
    <Sequence from={s(T_TEST[0])} durationInFrames={s(T_TEST[1] - T_TEST[0])}><Test /></Sequence>
    <Sequence from={s(T_END[0])} durationInFrames={s(T_END[1] - T_END[0])}><End /></Sequence>
  </AbsoluteFill>
);
