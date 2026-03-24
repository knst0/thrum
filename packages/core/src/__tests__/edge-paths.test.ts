import { describe, it, expect } from "vitest";
import { getBezierPath, getStraightPath, getStepPath, getSmoothStepPath, getEdgePath, registerEdgePath } from "../edge-paths";
import type { EdgePathParams } from "../types";

const basicParams: EdgePathParams = {
  sourceX: 0,
  sourceY: 0,
  sourcePosition: "right",
  targetX: 200,
  targetY: 100,
  targetPosition: "left",
};

describe("getBezierPath", () => {
  it("produces valid SVG path", () => {
    const result = getBezierPath(basicParams);
    expect(result.path).toMatch(/^M /);
    expect(result.path).toContain("C ");
  });

  it("label is between source and target", () => {
    const result = getBezierPath(basicParams);
    expect(result.labelX).toBeGreaterThanOrEqual(0);
    expect(result.labelX).toBeLessThanOrEqual(200);
    expect(result.labelY).toBeGreaterThanOrEqual(0);
    expect(result.labelY).toBeLessThanOrEqual(100);
  });

  it("handles same point (degenerate)", () => {
    const result = getBezierPath({
      ...basicParams,
      targetX: 0,
      targetY: 0,
    });
    expect(result.path).toMatch(/^M /);
    expect(result.labelX).toBe(0);
  });
});

describe("getStraightPath", () => {
  it("produces simple line path", () => {
    const result = getStraightPath(basicParams);
    expect(result.path).toBe("M 0,0 L 200,100");
  });

  it("label is at midpoint", () => {
    const result = getStraightPath(basicParams);
    expect(result.labelX).toBe(100);
    expect(result.labelY).toBe(50);
  });
});

describe("getStepPath", () => {
  it("produces multi-segment path", () => {
    const result = getStepPath(basicParams);
    expect(result.path).toMatch(/^M /);
    // Step paths have multiple L segments
    expect(result.path.split("L").length).toBeGreaterThan(2);
  });
});

describe("getSmoothStepPath", () => {
  it("produces path with Q curves for normal distances", () => {
    const result = getSmoothStepPath(basicParams);
    expect(result.path).toMatch(/^M /);
    expect(result.path).toContain("Q ");
  });

  it("falls back to straight line for near-zero distances", () => {
    const result = getSmoothStepPath({
      ...basicParams,
      targetX: 0.5,
      targetY: 0.5,
    });
    expect(result.path).toMatch(/^M /);
    expect(result.path).toContain("L ");
    expect(result.path).not.toContain("Q ");
  });
});

describe("edge path registry", () => {
  it("getEdgePath returns bezier by default for unknown types", () => {
    const fn = getEdgePath("unknown-type");
    expect(fn).toBe(getBezierPath);
  });

  it("returns registered path function", () => {
    const fn = getEdgePath("straight");
    expect(fn).toBe(getStraightPath);
  });

  it("allows custom registration", () => {
    const custom = (_params: EdgePathParams) => ({
      path: "M 0,0",
      labelX: 0,
      labelY: 0,
    });
    registerEdgePath("custom-test", custom);
    expect(getEdgePath("custom-test")).toBe(custom);
  });
});
