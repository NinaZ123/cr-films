import { Composition } from "remotion";
import { Sample, FPS, TOTAL } from "./Sample";
import { Full, FULL_TOTAL } from "./Full";

export const Root = () => (
  <>
    <Composition id="Sample" component={Sample} fps={FPS} width={1920} height={1080}
      durationInFrames={TOTAL} defaultProps={{ audio: "" }} />
    <Composition id="Full" component={Full} fps={FPS} width={1920} height={1080}
      durationInFrames={FULL_TOTAL} defaultProps={{ audio: "audio/el/el-01.mp3", zhSubs: true }} />
    <Composition id="FullEN" component={Full} fps={FPS} width={1920} height={1080}
      durationInFrames={FULL_TOTAL} defaultProps={{ audio: "audio/el/el-01.mp3", zhSubs: false }} />
  </>
);
