import type { FlowPlugin, FlowPluginFactory, FlowStore, NodeBase, NodeChange, EdgeChange, InternalNode } from "../types";
import { History } from "../history";

export interface HistoryPluginOptions {
  maxSize?: number;
}

export interface HistoryPluginInstance {
  /** Undo the last recorded operation. No-op if nothing to undo. */
  undo(): void;
  /** Redo the next operation. No-op if nothing to redo. */
  redo(): void;
  /** Whether there is an operation to undo. */
  canUndo(): boolean;
  /** Whether there is an operation to redo. */
  canRedo(): boolean;
  /** Clears all history entries. */
  clear(): void;
}

function nodeToBase(node: InternalNode): NodeBase {
  const base: NodeBase = { id: node.id, position: { ...node.position }, data: structuredClone(node.data) };
  if (node.type !== undefined) base.type = node.type;
  if (node.draggable !== undefined) base.draggable = node.draggable;
  if (node.resizable !== undefined) base.resizable = node.resizable;
  if (node.selectable !== undefined) base.selectable = node.selectable;
  if (node.deletable !== undefined) base.deletable = node.deletable;
  if (node.hidden !== undefined) base.hidden = node.hidden;
  if (node.zIndex !== undefined) base.zIndex = node.zIndex;
  if (node.parentId !== undefined) base.parentId = node.parentId;
  if (node.extent !== undefined) base.extent = node.extent;
  return base;
}

function buildNodeUndoChanges(store: FlowStore, changes: NodeChange[]): NodeChange[] {
  const state = store.getState();
  const undo: NodeChange[] = [];
  for (const change of changes) {
    switch (change.type) {
      case "position": {
        const node = state.nodes.get(change.id);
        if (node) undo.push({ type: "position", id: change.id, position: { ...node.position }, dragging: false });
        break;
      }
      case "remove": {
        const node = state.nodes.get(change.id);
        if (node) undo.push({ type: "add", node: nodeToBase(node) });
        break;
      }
      case "add": {
        undo.push({ type: "remove", id: change.node.id });
        break;
      }
      case "replace": {
        const node = state.nodes.get(change.id);
        if (node) undo.push({ type: "replace", id: change.id, node: nodeToBase(node) });
        break;
      }
      // "select" and "dimensions" are not recorded in history
    }
  }
  return undo;
}

function buildEdgeUndoChanges(store: FlowStore, changes: EdgeChange[]): EdgeChange[] {
  const state = store.getState();
  const undo: EdgeChange[] = [];
  for (const change of changes) {
    switch (change.type) {
      case "remove": {
        const edge = state.edges.get(change.id);
        if (edge) undo.push({ type: "add", edge: { ...edge } });
        break;
      }
      case "add": {
        undo.push({ type: "remove", id: change.edge.id });
        break;
      }
      case "replace": {
        const edge = state.edges.get(change.id);
        if (edge) undo.push({ type: "replace", id: change.id, edge: { ...edge } });
        break;
      }
      // "select" is not recorded
    }
  }
  return undo;
}

const _historyKey = Symbol("historyPlugin");

