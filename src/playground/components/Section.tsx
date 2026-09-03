import { type FC, type ReactNode } from "react";
import { renderInline } from "../inline";
import type { SectionSpec } from "../sections";
import { Callout, Prose, SayPrompt } from "../ui/Callout";
import { CodeBlock } from "../ui/CodeBlock";

/**
 * One capability section of the guide: heading, prose, callouts and prompts from
 * the spec, then the interactive demo, then the code sample.
 */
export const Section: FC<{
  /** Content for this section. */
  spec: SectionSpec;
  /** Generated snippet, overriding the spec's static sample. */
  code?: string;
  /** The interactive demo, rendered between the prompts and the code. */
  children?: ReactNode;
}> = ({ spec, code, children }) => {
  const snippet = code ?? spec.code;
  return (
    <section
      id={spec.id}
      className="scroll-mt-[76px] border-b border-line py-10 last:border-b-0"
    >
      <h2 className="mb-2.5 text-[22px] font-semibold tracking-[-0.01em] text-heading md:text-[26px]">
        {spec.title}
      </h2>
      {spec.description?.map((paragraph) => (
        <Prose key={paragraph} text={paragraph} />
      ))}
      {spec.callouts?.map((callout) => (
        <Callout key={callout.label} label={callout.label}>
          {renderInline(callout.text)}
        </Callout>
      ))}
      {spec.prompts?.map((prompt) => (
        <SayPrompt key={prompt}>{prompt}</SayPrompt>
      ))}
      {children}
      {snippet != null && <CodeBlock code={snippet} />}
    </section>
  );
};
