import { createContext, createSignal, onCleanup, useContext } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import type {
  ActiveConnection,
  Connection,
  EdgeBase,
  FlowStore,
  HandleId,
  InternalNode,
  NodeId,
  StoreChangeSet,
  Viewport,
  XY,
} from "@thrum/core";

export interface ConnectionTarget {
  nodeId: NodeId;
  handleId: HandleId;
}

export interface FlowContextValue {
  store: FlowStore;
  nodes: Accessor<InternalNode[]>;
  edges: Accessor<EdgeBase[]>;
  viewport: Accessor<Viewport>;
  connectionStartHandle: Accessor<ActiveConnection | null>;
  connectionPosition: Accessor<XY>;
  connectionTarget: Accessor<ConnectionTarget | null>;
  setConnectionTarget: Setter<ConnectionTarget | null>;
  onConnect?: (connection: Connection) => void;
}

export const FlowContext = createContext<FlowContextValue>();
export const NodeContext = createContext<NodeId>();

export function createFlowContextValue(store: FlowStore, onConnect?: (connection: Connection) => void): FlowContextValue {
  const s = store.getState();

  const [nodes, setNodes] = createSignal<InternalNode[]>([...s.nodes.values()], { equals: false });
  const [edges, setEdges] = createSignal<EdgeBase[]>([...s.edges.values()], { equals: false });
  const [viewport, setViewport] = createSignal<Viewport>({ ...s.viewport }, { equals: false });
  const [connectionStartHandle, setConnectionStartHandle] = createSignal<ActiveConnection | null>(s.connectionStartHandle, {
    equals: false,
  });
  const [connectionPosition, setConnectionPosition] = createSignal<XY>({ ...s.connectionPosition }, { equals: false });
  const [connectionTarget, setConnectionTarget] = createSignal<ConnectionTarget | null>(null);

  const unsub = store.subscribe((changes: StoreChangeSet) => {
    const state = store.getState();
    if (changes.nodes) setNodes([...state.nodes.values()]);
    if (changes.edges) setEdges([...state.edges.values()]);
    if (changes.viewport) setViewport({ ...state.viewport });
    if (changes.connection) {
      setConnectionStartHandle(state.connectionStartHandle);
      setConnectionPosition({ ...state.connectionPosition });
      if (!state.connectionStartHandle) setConnectionTarget(null);
    }
  });

  onCleanup(unsub);

  return { store, nodes, edges, viewport, connectionStartHandle, connectionPosition, connectionTarget, setConnectionTarget, onConnect };
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside <FlowRoot>");
  return ctx;
}

export function useNodeId(): NodeId {
  const id = useContext(NodeContext);
  if (id === undefined) throw new Error("useNodeId must be used inside <FlowNode>");
  return id;
}

/**
 * Returns a reactive accessor for the current node's live data.
 * Must be called inside a component that is a descendant of `<FlowNode>`.
 *
 * Uses a per-node store subscription so that only this node's signal is
 * updated when its data changes — unrelated store mutations (e.g. viewport
 * pan, connection drag) do not trigger a re-render for this component.
 */
export function useLiveNode<TData = unknown>(): Accessor<Readonly<InternalNode<TData>>> {
  const { store } = useFlow();
  const nodeId = useNodeId();

  const [node, setNode] = createSignal<Readonly<InternalNode<TData>>>(
    (store.getNode(nodeId) as Readonly<InternalNode<TData>>) ?? ({} as Readonly<InternalNode<TData>>),
    { equals: false },
  );

  const unsub = store.subscribe((changes: StoreChangeSet) => {
    if (!changes.nodes) return;
    // Non-empty changedNodeIds = specific nodes changed; skip if ours isn't among them.
    if (changes.changedNodeIds.size > 0 && !changes.changedNodeIds.has(nodeId)) return;
    const current = store.getNode(nodeId) as Readonly<InternalNode<TData>>;
    if (current) setNode(current);
  });

  onCleanup(unsub);

  return node;
}