function createHistoryPlugin(options?: HistoryPluginOptions): FlowPlugin<HistoryPluginInstance> {
  return {
    _key: _historyKey,
    install(store: FlowStore): HistoryPluginInstance & { uninstall(): void } {
      const history = new History(options?.maxSize ?? 100);
      let isReplaying = false;

      // ─── Drag position tracking ────────────────────────────────────────
      // We only record to history when a drag ends (dragging: false).
      // Pre-drag positions are snapshotted on the first move event.
      const pendingDragUndo = new Map<string, { x: number; y: number }>();

      const originalApplyNodeChanges = store.applyNodeChanges.bind(store);
      const originalApplyEdgeChanges = store.applyEdgeChanges.bind(store);

      store.applyNodeChanges = (changes: NodeChange[]) => {
        if (isReplaying) {
          originalApplyNodeChanges(changes);
          return;
        }

        // Separate by type so we can handle each appropriately
        const positionChanges = changes.filter((c): c is Extract<NodeChange, { type: "position" }> => c.type === "position");
        const structuralChanges = changes.filter((c) => c.type === "add" || c.type === "remove" || c.type === "replace");

        // Snapshot pre-drag positions before applying
        for (const change of positionChanges) {
          if (!pendingDragUndo.has(change.id)) {
            const node = store.getNode(change.id);
            if (node) pendingDragUndo.set(change.id, { ...node.position });
          }
        }

        // Capture undo for structural changes before applying
        const structuralUndo = buildNodeUndoChanges(store, structuralChanges);

        originalApplyNodeChanges(changes);

        // Commit structural changes to history immediately
        if (structuralChanges.length > 0 && structuralUndo.length > 0) {
          history.push({
            undo: { nodeChanges: structuralUndo, edgeChanges: [] },
            redo: { nodeChanges: structuralChanges as NodeChange[], edgeChanges: [] },
          });
        }

        // Commit drag positions when drag ends
        const endedDrags = positionChanges.filter((c) => !c.dragging);
        if (endedDrags.length > 0) {
          const nodeChangesUndo: NodeChange[] = [];
          const nodeChangesRedo: NodeChange[] = [];
          for (const change of endedDrags) {
            const originalPos = pendingDragUndo.get(change.id);
            if (originalPos) {
              nodeChangesUndo.push({ type: "position", id: change.id, position: originalPos, dragging: false });
              nodeChangesRedo.push({ type: "position", id: change.id, position: { ...change.position }, dragging: false });
              pendingDragUndo.delete(change.id);
            }
          }
          if (nodeChangesUndo.length > 0) {
            history.push({
              undo: { nodeChanges: nodeChangesUndo, edgeChanges: [] },
              redo: { nodeChanges: nodeChangesRedo, edgeChanges: [] },
            });
          }
        }
      };

      store.applyEdgeChanges = (changes: EdgeChange[]) => {
        if (isReplaying) {
          originalApplyEdgeChanges(changes);
          return;
        }

        const recordable = changes.filter((c) => c.type === "add" || c.type === "remove" || c.type === "replace");
        const undoChanges = buildEdgeUndoChanges(store, recordable);

        originalApplyEdgeChanges(changes);

        if (recordable.length > 0 && undoChanges.length > 0) {
          history.push({
            undo: { nodeChanges: [], edgeChanges: undoChanges },
            redo: { nodeChanges: [], edgeChanges: recordable as EdgeChange[] },
          });
        }
      };

      function applyChangeset(nodeChanges: NodeChange[], edgeChanges: EdgeChange[]) {
        isReplaying = true;
        try {
          store.batch(() => {
            if (nodeChanges.length) originalApplyNodeChanges(nodeChanges);
            if (edgeChanges.length) originalApplyEdgeChanges(edgeChanges);
          });
        } finally {
          isReplaying = false;
        }
      }

      return {
        undo() {
          const changeset = history.undo();
          if (!changeset) return;
          applyChangeset(changeset.nodeChanges, changeset.edgeChanges);
        },
        redo() {
          const changeset = history.redo();
          if (!changeset) return;
          applyChangeset(changeset.nodeChanges, changeset.edgeChanges);
        },
        canUndo: () => history.canUndo(),
        canRedo: () => history.canRedo(),
        clear: () => history.clear(),
        uninstall() {
          store.applyNodeChanges = originalApplyNodeChanges;
          store.applyEdgeChanges = originalApplyEdgeChanges;
          history.clear();
          pendingDragUndo.clear();
        },
      };
    },
  };
}

export const historyPlugin: FlowPluginFactory<HistoryPluginInstance, [HistoryPluginOptions?]> = Object.assign(createHistoryPlugin, {
  _key: _historyKey,
});
