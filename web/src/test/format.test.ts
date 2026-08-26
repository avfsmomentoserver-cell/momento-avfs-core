import { clamp01 } from "@/lib/format";

describe("clamp01", () => {
  it("clamps negative values to 0", () => {
    expect(clamp01(-0.2)).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(1.4)).toBe(1);
  });

  it("passes through boundary values unchanged", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });

  it("resolves nullish and NaN inputs to 0", () => {
    expect(clamp01(null)).toBe(0);
    expect(clamp01(undefined)).toBe(0);
    expect(clamp01(NaN)).toBe(0);
  });

  it("passes through in-range values unchanged", () => {
    expect(clamp01(0.55)).toBe(0.55);
  });
});