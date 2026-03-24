import { onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import type { Connection, FlowStore } from "@thrum/core";
import { FlowContext, createFlowContextValue } from "../context";

interface FlowRootProps {
  store: FlowStore;
  onConnect?: (connection: Connection) => void;
  children: JSX.Element;
}

export function FlowRoot(props: FlowRootProps) {
  const ctx = createFlowContextValue(props.store, props.onConnect);
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLDivElement;

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      props.store.setContainerDimensions(width, height);
    });
    ro.observe(ref);
    onCleanup(() => ro.disconnect());
  });

  return (
    <FlowContext.Provider value={ctx}>
      <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
        {props.children}
      </div>
    </FlowContext.Provider>
  );
}
