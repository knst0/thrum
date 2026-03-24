import type { HandleBounds, HandleRect, HandleId, HandlePosition, HandleType } from "./types.ts";

function inferHandlePosition(r: DOMRect, nodeRect: DOMRect): HandlePosition {
  const dx = r.left + r.width / 2 - (nodeRect.left + nodeRect.width / 2);
  const dy = r.top + r.height / 2 - (nodeRect.top + nodeRect.height / 2);
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
}

export function computeHandleBounds(nodeEl: HTMLElement): HandleBounds {
  const nodeRect = nodeEl.getBoundingClientRect();
  const handles = Array.from(nodeEl.querySelectorAll<HTMLElement>("[data-handleid]"));

  const source: HandleRect[] = [];
  const target: HandleRect[] = [];

  for (const handle of handles) {
    const r = handle.getBoundingClientRect();
    const type = (handle.dataset["handletype"] ?? "source") as HandleType;
    const rect: HandleRect = {
      id: (handle.dataset["handleid"] ?? "") as HandleId,
      position: inferHandlePosition(r, nodeRect),
      x: r.left - nodeRect.left,
      y: r.top - nodeRect.top,
      width: r.width,
      height: r.height,
    };
    if (type === "source") source.push(rect);
    else target.push(rect);
  }

  return { source, target };
}

export function resolveHandleCenter(
  handleBounds: HandleBounds | null,
  handleId: HandleId | undefined,
  type: HandleType,
  nodeWidth: number,
  nodeHeight: number,
): { x: number; y: number; position: HandlePosition } {
  const handles = type === "source" ? handleBounds?.source : handleBounds?.target;

  if (handles && handles.length > 0) {
    // Safe: handles.length > 0 is checked above; find falls back to [0] which exists.
    const handle = (handleId ? (handles.find((h) => h.id === handleId) ?? handles[0]) : handles[0])!;
    return {
      x: handle.x + handle.width / 2,
      y: handle.y + handle.height / 2,
      position: handle.position,
    };
  }

  // Fallback before first DOM measurement
  return type === "source" ? { x: nodeWidth, y: nodeHeight / 2, position: "right" } : { x: 0, y: nodeHeight / 2, position: "left" };
}
