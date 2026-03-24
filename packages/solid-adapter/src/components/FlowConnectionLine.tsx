import { Show } from "solid-js";
import type { HandlePosition } from "@thrum/core";
import { getBezierPath, resolveHandleCenter } from "@thrum/core";
import { useFlow } from "../context";

interface ConnectionLineProps {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export function FlowConnectionLine(props: ConnectionLineProps) {
  const flow = useFlow();

  const pathData = (svg: SVGSVGElement) => {
    const start = flow.connectionStartHandle();
    if (!start) return null;

    const vp = flow.viewport();
    const pos = flow.connectionPosition();
    const rect = svg?.getBoundingClientRect() ?? { left: 0, top: 0 };

    const startFlowX = (start.position.x - rect.left - vp.x) / vp.zoom;
    const startFlowY = (start.position.y - rect.top - vp.y) / vp.zoom;
    const endFlowX = (pos.x - rect.left - vp.x) / vp.zoom;
    const endFlowY = (pos.y - rect.top - vp.y) / vp.zoom;

    const sourceNode = flow.store.getNode(start.nodeId);
    const sw = sourceNode?.measured?.width ?? 150;
    const sh = sourceNode?.measured?.height ?? 50;
    const src = resolveHandleCenter(sourceNode?.handleBounds ?? null, start.handleId, start.type, sw, sh);

    const isSource = start.type === "source";
    const opposites: Record<HandlePosition, HandlePosition> = { top: "bottom", bottom: "top", left: "right", right: "left" };
    const sourcePosition = isSource ? src.position : opposites[src.position];
    const targetPosition = isSource ? opposites[src.position] : src.position;

    return getBezierPath({
      sourceX: isSource ? startFlowX : endFlowX,
      sourceY: isSource ? startFlowY : endFlowY,
      sourcePosition,
      targetX: isSource ? endFlowX : startFlowX,
      targetY: isSource ? endFlowY : startFlowY,
      targetPosition,
    }).path;
  };

  // oxlint-disable-next-line no-unassigned-vars
  let svgRef!: SVGSVGElement;
  const vp = () => flow.viewport();

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        overflow: "visible",
        "pointer-events": "none",
      }}
    >
      <g transform={`translate(${vp().x} ${vp().y}) scale(${vp().zoom})`}>
        <Show when={pathData(svgRef)}>
          {(p) => (
            <path
              d={p()}
              fill="none"
              stroke={props.stroke ?? "#60a5fa"}
              stroke-width={props.strokeWidth ?? 2}
              stroke-dasharray={props.strokeDasharray ?? "6 3"}
              class="flow-connection-line"
              style={{ "pointer-events": "none" }}
            />
          )}
        </Show>
      </g>
    </svg>
  );
}
