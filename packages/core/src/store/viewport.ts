import type { Viewport, XY } from "../types";

export function clampZoom(zoom: number, min: number, max: number): number {
  if (!Number.isFinite(zoom)) return min;
  return Math.min(Math.max(zoom, min), max);
}

export function zoomAroundPoint(viewport: Viewport, delta: number, point: XY, minZoom: number, maxZoom: number): Viewport {
  if (viewport.zoom === 0) return { ...viewport, zoom: minZoom };
  const newZoom = clampZoom(viewport.zoom * delta, minZoom, maxZoom);
  const ratio = newZoom / viewport.zoom;
  return {
    x: point.x - (point.x - viewport.x) * ratio,
    y: point.y - (point.y - viewport.y) * ratio,
    zoom: newZoom,
  };
}

export function screenToFlow(point: XY, viewport: Viewport): XY {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

export function flowToScreen(point: XY, viewport: Viewport): XY {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}
