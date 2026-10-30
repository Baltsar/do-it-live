import { AbsoluteFill, Sequence } from "remotion";
import { Aside, FontsReady, hand, INK, ON_BLUE, ON_PAPER, ON_YELLOW, Shout, type Field } from "./look";
import { BUILT_END_SECONDS, BUILT_LINE_SECONDS, BUILT_LINES, builtEndAt, f, type BuiltLine } from "./timeline";

const FIELDS: readonly Field[] = [ON_BLUE, ON_YELLOW, ON_PAPER];

function Claim({ line, field }: { line: BuiltLine; field: Field }) {
  return (
    <AbsoluteFill style={{ background: field.bg, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ ...hand, position: "absolute", left: 72, top: 56, fontSize: 52, color: field.fg, opacity: 0.5 }}>how</div>
      <Shout lines={line.lines} color={field.fg} height={line.note ? 0.6 : 0.68} />
      {line.note ? <Aside text={line.note} color={field.fg} size={72} delay={5} style={{ marginTop: 52 }} /> : null}
    </AbsoluteFill>
  );
}

function End() {
  return (
    <AbsoluteFill style={{ background: ON_BLUE.bg, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <Shout lines={["DO-IT-LIVE-TWO.VERCEL.APP"]} color={ON_BLUE.fg} width={0.88} height={0.3} />
      <Aside text="open source · MIT · built on Nebius Token Factory" color={ON_BLUE.fg} size={60} delay={6} style={{ marginTop: 56 }} />
    </AbsoluteFill>
  );
}

/** Segment 2: how it is built, one claim a frame on alternating fields, then the address, then black. */
export function Built() {
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: INK }}>
        {BUILT_LINES.map((line, i) => (
          <Sequence key={line.lines.join(" ")} from={f(i * BUILT_LINE_SECONDS)} durationInFrames={f(BUILT_LINE_SECONDS)}>
            <Claim line={line} field={FIELDS[i % FIELDS.length]} />
          </Sequence>
        ))}
        <Sequence from={f(builtEndAt())} durationInFrames={f(BUILT_END_SECONDS)}>
          <End />
        </Sequence>
      </AbsoluteFill>
    </FontsReady>
  );
}
