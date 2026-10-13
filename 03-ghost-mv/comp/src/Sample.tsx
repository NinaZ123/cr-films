// 样片：前奏加第一段主歌，15 秒，和歌的长度一致。120 BPM，24fps，一拍 12 帧。
// 底层是 kling 片段，上面叠打孔卡、翻页牌、档案标注、大字、颗粒和网点。
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { PunchCard, FlipBoard, Label, BigWord, Viewfinder, Grain, Halftone } from "./Overlays";

export const FPS = 24;
export const BEAT = 12;

// 剪辑表：(片段, 起拍, 拍数, 从片段第几秒开始)
// 歌 a 实测 120 BPM，拍点在 0.49 + 0.5k 秒，和 12 帧一拍的网格只差 10 毫秒。
// 8.0–8.5 秒（第 16 拍）人声停一拍，8.5 秒副歌 "blank card" 进来：这一拍留白闪卡，副歌从按耳机开始。
const EDL: [string, number, number, number][] = [
  ["g01", 0, 6, 0],
  ["g02", 6, 3, 0.5],
  ["g04", 9, 3, 0],
  ["g03", 12, 4, 0],
  ["g06", 17, 3, 0],
  ["g05", 20, 3, 0],
  ["g07", 23, 6, 0],
];
// 14.5 秒（第 29 拍）音乐在 14.3–15.1 秒自然淡出，不加回声（XD 嫌回声太大）；画面接 2.5 秒收尾卡
export const END = 29 * BEAT;
export const TOTAL = END + 60;

// 下巴露出来的镜头重做过（v3），其余用 v2
const V3 = ["g01", "g06", "g07"];

// 大字：(字, 起拍, 拍数, 放哪边)。放在人物对面的留白里，不压头套
const WORDS: [string, number, number, "left" | "right" | "top" | "bottom"][] = [
  ["ON TIME.", 6, 3, "top"],
  ["APPROVED.", 13, 3, "bottom"],
  ["BLANK.", 17, 3, "right"],
  ["MINE.", 26, 3, "bottom"],
];

// 翻页牌：每拍一个时间，到 g07 后半段翻成空白
const times = (b: number) => (b >= 25 ? "" : `07:${String(b + 1).padStart(2, "0")}`);

export const Sample = ({ audio }: { audio: string }) => {
  const f = useCurrentFrame();
  const beat = Math.floor(f / BEAT);
  const unscheduled = beat >= 17;
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f2" }}>
      {EDL.map(([clip, b0, n, from]) => (
        <Sequence key={clip} from={b0 * BEAT} durationInFrames={n * BEAT}>
          <OffthreadVideo src={staticFile(`vid/${clip}-${V3.includes(clip) ? "v3" : "v2"}.mp4`)} muted startFrom={Math.round(from * FPS)}
            style={{ width: "100%", height: "100%", objectFit: "cover",
                     filter: "contrast(1.12) brightness(1.06)" }} />
        </Sequence>
      ))}
      {/* 第 16 拍：人声停顿，整屏白，大打孔卡全部打满后定格 */}
      <Sequence from={16 * BEAT} durationInFrames={BEAT}>
        <AbsoluteFill style={{ backgroundColor: "#f4f4f2" }} />
        <PunchCard holes={60} big />
      </Sequence>
      <Halftone />
      <Grain />
      <Viewfinder beat={beat} />
      {/* 前奏：打孔卡占画面左半，一拍打一个孔 */}
      <Sequence from={0} durationInFrames={6 * BEAT}><PunchCard holes={beat + 1} big /></Sequence>
      <Sequence from={6 * BEAT}><PunchCard holes={Math.min(beat + 1, 30)} /></Sequence>
      <FlipBoard text={times(beat)} beat={beat} />
      <Label top={unscheduled ? "UNIT 07 · UNSCHEDULED" : "UNIT 07 · ON SCHEDULE"} warn={unscheduled}
        sub={`BOARD · FINAL · ${String(beat + 1).padStart(3, "0")} / 120 BPM`} />
      {WORDS.map(([w, b0, n, side]) => (
        <Sequence key={w} from={b0 * BEAT} durationInFrames={n * BEAT}><BigWord text={w} side={side} /></Sequence>
      ))}
      {/* 收尾卡：白底，卡上只剩一个孔，片名 */}
      <Sequence from={END}>
        <AbsoluteFill style={{ backgroundColor: "#f4f4f2" }} />
        <PunchCard holes={1} big />
        <BigWord text="BLANK CARD." side="endcard" />
        <Label top="UNIT 07 · UNSCHEDULED" warn sub="END OF SCHEDULE · 000 / 120 BPM" />
        <Grain />
      </Sequence>
      {/* 片头片尾的白闪 */}
      <AbsoluteFill style={{ backgroundColor: "white", pointerEvents: "none",
        opacity: interpolate(f, [0, 6, TOTAL - 14, TOTAL], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
