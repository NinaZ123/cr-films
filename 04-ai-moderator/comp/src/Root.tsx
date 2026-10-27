import { Composition } from "remotion";
import { Opening, FPS as OFPS, OPENING_TOTAL } from "./Opening";
import { Film, TOTAL } from "./Film";
import { Sample, SAMPLE_TOTAL } from "./Sample";
import { FullFilm, FILM_TOTAL } from "./FullFilm";
import { FPS } from "./script";

export const Root = () => (
  <>
    <Composition id="FullFilm" component={FullFilm} fps={FPS} width={1920} height={1080} durationInFrames={FILM_TOTAL} />
    <Composition id="Sample" component={Sample} fps={FPS} width={1920} height={1080} durationInFrames={SAMPLE_TOTAL} />
    <Composition id="Film" component={Film} fps={FPS} width={1920} height={1080} durationInFrames={TOTAL} />
    {/* 开场样片（三版音乐对比），已定 B，留着对照 */}
    {(["a", "b", "c"] as const).map((m) => (
      <Composition key={m} id={`Opening-${m}`} component={Opening} fps={OFPS} width={1920} height={1080}
        durationInFrames={OPENING_TOTAL} defaultProps={{ music: m }} />
    ))}
  </>
);
