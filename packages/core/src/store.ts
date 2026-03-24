import type {
  FlowStore,
  FlowStoreState,
  NodeBase,
  EdgeBase,
  NodeId,
  EdgeId,
  HandleId,
  HandleType,
  HandleBounds,
  NodeChange,
  EdgeChange,
  Viewport,
  Connection,
  FitViewOptions,
  XY,
  StoreChangeSet,
  InternalNode,
  NodeTypeDefinition,
} from "./types.ts";
import { toInternalNode, recomputeAbsolutePositions, recomputeSubtree, snapPosition, getNodesBoundingBox } from "./store/nodes";
import { addToAdjacency, removeFromAdjacency, removeConnectedEdges, getConnected, getIncoming, getOutgoing } from "./store/edges";
import { clampZoom, zoomAroundPoint, screenToFlow, flowToScreen } from "./store/viewport";

export interface CreateFlowStoreOptions {
  nodes?: NodeBase[];
  edges?: EdgeBase[];
  nodeTypes?: NodeTypeDefinition[];
  snapToGrid?: boolean;
  snapGrid?: [number, number];
  fitViewOnInit?: boolean;
  minZoom?: number;
  maxZoom?: number;
  defaultEdgeType?: string;
  multiSelectionKeyCode?: string;
  deleteKeyCode?: string;
  /** Return false to reject a proposed connection. Receives the resolved
   *  connection and a read-only snapshot of the current store state so
   *  callers can check existing edges without needing a store reference. */
  isValidConnection?: (connection: Connection, state: Readonly<FlowStoreState>) => boolean;
}

