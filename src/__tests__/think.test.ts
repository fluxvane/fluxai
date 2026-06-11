import { describe, it, expect } from "vitest";
import { splitThink } from "../lib/think";

describe("splitThink", () => {
  it("returns plain content untouched", () => {
    const { answer, think, open } = splitThink("Hello world");
    expect(answer).toBe("Hello world");
    expect(think).toBe("");
    expect(open).toBe(false);
  });

  it("extracts a closed think block", () => {
    const { answer, think, open } = splitThink(
      "<think>reasoning here</think>The answer",
    );
    expect(answer).toBe("The answer");
    expect(think).toBe("reasoning here");
    expect(open).toBe(false);
  });

  it("reports an unclosed think block as open", () => {
    const { answer, think, open } = splitThink("<think>still thinking");
    expect(answer).toBe("");
    expect(think).toBe("still thinking");
    expect(open).toBe(true);
  });

  it("handles answer text before a think block", () => {
    const { answer, think } = splitThink("Intro <think>mid</think> done");
    expect(answer).toContain("Intro");
    expect(answer).toContain("done");
    expect(think).toBe("mid");
  });

  it("trims leading whitespace from the answer", () => {
    const { answer } = splitThink("<think>x</think>\n\n  Answer");
    expect(answer).toBe("Answer");
  });
});
