import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuroraBackground from "../AuroraBackground";
import GlassPanel from "../GlassPanel";
import DisplayHeading from "../DisplayHeading";
import { respectMotion, fadeUp } from "../motion";

describe("aurora primitives", () => {
  it("AuroraBackground renders the mesh layers and is aria-hidden", () => {
    const { container } = render(<AuroraBackground />);
    expect(container.querySelector(".aurora-bg")).not.toBeNull();
    expect(container.querySelectorAll(".aurora-bg__mesh").length).toBe(2);
    expect(
      container.querySelector(".aurora-bg")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("GlassPanel renders children and forwards className", () => {
    const { getByText, container } = render(
      <GlassPanel className="probe">hi</GlassPanel>,
    );
    expect(getByText("hi")).toBeTruthy();
    expect(container.querySelector(".probe")).not.toBeNull();
  });

  it("DisplayHeading renders its text", () => {
    const { getByText } = render(<DisplayHeading>Title</DisplayHeading>);
    expect(getByText("Title")).toBeTruthy();
  });

  it("respectMotion strips transforms to opacity-only when reduced", () => {
    const reduced = respectMotion(fadeUp, true);
    expect((reduced.hidden as Record<string, unknown>).y).toBeUndefined();
    expect((reduced.show as Record<string, unknown>).opacity).toBe(1);
  });
});
