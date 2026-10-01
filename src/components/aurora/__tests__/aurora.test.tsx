import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuroraBackground from "../AuroraBackground";
import GlassPanel from "../GlassPanel";
import DisplayHeading from "../DisplayHeading";

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
});