export function createFlowStore(options: CreateFlowStoreOptions = {}): FlowStore {
  const state: FlowStoreState = {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    connectionStartHandle: null,
    connectionPosition: { x: 0, y: 0 },
    snapToGrid: options.snapToGrid ?? false,
    snapGrid: options.snapGrid ?? [15, 15],
    multiSelectionKeyCode: options.multiSelectionKeyCode ?? "Shift",
    deleteKeyCode: options.deleteKeyCode ?? "Backspace",
    fitViewOnInit: options.fitViewOnInit ?? false,
    minZoom: options.minZoom ?? 0.1,
    maxZoom: options.maxZoom ?? 2,
    defaultEdgeType: options.defaultEdgeType ?? "bezier",
    width: 0,
    height: 0,
  };

  // ─── Child index ────────────────────────────────────────────────────────
  // Maps parentId → Set<childId> for O(1) getChildren lookups.
  const childIndex = new Map<NodeId, Set<NodeId>>();

  function addToChildIndex(node: { id: NodeId; parentId?: NodeId }): void {
    if (!node.parentId) return;
    let children = childIndex.get(node.parentId);
    if (!children) {
      children = new Set();
      childIndex.set(node.parentId, children);
    }
    children.add(node.id);
  }

  function removeFromChildIndex(node: { id: NodeId; parentId?: NodeId }): void {
    if (!node.parentId) return;
    const children = childIndex.get(node.parentId);
    if (children) {
      children.delete(node.id);
      if (children.size === 0) childIndex.delete(node.parentId);
    }
  }

  // ─── Node type registry ──────────────────────────────────────────────────
  const nodeTypeRegistry = new Map<string, NodeTypeDefinition>();
  for (const def of options.nodeTypes ?? []) nodeTypeRegistry.set(def.type, def);

  for (const node of options.nodes ?? []) {
    const internal = toInternalNode(node);
    state.nodes.set(node.id, internal);
    addToChildIndex(internal);
  }
  for (const edge of options.edges ?? []) {
    state.edges.set(edge.id, edge);
    addToAdjacency(state.adjacency, edge);
  }
  recomputeAbsolutePositions(state.nodes);

  // ─── Dirty tracking ───────────────────────────────────────────────────────
  // Accumulated between touch() calls; flushed and reset inside notify().

  const _dirtyNodeIds = new Set<NodeId>();
  let _allNodesDirty = false;
  const _dirtyEdgeIds = new Set<EdgeId>();
  let _allEdgesDirty = false;
  let _viewportDirty = false;
  let _connectionDirty = false;

  function markNode(id: NodeId): void {
    if (!_allNodesDirty) _dirtyNodeIds.add(id);
  }
  function markAllNodes(): void {
    _allNodesDirty = true;
    _dirtyNodeIds.clear();
  }
  function markEdge(id: EdgeId): void {
    if (!_allEdgesDirty) _dirtyEdgeIds.add(id);
  }
  function markEdges(): void {
    _allEdgesDirty = true;
    _dirtyEdgeIds.clear();
  }
  function markViewport(): void {
    _viewportDirty = true;
  }
  function markConnection(): void {
    _connectionDirty = true;
  }

  function buildChangeSet(): StoreChangeSet {
    return {
      nodes: _allNodesDirty || _dirtyNodeIds.size > 0,
      edges: _allEdgesDirty || _dirtyEdgeIds.size > 0,
      viewport: _viewportDirty,
      connection: _connectionDirty,
      // Empty set = bulk change; consumers must not filter by ID in that case.
      changedNodeIds: _allNodesDirty ? new Set() : new Set(_dirtyNodeIds),
      changedEdgeIds: _allEdgesDirty ? new Set() : new Set(_dirtyEdgeIds),
    };
  }

  function resetDirty(): void {
    _dirtyNodeIds.clear();
    _allNodesDirty = false;
    _dirtyEdgeIds.clear();
    _allEdgesDirty = false;
    _viewportDirty = false;
    _connectionDirty = false;
  }

  // ─── Subscribers ──────────────────────────────────────────────────────────
  const subscribers = new Set<(changes: StoreChangeSet) => void>();
  let batching = false;
  let dirty = false;

  function notify(): void {
    const changes = buildChangeSet();
    resetDirty();
    for (const cb of subscribers) cb(changes);
  }

  function touch(): void {
    if (batching) {
      dirty = true;
      return;
    }
    notify();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────
  function removeNodeById(id: NodeId): void {
    const node = state.nodes.get(id);
    if (!node) return;
    removeFromChildIndex(node);
    state.nodes.delete(id);
    state.selectedNodes.delete(id);
    // Also clean up children of this node from child index
    childIndex.delete(id);
    removeConnectedEdges(state.edges, state.adjacency, state.selectedEdges, id);
  }

  function buildConnection(
    startNodeId: NodeId,
    startHandleId: HandleId,
    startType: HandleType,
    endNodeId: NodeId,
    endHandleId: HandleId,
  ): Connection {
    if (startType === "source") {
      return { source: startNodeId, sourceHandle: startHandleId, target: endNodeId, targetHandle: endHandleId };
    }
    return { source: endNodeId, sourceHandle: endHandleId, target: startNodeId, targetHandle: startHandleId };
  }

  const userIsValidConnection = options.isValidConnection;
  function isValidConnection(connection: Connection, s: FlowStoreState): boolean {
    if (!userIsValidConnection) return true;
    try {
      return userIsValidConnection(connection, s);
    } catch (e) {
      console.warn("isValidConnection callback threw:", e);
      return false;
    }
  }

  const store: FlowStore = {
    getState: () => state,

    subscribe(callback: (changes: StoreChangeSet) => void): () => void {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    batch(fn: () => void): void {
      batching = true;
      try {
        fn();
      } finally {
        batching = false;
        if (dirty) {
          dirty = false;
          notify();
        }
      }
    },

    clear(): void {
      state.nodes.clear();
      state.edges.clear();
      state.adjacency.clear();
      state.selectedNodes.clear();
      state.selectedEdges.clear();
      state.connectionStartHandle = null;
      childIndex.clear();
      markAllNodes();
      markEdges();
      markConnection();
      touch();
    },

    addNode(node: NodeBase): void {
      if (state.nodes.has(node.id)) return;
      const internal = toInternalNode(node);
      state.nodes.set(node.id, internal);
      addToChildIndex(internal);
      recomputeAbsolutePositions(state.nodes);
      markAllNodes();
      touch();
    },

    removeNode(id: NodeId): void {
      removeNodeById(id);
      markAllNodes();
      markEdges();
      touch();
    },

    addEdge(edge: EdgeBase): void {
      if (state.edges.has(edge.id)) return;
      state.edges.set(edge.id, edge);
      addToAdjacency(state.adjacency, edge);
      markEdges();
      touch();
    },

    removeEdge(id: EdgeId): void {
      const edge = state.edges.get(id);
      if (!edge) return;
      state.edges.delete(id);
      state.selectedEdges.delete(id);
      removeFromAdjacency(state.adjacency, edge);
      markEdges();
      touch();
    },

    applyNodeChanges(changes: NodeChange[]): void {
      let positionsDirty = false;
      let structureChanged = false;
      let edgesMightChange = false;

      for (const change of changes) {
        switch (change.type) {
          case "add": {
            if (state.nodes.has(change.node.id)) break;
            const internal = toInternalNode(change.node);
            state.nodes.set(change.node.id, internal);
            addToChildIndex(internal);
            positionsDirty = true;
            structureChanged = true;
            break;
          }
          case "remove": {
            removeNodeById(change.id);
            structureChanged = true;
            edgesMightChange = true;
            break;
          }
          case "replace": {
            const old = state.nodes.get(change.id);
            if (old) removeFromChildIndex(old);
            const replacement = toInternalNode(change.node);
            state.nodes.set(change.id, replacement);
            addToChildIndex(replacement);
            positionsDirty = true;
            structureChanged = true;
            break;
          }
          case "position": {
            const node = state.nodes.get(change.id);
            if (!node) break;
            node.position = change.position;
            node.dragging = change.dragging;
            positionsDirty = true;
            break;
          }
          case "dimensions": {
            const node = state.nodes.get(change.id);
            if (node) {
              node.measured = change.measured;
              markNode(change.id);
            }
            break;
          }
          case "select": {
            const node = state.nodes.get(change.id);
            if (!node) break;
            node.selected = change.selected;
            if (change.selected) state.selectedNodes.add(change.id);
            else state.selectedNodes.delete(change.id);
            markNode(change.id);
            break;
          }
        }
      }

      if (positionsDirty) recomputeAbsolutePositions(state.nodes);
      // Structural and positional changes may affect descendants — bulk mark.
      if (structureChanged || positionsDirty) markAllNodes();
      if (edgesMightChange) markEdges();
      touch();
    },

    applyEdgeChanges(changes: EdgeChange[]): void {
      let structureChanged = false;
      for (const change of changes) {
        switch (change.type) {
          case "add": {
            if (state.edges.has(change.edge.id)) break;
            state.edges.set(change.edge.id, change.edge);
            addToAdjacency(state.adjacency, change.edge);
            structureChanged = true;
            break;
          }
          case "remove": {
            const edge = state.edges.get(change.id);
            if (!edge) break;
            state.edges.delete(change.id);
            state.selectedEdges.delete(change.id);
            removeFromAdjacency(state.adjacency, edge);
            structureChanged = true;
            break;
          }
          case "replace": {
            const old = state.edges.get(change.id);
            if (old) removeFromAdjacency(state.adjacency, old);
            state.edges.set(change.id, change.edge);
            addToAdjacency(state.adjacency, change.edge);
            markEdge(change.id);
            break;
          }
          case "select": {
            if (change.selected) state.selectedEdges.add(change.id);
            else state.selectedEdges.delete(change.id);
            markEdge(change.id);
            break;
          }
        }
      }
      if (structureChanged) markEdges();
      touch();
    },

    setViewport(viewport: Viewport): void {
      state.viewport = viewport;
      markViewport();
      touch();
    },

    updateNodePosition(id: NodeId, position: XY): void {
      const node = state.nodes.get(id);
      if (!node) return;
      node.position = snapPosition(position, state.snapToGrid, state.snapGrid);
      recomputeSubtree(state.nodes, childIndex, id);
      markNode(id);
      // Also mark descendants whose absolutePosition changed
      const descendants = childIndex.get(id);
      if (descendants) for (const childId of descendants) markNode(childId);
      touch();
    },

    updateNodeDimensions(id: NodeId, width: number, height: number): void {
      const node = state.nodes.get(id);
      if (!node) return;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return;
      node.measured = { width, height };
      markNode(id);
      touch();
    },

    updateNodeHandleBounds(id: NodeId, handleBounds: HandleBounds): void {
      const node = state.nodes.get(id);
      if (!node) return;
      node.handleBounds = handleBounds;
      markNode(id);
      touch();
    },

    setSelectedNodes(ids: NodeId[]): void {
      const next = new Set(ids);
      // Deselect nodes that are no longer selected
      for (const id of state.selectedNodes) {
        if (!next.has(id)) {
          const node = state.nodes.get(id);
          if (node) node.selected = false;
          markNode(id);
        }
      }
      // Select newly selected nodes
      for (const id of next) {
        if (!state.selectedNodes.has(id)) {
          const node = state.nodes.get(id);
          if (node) node.selected = true;
          markNode(id);
        }
      }
      state.selectedNodes = next;
      touch();
    },

    setSelectedEdges(ids: EdgeId[]): void {
      const next = new Set(ids);
      // Deselect removed edges
      for (const id of state.selectedEdges) {
        if (!next.has(id)) markEdge(id);
      }
      // Select newly selected edges
      for (const id of next) {
        if (!state.selectedEdges.has(id)) markEdge(id);
      }
      state.selectedEdges = next;
      touch();
    },

    startConnection(nodeId: NodeId, handleId: HandleId, type: HandleType, position: XY): void {
      state.connectionStartHandle = { nodeId, handleId, type, position };
      state.connectionPosition = position;
      markConnection();
      touch();
    },

    updateConnection(position: XY): void {
      state.connectionPosition = position;
      markConnection();
      touch();
    },

    endConnection(nodeId: NodeId, handleId: HandleId, handleType: HandleType): Connection | null {
      const start = state.connectionStartHandle;
      if (!start) return null;

      // Reject same-type connections (source→source or target→target)
      if (start.type === handleType) return null;

      state.connectionStartHandle = null;
      markConnection();
      touch();

      const connection = buildConnection(start.nodeId, start.handleId, start.type, nodeId, handleId);

      // Reject connections to non-existent nodes
      if (!state.nodes.has(connection.source) || !state.nodes.has(connection.target)) return null;

      // Built-in: reject exact duplicate edges (same source handle → same target handle)
      for (const edge of state.edges.values()) {
        if (
          edge.source === connection.source &&
          (edge.sourceHandle ?? null) === connection.sourceHandle &&
          edge.target === connection.target &&
          (edge.targetHandle ?? null) === connection.targetHandle
        ) {
          return null;
        }
      }

      return isValidConnection(connection, state) ? connection : null;
    },

    cancelConnection(): void {
      state.connectionStartHandle = null;
      markConnection();
      touch();
    },

    fitView(options: FitViewOptions = {}): boolean {
      const { padding: rawPadding = 0.1, maxZoom: optMaxZoom, nodes: nodeIds } = options;
      const padding = Math.max(0, Math.min(0.5, rawPadding));
      if (state.width === 0 || state.height === 0) return false;

      const candidates = [...state.nodes.values()].filter((n) => {
        if (n.hidden) return false;
        return nodeIds ? nodeIds.includes(n.id) : true;
      });
      if (candidates.length === 0) return false;

      const bbox = getNodesBoundingBox(candidates);
      if (!bbox) return false;

      const paddingPx = Math.min(state.width, state.height) * padding;
      const availW = state.width - paddingPx * 2;
      const availH = state.height - paddingPx * 2;
      if (availW <= 0 || availH <= 0) return false;

      const maxZ = optMaxZoom !== undefined ? Math.min(optMaxZoom, state.maxZoom) : state.maxZoom;
      const zoom = clampZoom(Math.min(availW / bbox.width, availH / bbox.height), state.minZoom, maxZ);
      const x = state.width / 2 - (bbox.x + bbox.width / 2) * zoom;
      const y = state.height / 2 - (bbox.y + bbox.height / 2) * zoom;

      state.viewport = { x, y, zoom };
      markViewport();
      touch();
      return true;
    },

    zoomTo(zoom: number): void {
      const clamped = clampZoom(zoom, state.minZoom, state.maxZoom);
      const center = { x: state.width / 2, y: state.height / 2 };
      state.viewport = zoomAroundPoint(state.viewport, clamped / state.viewport.zoom, center, state.minZoom, state.maxZoom);
      markViewport();
      touch();
    },

    panTo(position: XY): void {
      state.viewport = { ...state.viewport, x: position.x, y: position.y };
      markViewport();
      touch();
    },

    zoomAroundPoint(delta: number, point: XY): void {
      state.viewport = zoomAroundPoint(state.viewport, delta, point, state.minZoom, state.maxZoom);
      markViewport();
      touch();
    },

    setContainerDimensions(width: number, height: number): void {
      state.width = Math.max(0, width);
      state.height = Math.max(0, height);
    },

    getNode: (id) => state.nodes.get(id),
    getEdge: (id) => state.edges.get(id),
    getConnectedEdges: (id) => getConnected(state.edges, state.adjacency, id),
    getIncomingEdges: (id) => getIncoming(state.edges, state.adjacency, id),
    getOutgoingEdges: (id) => getOutgoing(state.edges, state.adjacency, id),
    getChildren: (id) => {
      const ids = childIndex.get(id);
      if (!ids) return [];
      const result: InternalNode[] = [];
      for (const childId of ids) {
        const node = state.nodes.get(childId);
        if (node) result.push(node);
      }
      return result;
    },
    isValidConnection: (connection) => isValidConnection(connection, state),
    screenToFlowPosition: (point) => screenToFlow(point, state.viewport),
    flowToScreenPosition: (point) => flowToScreen(point, state.viewport),
    registerNodeType: (def) => {
      nodeTypeRegistry.set(def.type, def);
    },
    getNodeType: (type) => nodeTypeRegistry.get(type),
    hasNodeType: (type) => nodeTypeRegistry.has(type),
  };

  return store;
}

export { wouldCreateCycle } from "./store/edges";
