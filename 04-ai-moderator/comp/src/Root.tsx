import { Composition } from "remotion";
import { Opening, FPS, OPENING_TOTAL } from "./Opening";

// 三版音乐各一个 Composition，样片对比试听用
export const Root = () => (
  <>
    {(["a", "b", "c"] as const).map((m) => (
      <Composition key={m} id={`Opening-${m}`} component={Opening} fps={FPS} width={1920} height={1080}
        durationInFrames={OPENING_TOTAL} defaultProps={{ music: m }} />
    ))}
  </>
);
