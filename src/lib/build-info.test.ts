import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("uses the injected immutable build stamp instead of the visitor's current time", async () => {
  vi.stubGlobal("__BUILD_TIME__", "2026-11-07T16:39:00.000Z");
  vi.stubGlobal("__BUILD_ID__", "20261107163900000");
  const info = await import("./build-info");
  expect(info.BUILD_TIME).toBe("2026-11-07T16:39:00.000Z");
  expect(info.BUILD_ID).toBe("20261107163900000");
});

it("does not invent a timestamp when build metadata is missing", async () => {
  const info = await import("./build-info");
  expect(info.BUILD_TIME).toBe("");
  expect(info.BUILD_ID).toBe("dev");
});