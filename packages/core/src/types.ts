// ─── Branded ID primitives ────────────────────────────────────────────────────
// `unique symbol` ensures brands cannot be forged without the factory functions.
declare const __nodeId: unique symbol;
declare const __edgeId: unique symbol;
declare const __handleId: unique symbol;

export type NodeId = string & { readonly [__nodeId]: void };
export type EdgeId = string & { readonly [__edgeId]: void };
export type HandleId = string & { readonly [__handleId]: void };

export const nodeId = (id: string): NodeId => id as NodeId;
export const edgeId = (id: string): EdgeId => id as EdgeId;
export const handleId = (id: string): HandleId => id as HandleId;

// ─── Geometry ─────────────────────────────────────────────────────────────────

export interface XY {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Handles ──────────────────────────────────────────────────────────────────

export type HandleType = "source" | "target";
export type HandlePosition = "top" | "right" | "bottom" | "left";

export interface HandleBounds {
  source: HandleRect[];
  target: HandleRect[];
}

export interface HandleRect {
  id: HandleId;
  position: HandlePosition;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Graph elements ───────────────────────────────────────────────────────────

export interface Connection {
  source: NodeId;
  sourceHandle: HandleId | null;
  target: NodeId;
  targetHandle: HandleId | null;
}

export interface NodeBase<TData = unknown> {
  id: NodeId;
  type?: string;
  position: XY;
  data: TData;
  draggable?: boolean;
  resizable?: boolean;
  selectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  zIndex?: number;
  parentId?: NodeId;
  extent?: "parent" | Rect;
}

export interface InternalNode<TData = unknown> extends NodeBase<TData> {
  measured: { width: number; height: number } | null;
  absolutePosition: XY;
  handleBounds: HandleBounds | null;
  selected: boolean;
  dragging: boolean;
  resizing: boolean;
}

export interface EdgeBase<TData = unknown> {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  sourceHandle?: HandleId;
  targetHandle?: HandleId;
  type?: string;
  data?: TData;
  animated?: boolean;
  selectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  label?: string;
  zIndex?: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ─── Change descriptors ───────────────────────────────────────────────────────

export type NodeChange<T = unknown> =
  | { type: "position"; id: NodeId; position: XY; dragging: boolean }
  | { type: "dimensions"; id: NodeId; measured: { width: number; height: number } }
  | { type: "select"; id: NodeId; selected: boolean }
  | { type: "remove"; id: NodeId }
  | { type: "add"; node: NodeBase<T> }
  | { type: "replace"; id: NodeId; node: NodeBase<T> };

export type EdgeChange<T = unknown> =
  | { type: "select"; id: EdgeId; selected: boolean }
  | { type: "remove"; id: EdgeId }
  | { type: "add"; edge: EdgeBase<T> }
  | { type: "replace"; id: EdgeId; edge: EdgeBase<T> };

// ─── Store change notification ────────────────────────────────────────────────

export interface StoreChangeSet {
  /** True when any node was added, removed, or had its data mutated. */
  nodes: boolean;
  /** True when any edge was added, removed, or had its selection changed. */
  edges: boolean;
  /** True when the viewport (pan/zoom) changed. */
  viewport: boolean;
  /** True when the active connection state changed. */
  connection: boolean;
  /**
   * IDs of nodes that changed in this notification. An **empty set** signals a
   * bulk operation (e.g. select-all, fitView recompute) — consumers must not
   * skip updates based on ID membership when the set is empty.
   */
  changedNodeIds: ReadonlySet<NodeId>;
  /**
   * IDs of edges that changed in this notification. An **empty set** signals a
   * bulk operation — consumers must not skip updates based on ID membership
   * when the set is empty.
   */
  changedEdgeIds: ReadonlySet<EdgeId>;
}

// ─── Edge paths ───────────────────────────────────────────────────────────────

export interface EdgePathParams {
  sourceX: number;
  sourceY: number;
  sourcePosition: HandlePosition;
  targetX: number;
  targetY: number;
  targetPosition: HandlePosition;
  curvature?: number;
}

export interface EdgePathResult {
  path: string;
  labelX: number;
  labelY: number;
}

export type EdgePathFunction = (params: EdgePathParams) => EdgePathResult;

// ─── Misc public types ────────────────────────────────────────────────────────

export interface FitViewOptions {
  padding?: number;
  maxZoom?: number;
  nodes?: NodeId[];
}

export interface ActiveConnection {
  nodeId: NodeId;
  handleId: HandleId;
  type: HandleType;
  position: XY;
}

// ─── Node type registry ───────────────────────────────────────────────────────

export interface NodeTypeDefinition<TData = unknown> {
  type: string;
  defaultData: () => TData;
  validate?: (data: unknown) => data is TData;
}

// ─── Plugin system ────────────────────────────────────────────────────────────

/**
 * A plugin descriptor returned by a plugin factory. Pass to `plugins` in
 * {@link CreateFlowStoreOptions}. Retrieve the installed instance later with
 * `store.getPlugin(factory)`.
 */
export interface FlowPlugin<T = unknown> {
  readonly _key: symbol;
  install(store: FlowStore): T & { uninstall(): void };
}

/**
 * A plugin factory — a callable that produces a {@link FlowPlugin} and also
 * carries a static `_key` symbol so `store.getPlugin(factory)` can look up
 * the installed instance with full type inference.
 */
export type FlowPluginFactory<T, TArgs extends unknown[] = unknown[]> = ((...args: TArgs) => FlowPlugin<T>) & {
  readonly _key: symbol;
};

// ─── Internal store state ─────────────────────────────────────────────────────

export interface FlowStoreState {
  nodes: Map<NodeId, InternalNode>;
  edges: Map<EdgeId, EdgeBase>;
  adjacency: Map<NodeId, Set<EdgeId>>;
  viewport: Viewport;
  selectedNodes: Set<NodeId>;
  selectedEdges: Set<EdgeId>;
  connectionStartHandle: ActiveConnection | null;
  connectionPosition: XY;
  snapToGrid: boolean;
  snapGrid: [number, number];
  multiSelectionKeyCode: string;
  deleteKeyCode: string;
  fitViewOnInit: boolean;
  minZoom: number;
  maxZoom: number;
  defaultEdgeType: string;
  width: number;
  height: number;
}

// ─── Public store interface ───────────────────────────────────────────────────

export interface FlowStore {
  getState(): FlowStoreState;
  /** Subscribe to store changes. The callback receives a {@link StoreChangeSet}
   *  describing exactly what changed, enabling fine-grained reactivity. */
  subscribe(callback: (changes: StoreChangeSet) => void): () => void;
  batch(fn: () => void): void;
  clear(): void;
  addNode(node: NodeBase): void;
  removeNode(id: NodeId): void;
  addEdge(edge: EdgeBase): void;
  removeEdge(id: EdgeId): void;
  applyNodeChanges(changes: NodeChange[]): void;
  applyEdgeChanges(changes: EdgeChange[]): void;
  setViewport(viewport: Viewport): void;
  updateNodePosition(id: NodeId, position: XY): void;
  updateNodeDimensions(id: NodeId, width: number, height: number): void;
  updateNodeHandleBounds(id: NodeId, handleBounds: HandleBounds): void;
  setSelectedNodes(ids: NodeId[]): void;
  setSelectedEdges(ids: EdgeId[]): void;
  startConnection(nodeId: NodeId, handleId: HandleId, type: HandleType, position: XY): void;
  registerNodeType(def: NodeTypeDefinition): void;
  getNodeType(type: string): NodeTypeDefinition | undefined;
  hasNodeType(type: string): boolean;
  updateConnection(position: XY): void;
  endConnection(nodeId: NodeId, handleId: HandleId, handleType: HandleType): Connection | null;
  cancelConnection(): void;
  fitView(options?: FitViewOptions): boolean;
  zoomTo(zoom: number): void;
  panTo(position: XY): void;
  zoomAroundPoint(delta: number, point: XY): void;
  setContainerDimensions(width: number, height: number): void;
  /** Returns a readonly view of the node — mutating the returned object is not supported. */
  getNode(id: NodeId): Readonly<InternalNode> | undefined;
  getEdge(id: EdgeId): EdgeBase | undefined;
  getConnectedEdges(nodeId: NodeId): EdgeBase[];
  getIncomingEdges(nodeId: NodeId): EdgeBase[];
  getOutgoingEdges(nodeId: NodeId): EdgeBase[];
  /** Returns readonly views of child nodes. */
  getChildren(nodeId: NodeId): Readonly<InternalNode>[];
  isValidConnection(connection: Connection): boolean;
  /**
   * Returns the installed plugin instance for the given factory, or `undefined`
   * if the plugin was not included in `CreateFlowStoreOptions.plugins`.
   */
  getPlugin<T>(factory: FlowPluginFactory<T, unknown[]>): T | undefined;
  screenToFlowPosition(point: XY): XY;
  flowToScreenPosition(point: XY): XY;
}

// ─── Serialization ────────────────────────────────────────────────────────────

export interface SerializedNode<TData = unknown> {
  id: NodeId;
  type?: string;
  position: XY;
  data: TData;
  measured?: { width: number; height: number };
  parentId?: NodeId;
  extent?: "parent" | Rect;
  draggable?: boolean;
  resizable?: boolean;
  selectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  zIndex?: number;
}

export interface SerializedEdge<TData = unknown> {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  sourceHandle?: HandleId;
  targetHandle?: HandleId;
  type?: string;
  data?: TData;
  animated?: boolean;
  label?: string;
  hidden?: boolean;
  zIndex?: number;
}

export interface FlowJSON {
  version: 1;
  viewport: Viewport;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}
