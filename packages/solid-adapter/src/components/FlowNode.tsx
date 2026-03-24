import { createMemo, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import type { InternalNode } from "@thrum/core";
import { computeHandleBounds } from "@thrum/core";
import { useFlow, NodeContext } from "../context";
import { createNodeDrag } from "../hooks/createNodeDrag";

interface FlowNodeProps {
  node: InternalNode;
  children: JSX.Element;
}

export function FlowNode(props: FlowNodeProps) {
  const flow = useFlow();
  const { store } = flow;
  const drag = createNodeDrag(store);
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLDivElement;

  const node = createMemo(() => flow.nodes().find((n) => n.id === props.node.id) ?? props.node, undefined, { equals: false });

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      store.updateNodeDimensions(props.node.id, width, height);
      store.updateNodeHandleBounds(props.node.id, computeHandleBounds(ref));
    });
    ro.observe(ref);
    onCleanup(() => ro.disconnect());
  });

  return (
    <NodeContext.Provider value={props.node.id}>
      <div
        ref={ref}
        data-nodeid={props.node.id}
        data-selected={node().selected ? "" : undefined}
        data-dragging={node().dragging ? "" : undefined}
        style={{
          position: "absolute",
          left: `${node().absolutePosition.x}px`,
          top: `${node().absolutePosition.y}px`,
          "z-index": node().zIndex ?? 0,
          "pointer-events": "all",
        }}
        onPointerDown={(e) => drag.onPointerDown(e, props.node.id)}
        onPointerMove={(e) => drag.onPointerMove(e, props.node.id)}
        onPointerUp={(e) => drag.onPointerUp(e, props.node.id)}
      >
        {props.children}
      </div>
    </NodeContext.Provider>
  );
}
