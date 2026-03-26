import type { FlowPlugin, FlowPluginFactory, FlowStore } from "../types";

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Primitive box-selection state tracker.
 *
 * The plugin owns only the drag geometry — start coords, active flag, and
 * rect computation. It intentionally makes **no store mutations**; deciding
 * what to do with the selection (which nodes to highlight, how to filter,
 * whether to clear edges, etc.) is left entirely to the adapter or the
 * application.
 */
export interface SelectionPluginInstance {
  /** Begin a drag. Call on pointer-down over the canvas background. */
  start(x: number, y: number): void;
  /**
   * Feed the current pointer position. Returns the selection rect when the
   * movement exceeds the threshold, `null` otherwise (inactive or too small).
   */
  update(x: number, y: number): SelectionRect | null;
  /** End the drag. */
  end(): void;
  /** Whether a drag is currently in progress. */
  isActive(): boolean;
  /** Start coordinates of the current drag (only meaningful while active). */
  getStart(): { x: number; y: number };
}

const _selectionKey = Symbol("selectionPlugin");

function createSelectionPlugin(): FlowPlugin<SelectionPluginInstance> {
  return {
    _key: _selectionKey,
    // Store is received but not used — the plugin is intentionally store-agnostic.
    install(_store: FlowStore): SelectionPluginInstance & { uninstall(): void } {
      let startX = 0;
      let startY = 0;
      let active = false;

      return {
        start(x: number, y: number) {
          startX = x;
          startY = y;
          active = true;
        },

        update(endX: number, endY: number): SelectionRect | null {
          if (!active) return null;
          const dx = endX - startX;
          const dy = endY - startY;
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return null;
          return {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(dx),
            height: Math.abs(dy),
          };
        },

        end() {
          active = false;
        },

        isActive: () => active,
        getStart: () => ({ x: startX, y: startY }),

        uninstall() {
          active = false;
        },
      };
    },
  };
}

export const selectionPlugin: FlowPluginFactory<SelectionPluginInstance, []> = Object.assign(createSelectionPlugin, {
  _key: _selectionKey,
});
