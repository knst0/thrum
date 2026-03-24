import { getBezierPath, createFlowStore, nodeId, edgeId, handleId } from "@thrum/core";
import { Flow, useLiveNode } from "@thrum/solid";
import type { EdgeCoords } from "@thrum/solid";
import type { EdgeBase, Connection } from "@thrum/core";
import type { JSX } from "solid-js";

const store = createFlowStore({
  nodes: [
    { id: nodeId("input"), position: { x: 40, y: 100 }, data: { label: "Input" } },
    { id: nodeId("process"), position: { x: 220, y: 60 }, data: { label: "Process" } },
    { id: nodeId("filter"), position: { x: 220, y: 160 }, data: { label: "Filter" } },
    { id: nodeId("output"), position: { x: 400, y: 100 }, data: { label: "Output" } },
  ],
  edges: [
    { id: edgeId("1"), source: nodeId("input"), sourceHandle: handleId("out"), target: nodeId("process"), targetHandle: handleId("in") },
    { id: edgeId("2"), source: nodeId("input"), sourceHandle: handleId("out"), target: nodeId("filter"), targetHandle: handleId("in") },
    { id: edgeId("3"), source: nodeId("process"), sourceHandle: handleId("out"), target: nodeId("output"), targetHandle: handleId("in") },
    { id: edgeId("4"), source: nodeId("filter"), sourceHandle: handleId("out"), target: nodeId("output"), targetHandle: handleId("in") },
  ],
});

const handleStyle: JSX.CSSProperties = {
  position: "absolute",
  width: "10px",
  height: "10px",
  "border-radius": "50%",
  background: "var(--color-gray-8)",
  border: "2px solid var(--color-gray-6)",
  cursor: "crosshair",
};

function NodeContent() {
  const node = useLiveNode<{ label: string }>();
  return (
    <div
      style={{
        padding: "8px 14px",
        background: node().selected ? "var(--color-gray-5)" : "var(--color-gray-3)",
        border: `1px solid ${node().selected ? "var(--color-gray-8)" : "var(--color-gray-6)"}`,
        "border-radius": "6px",
        color: "var(--color-gray-12)",
        "font-size": "13px",
        "white-space": "nowrap",
        cursor: node().dragging ? "grabbing" : "grab",
        "user-select": "none",
        position: "relative",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <Flow.Handle
        type="target"
        id="in"
        style={{ ...handleStyle, left: "-6px", top: "50%", transform: "translateY(-50%)" }}
      />
      {node().data.label}
      <Flow.Handle
        type="source"
        id="out"
        style={{ ...handleStyle, right: "-6px", top: "50%", transform: "translateY(-50%)", background: "var(--color-gray-11)" }}
      />
    </div>
  );
}

function ShowcaseEdge(_edge: EdgeBase, coords: EdgeCoords, selected: boolean) {
  const { path } = getBezierPath(coords);
  return (
    <path
      d={path}
      stroke={selected ? "var(--color-gray-11)" : "var(--color-gray-7)"}
      stroke-width={selected ? "2" : "1.5"}
      fill="none"
      style={{ "pointer-events": "none" }}
    />
  );
}

function handleConnect(c: Connection) {
  store.addEdge({
    id: edgeId(`${c.source}-${c.target}`),
    source: c.source,
    sourceHandle: c.sourceHandle ?? undefined,
    target: c.target,
    targetHandle: c.targetHandle ?? undefined,
  });
}

export function ShowcasePlayground() {
  return (
    <Flow.Root store={store} onConnect={handleConnect}>
      <Flow.Canvas>
        <Flow.EdgeLayer>{(edge, coords, selected) => ShowcaseEdge(edge, coords, selected)}</Flow.EdgeLayer>
        <Flow.ConnectionLine stroke="var(--color-gray-11)" strokeDasharray="5 3" />
        <Flow.NodeLayer>
          {(node) => (
            <Flow.Node node={node}>
              <NodeContent />
            </Flow.Node>
          )}
        </Flow.NodeLayer>
      </Flow.Canvas>
      <button
        onClick={() => store.fitView({ padding: 0.2 })}
        title="Fit view"
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          width: "28px",
          height: "28px",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          background: "var(--color-gray-3)",
          border: "1px solid var(--color-gray-6)",
          "border-radius": "6px",
          cursor: "pointer",
          color: "var(--color-gray-11)",
          "z-index": "10",
          padding: "0",
          transition: "background 0.1s, color 0.1s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-gray-5)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-gray-12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-gray-3)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-gray-11)";
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </Flow.Root>
  );
}
