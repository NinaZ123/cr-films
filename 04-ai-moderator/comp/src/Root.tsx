import { Composition } from "remotion";
import { Opening, FPS, OPENING_TOTAL } from "./Opening";

export const Root = () => (
  <Composition id="Opening" component={Opening} fps={FPS} width={1920} height={1080}
    durationInFrames={OPENING_TOTAL} />
);
