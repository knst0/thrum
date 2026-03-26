import { Show, onCleanup, onMount } from "solid-js";
import { selectionPlugin } from "@thrum/core/plugins";
import { useFlow } from "../context";
import { createBoxSelection } from "../hooks/createBoxSelection";

export function FlowSelectionArea() {
  const { store } = useFlow();
  if (!store.getPlugin(selectionPlugin)) {
    throw new Error("<FlowSelectionArea> requires the selectionPlugin to be enabled. Add selectionPlugin() to your store plugins.");
  }

  // oxlint-disable-next-line no-unassigned-vars
  let wrapperRef!: HTMLDivElement;

  const boxSel = createBoxSelection(store, () => wrapperRef.parentElement as HTMLElement);

  onMount(() => {
    const canvas = wrapperRef.parentElement as HTMLElement;

    function handlePointerDown(e: PointerEvent) {
      const started = boxSel.onPointerDown(e);
      if (started) canvas.setPointerCapture(e.pointerId);
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", boxSel.onPointerMove);
    canvas.addEventListener("pointerup", boxSel.onPointerUp);
    canvas.addEventListener("pointercancel", boxSel.onPointerUp);

    onCleanup(() => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", boxSel.onPointerMove);
      canvas.removeEventListener("pointerup", boxSel.onPointerUp);
      canvas.removeEventListener("pointercancel", boxSel.onPointerUp);
    });
  });

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: "0", "pointer-events": "none" }}>
      <Show when={boxSel.rect()}>
        {(r) => (
          <div
            data-box-selection
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              // r.x/y are already canvas-relative (converted in createBoxSelection)
              transform: `translate(${Math.round(r().x)}px, ${Math.round(r().y)}px)`,
              width: `${Math.round(r().width)}px`,
              height: `${Math.round(r().height)}px`,
              "will-change": "transform",
              "pointer-events": "none",
              background: "rgba(99, 149, 255, 0.08)",
              border: "1px solid rgba(99, 149, 255, 0.7)",
              "border-radius": "2px",
            }}
          />
        )}
      </Show>
    </div>
  );
}
