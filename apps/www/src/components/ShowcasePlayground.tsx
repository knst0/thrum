import { getBezierPath, createFlowStore, nodeId, edgeId, handleId } from "@thrum/core";
import { selectionPlugin } from "@thrum/core/plugins";
import { Flow, useLiveNode } from "@thrum/solid";
import type { EdgeCoords } from "@thrum/solid";
import type { EdgeBase, Connection } from "@thrum/core";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";

type NodeData = { label: string; nodeType?: "input" | "output" | "default" };

const store = createFlowStore({
  nodes: [
    { id: nodeId("input"), position: { x: 40, y: 100 }, data: { label: "Input", nodeType: "input" } },
    { id: nodeId("process"), position: { x: 220, y: 60 }, data: { label: "Process" } },
    { id: nodeId("filter"), position: { x: 220, y: 160 }, data: { label: "Filter" } },
    { id: nodeId("output"), position: { x: 400, y: 100 }, data: { label: "Output", nodeType: "output" } },
  ],
  edges: [
    {
      id: edgeId("1"),
      source: nodeId("input"),
      sourceHandle: handleId("out-top"),
      target: nodeId("process"),
      targetHandle: handleId("in"),
    },
    {
      id: edgeId("2"),
      source: nodeId("input"),
      sourceHandle: handleId("out-bottom"),
      target: nodeId("filter"),
      targetHandle: handleId("in"),
    },
    { id: edgeId("3"), source: nodeId("process"), sourceHandle: handleId("out"), target: nodeId("output"), targetHandle: handleId("in") },
  ],
  plugins: [selectionPlugin()],
  isValidConnection: (connection, state) => {
    const edges = [...state.edges.values()];
    const sourceOccupied = edges.some((e) => e.source === connection.source && (e.sourceHandle ?? null) === connection.sourceHandle);
    const targetOccupied = edges.some((e) => e.target === connection.target && (e.targetHandle ?? null) === connection.targetHandle);
    return !sourceOccupied && !targetOccupied;
  },
});

const handleClass = "absolute size-2.5 rounded-full bg-(--color-gray-8) border-2 border-(--color-gray-6) cursor-crosshair";

type NodeComponentProps = { node: ReturnType<typeof useLiveNode<NodeData>> };

function DefaultNodeContent(props: NodeComponentProps) {
  return (
    <>
      <Flow.Handle type="target" id="in" class={clsx(handleClass, "-left-1.5 top-1/2 -translate-y-1/2")} />
      {props.node().data.label}
      <Flow.Handle type="source" id="out" class={clsx(handleClass, "-right-1.5 top-1/2 -translate-y-1/2")} />
    </>
  );
}

function InputNodeContent(props: NodeComponentProps) {
  return (
    <>
      {props.node().data.label}
      <Flow.Handle type="source" id="out-top" class={clsx(handleClass, "-right-1.5 top-1/4 -translate-y-1/2")} />
      <Flow.Handle type="source" id="out-bottom" class={clsx(handleClass, "-right-1.5 top-3/4 -translate-y-1/2")} />
    </>
  );
}

function OutputNodeContent(props: NodeComponentProps) {
  return (
    <>
      <Flow.Handle type="target" id="in-top" class={clsx(handleClass, "-left-1.5 top-1/4 -translate-y-1/2")} />
      <Flow.Handle type="target" id="in-bottom" class={clsx(handleClass, "-left-1.5 top-3/4 -translate-y-1/2")} />
      {props.node().data.label}
    </>
  );
}

const components = {
  input: InputNodeContent,
  output: OutputNodeContent,
  default: DefaultNodeContent,
};

function NodeContent() {
  const node = useLiveNode<NodeData>();
  const nodeType = () => node().data.nodeType ?? "default";

  return (
    <div
      class={clsx(
        "px-3.5 py-2 rounded-md text-[13px] text-(--color-gray-12) whitespace-nowrap select-none relative transition-[background,border-color] duration-100",
        node().selected ? "bg-(--color-gray-5) border border-(--color-gray-8)" : "bg-(--color-gray-3) border border-(--color-gray-6)",
        node().dragging ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <Dynamic component={components[nodeType()] || components.default} node={node} />
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
      class="pointer-events-none"
    />
  );
}

function handleConnect(c: Connection) {
  store.addEdge({
    id: edgeId(`${c.source}-${c.sourceHandle ?? ""}-${c.target}-${c.targetHandle ?? ""}`),
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
        <Flow.SelectionArea />
      </Flow.Canvas>
      <button
        onClick={() => store.fitView({ padding: 0.2 })}
        title="Fit view"
        class={clsx(
          "absolute bottom-2.5 right-2.5 w-7 h-7 flex items-center justify-center",
          "bg-(--color-gray-3) border border-(--color-gray-6) rounded-md",
          "cursor-pointer text-(--color-gray-11) z-10 p-0",
          "transition-[background,color] duration-100",
          "hover:bg-(--color-gray-5) hover:text-(--color-gray-12)",
        )}
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
