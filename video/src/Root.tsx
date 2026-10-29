import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./brand";
import { Pitch, pitchFrames } from "./Pitch";
import { HowItWorks } from "./scenes/HowItWorks";
import { Intro } from "./scenes/Intro";
import { Numbers } from "./scenes/Numbers";
import { Outro } from "./scenes/Outro";
import { SlideLabel } from "./SlideLabel";

const size = { fps: FPS, width: WIDTH, height: HEIGHT };

function LabelPreview() {
  return <SlideLabel text="Drawn live · Kimi-K3 · 1.4 s" tone="draw" />;
}

export function RemotionRoot() {
  return (
    <>
      <Composition id="Pitch" component={Pitch} durationInFrames={pitchFrames()} {...size} />
      <Composition id="Intro" component={Intro} durationInFrames={6 * FPS} {...size} />
      <Composition id="HowItWorks" component={HowItWorks} durationInFrames={30 * FPS} {...size} />
      <Composition id="Numbers" component={Numbers} durationInFrames={13 * FPS} {...size} />
      <Composition id="Outro" component={Outro} durationInFrames={10 * FPS} {...size} />
      <Composition id="Label" component={LabelPreview} durationInFrames={3 * FPS} {...size} />
    </>
  );
}
