import { Composition } from "remotion";
import { filmFrames } from "./live/bars";
import { Board, BOARD_HEIGHT, BOARD_WIDTH } from "./live/Board";
import { LiveFilm } from "./live/Film";
import { Plan, PLAN_HEIGHT, PLAN_WIDTH } from "./live/Plan";
import { FPS, HEIGHT, WIDTH } from "./brand";
import { Built } from "./film/Built";
import { Hook, TitleCard } from "./film/Hook";
import { builtSeconds, f, HOOK_SECONDS } from "./film/timeline";
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
      <Composition id="Hook" component={Hook} durationInFrames={f(HOOK_SECONDS)} {...size} />
      <Composition id="Built" component={Built} durationInFrames={f(builtSeconds())} {...size} />
      <Composition id="TitleCard" component={TitleCard} durationInFrames={3 * FPS} {...size} />
      <Composition id="LiveFilm" component={LiveFilm} durationInFrames={filmFrames()} {...size} />
      {/* As long as the film: Remotion clamps a frozen frame to the length of the composition it sits in. */}
      <Composition id="Plan" component={Plan} durationInFrames={filmFrames()} fps={FPS} width={PLAN_WIDTH} height={PLAN_HEIGHT} />
      <Composition id="Board" component={Board} durationInFrames={filmFrames()} fps={FPS} width={BOARD_WIDTH} height={BOARD_HEIGHT} />
    </>
  );
}
