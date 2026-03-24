import { describe, it, expect } from "vitest";
import { clampZoom, zoomAroundPoint, screenToFlow, flowToScreen } from "../store/viewport";

describe("clampZoom", () => {
  it("clamps below minimum", () => {
    expect(clampZoom(0.01, 0.1, 2)).toBe(0.1);
  });

  it("clamps above maximum", () => {
    expect(clampZoom(5, 0.1, 2)).toBe(2);
  });

  it("passes through values in range", () => {
    expect(clampZoom(1, 0.1, 2)).toBe(1);
  });

  it("returns min for NaN input", () => {
    expect(clampZoom(NaN, 0.1, 2)).toBe(0.1);
  });

  it("returns min for non-finite input", () => {
    // Infinity is not finite → returns min
    expect(clampZoom(Infinity, 0.1, 2)).toBe(0.1);
    expect(clampZoom(-Infinity, 0.1, 2)).toBe(0.1);
  });
});

describe("zoomAroundPoint", () => {
  it("zooms in around center", () => {
    const vp = { x: 0, y: 0, zoom: 1 };
    const result = zoomAroundPoint(vp, 2, { x: 0, y: 0 }, 0.1, 4);
    expect(result.zoom).toBe(2);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("zooms in around offset point", () => {
    const vp = { x: 0, y: 0, zoom: 1 };
    const result = zoomAroundPoint(vp, 2, { x: 100, y: 100 }, 0.1, 4);
    expect(result.zoom).toBe(2);
    expect(result.x).toBe(-100);
    expect(result.y).toBe(-100);
  });

  it("clamps zoom to max", () => {
    const vp = { x: 0, y: 0, zoom: 1.5 };
    const result = zoomAroundPoint(vp, 10, { x: 0, y: 0 }, 0.1, 2);
    expect(result.zoom).toBe(2);
  });

  it("handles zero viewport zoom by returning minZoom", () => {
    const vp = { x: 10, y: 20, zoom: 0 };
    const result = zoomAroundPoint(vp, 2, { x: 50, y: 50 }, 0.1, 2);
    expect(result.zoom).toBe(0.1);
  });
});

describe("screenToFlow / flowToScreen round-trip", () => {
  it("identity at zoom=1 offset=0", () => {
    const vp = { x: 0, y: 0, zoom: 1 };
    const point = { x: 42, y: 73 };
    expect(screenToFlow(point, vp)).toEqual(point);
    expect(flowToScreen(point, vp)).toEqual(point);
  });

  it("round-trips with zoom and offset", () => {
    const vp = { x: 50, y: -30, zoom: 1.5 };
    const screen = { x: 200, y: 300 };
    const flow = screenToFlow(screen, vp);
    const back = flowToScreen(flow, vp);
    expect(back.x).toBeCloseTo(screen.x, 10);
    expect(back.y).toBeCloseTo(screen.y, 10);
  });

  it("applies offset and zoom correctly", () => {
    const vp = { x: 100, y: 200, zoom: 2 };
    const result = screenToFlow({ x: 300, y: 400 }, vp);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });
});
