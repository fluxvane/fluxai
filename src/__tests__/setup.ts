import "@testing-library/jest-dom/vitest";

// jsdom has no canvas backend; return null so the particle background
// takes its unsupported-environment bail-out path instead of logging
// "Not implemented" errors.
HTMLCanvasElement.prototype.getContext = (() => null) as never;
