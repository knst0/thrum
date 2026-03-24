import type { EdgePathFunction, EdgePathResult, HandlePosition } from "./types.ts";

// ─── Registry ───

const registry = new Map<string, EdgePathFunction>();

export function registerEdgePath(type: string, fn: EdgePathFunction): void {
  registry.set(type, fn);
}

export function getEdgePath(type: string): EdgePathFunction {
  return registry.get(type) ?? getBezierPath;
}

// ─── Bezier ───

function getControlPoint(x: number, y: number, position: HandlePosition, offset: number): [number, number] {
  switch (position) {
    case "left":
      return [x - offset, y];
    case "right":
      return [x + offset, y];
    case "top":
      return [x, y - offset];
    case "bottom":
      return [x, y + offset];
  }
}

function bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export const getBezierPath: EdgePathFunction = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  curvature = 0.25,
}): EdgePathResult => {
  const distance = Math.sqrt((targetX - sourceX) ** 2 + (targetY - sourceY) ** 2);
  const offset = Math.max(distance * curvature, 20);

  const [scx, scy] = getControlPoint(sourceX, sourceY, sourcePosition, offset);
  const [tcx, tcy] = getControlPoint(targetX, targetY, targetPosition, offset);

  return {
    path: `M ${sourceX},${sourceY} C ${scx},${scy} ${tcx},${tcy} ${targetX},${targetY}`,
    labelX: bezierPoint(sourceX, scx, tcx, targetX, 0.5),
    labelY: bezierPoint(sourceY, scy, tcy, targetY, 0.5),
  };
};

// ─── Straight ───

export const getStraightPath: EdgePathFunction = ({ sourceX, sourceY, targetX, targetY }): EdgePathResult => ({
  path: `M ${sourceX},${sourceY} L ${targetX},${targetY}`,
  labelX: (sourceX + targetX) / 2,
  labelY: (sourceY + targetY) / 2,
});

// ─── Step ───

function getHandleOffset(position: HandlePosition, offset: number): [number, number] {
  switch (position) {
    case "left":
      return [-offset, 0];
    case "right":
      return [offset, 0];
    case "top":
      return [0, -offset];
    case "bottom":
      return [0, offset];
  }
}

export const getStepPath: EdgePathFunction = ({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }): EdgePathResult => {
  const offset = 20;
  const [sox, soy] = getHandleOffset(sourcePosition, offset);
  const [tox, toy] = getHandleOffset(targetPosition, offset);

  const sx1 = sourceX + sox,
    sy1 = sourceY + soy;
  const tx1 = targetX + tox,
    ty1 = targetY + toy;
  const midX = (sx1 + tx1) / 2;
  const midY = (sy1 + ty1) / 2;

  return {
    path: `M ${sourceX},${sourceY} L ${sx1},${sy1} L ${sx1},${midY} L ${tx1},${midY} L ${tx1},${ty1} L ${targetX},${targetY}`,
    labelX: midX,
    labelY: midY,
  };
};

// ─── Smooth Step ───

const BORDER_RADIUS = 5;

function getDirection(pos: HandlePosition): [number, number] {
  switch (pos) {
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    case "top":
      return [0, -1];
    case "bottom":
      return [0, 1];
  }
}

function corner(x: number, y: number, dx: number, dy: number, r: number): string {
  return `Q ${x},${y} ${x + dx * r},${y + dy * r}`;
}

export const getSmoothStepPath: EdgePathFunction = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}): EdgePathResult => {
  const offset = 20;
  const [sdx, sdy] = getDirection(sourcePosition);
  const [tdx, tdy] = getDirection(targetPosition);

  const sx1 = sourceX + sdx * offset,
    sy1 = sourceY + sdy * offset;
  const tx1 = targetX + tdx * offset,
    ty1 = targetY + tdy * offset;
  const midX = (sx1 + tx1) / 2;
  const midY = (sy1 + ty1) / 2;
  const r = BORDER_RADIUS;

  const dx = tx1 - sx1;
  const dy = ty1 - sy1;

  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    return {
      path: `M ${sourceX},${sourceY} L ${targetX},${targetY}`,
      labelX: midX,
      labelY: midY,
    };
  }

  const s1x = Math.sign(midX - sx1),
    s2y = Math.sign(midY - sy1),
    s3x = Math.sign(tx1 - midX),
    s4y = Math.sign(ty1 - midY);

  const path = [
    `M ${sourceX},${sourceY}`,
    `L ${sx1 + s1x * -r},${sy1}`,
    corner(sx1, sy1, 0, s2y, r),
    `L ${sx1},${midY + s2y * -r}`,
    corner(sx1, midY, s3x, 0, r),
    `L ${midX + s3x * -r},${midY}`,
    corner(midX, midY, 0, s4y, r),
    `L ${tx1},${midY + s4y * -r}`,
    corner(tx1, ty1, -tdx, -tdy, r),
    `L ${targetX},${targetY}`,
  ].join(" ");

  return { path, labelX: midX, labelY: midY };
};

// ─── Built-in registrations ───

registerEdgePath("bezier", getBezierPath);
registerEdgePath("smoothstep", getSmoothStepPath);
registerEdgePath("step", getStepPath);
registerEdgePath("straight", getStraightPath);
