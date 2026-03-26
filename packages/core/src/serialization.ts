import type { FlowStore, FlowJSON, SerializedNode, SerializedEdge, InternalNode, EdgeBase } from "./types.ts";

function stripInternals(node: InternalNode): SerializedNode {
  const { measured, absolutePosition: _abs, handleBounds: _hb, selected: _sel, dragging: _drag, resizing: _res, ...rest } = node;
  return measured ? { ...rest, measured } : rest;
}

function stripEdgeInternals(edge: EdgeBase): SerializedEdge {
  const { selectable: _s, deletable: _d, ...rest } = edge;
  return rest;
}

export function serializeFlow(store: FlowStore): FlowJSON {
  const state = store.getState();
  return {
    version: 1,
    viewport: { ...state.viewport },
    nodes: [...state.nodes.values()].map(stripInternals),
    edges: [...state.edges.values()].map(stripEdgeInternals),
  };
}

function validateFlowJSON(data: unknown): asserts data is FlowJSON {
  if (data == null || typeof data !== "object") throw new Error("Invalid FlowJSON: expected an object");
  const obj = data as Record<string, unknown>;
  if (obj["version"] !== 1) throw new Error(`Unknown FlowJSON version: ${obj["version"]}`);
  if (!Array.isArray(obj["nodes"])) throw new Error("Invalid FlowJSON: 'nodes' must be an array");
  if (!Array.isArray(obj["edges"])) throw new Error("Invalid FlowJSON: 'edges' must be an array");
  if (obj["viewport"] == null || typeof obj["viewport"] !== "object") throw new Error("Invalid FlowJSON: 'viewport' must be an object");

  for (const node of obj["nodes"] as unknown[]) {
    if (node == null || typeof node !== "object") throw new Error("Invalid FlowJSON: each node must be an object");
    const n = node as Record<string, unknown>;
    if (typeof n["id"] !== "string") throw new Error("Invalid FlowJSON: node.id must be a string");
    if (n["position"] == null || typeof n["position"] !== "object") throw new Error("Invalid FlowJSON: node.position must be an object");
  }

  for (const edge of obj["edges"] as unknown[]) {
    if (edge == null || typeof edge !== "object") throw new Error("Invalid FlowJSON: each edge must be an object");
    const e = edge as Record<string, unknown>;
    if (typeof e["id"] !== "string") throw new Error("Invalid FlowJSON: edge.id must be a string");
    if (typeof e["source"] !== "string") throw new Error("Invalid FlowJSON: edge.source must be a string");
    if (typeof e["target"] !== "string") throw new Error("Invalid FlowJSON: edge.target must be a string");
  }
}

function detectParentCycles(nodes: SerializedNode[]): void {
  const parentMap = new Map<string, string>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    parentMap.set(node.id, node.parentId);
  }
  const nodeIds = new Set<string>(nodes.map((n) => n.id));
  for (const node of nodes) {
    if (!node.parentId) continue;
    if (!nodeIds.has(node.parentId))
      throw new Error(`Invalid FlowJSON: node "${node.id}" references non-existent parent "${node.parentId}"`);
    const visited = new Set<string>();
    let current: string | undefined = node.id;
    while (current) {
      if (visited.has(current)) throw new Error(`Invalid FlowJSON: circular parentId reference detected involving node "${current}"`);
      visited.add(current);
      current = parentMap.get(current);
    }
  }
}

export function deserializeFlow(store: FlowStore, json: FlowJSON): void {
  validateFlowJSON(json);

  // Validate edge references
  const nodeIds = new Set<string>(json.nodes.map((n) => n.id));
  for (const edge of json.edges) {
    if (!nodeIds.has(edge.source))
      throw new Error(`Invalid FlowJSON: edge "${edge.id}" references non-existent source node "${edge.source}"`);
    if (!nodeIds.has(edge.target))
      throw new Error(`Invalid FlowJSON: edge "${edge.id}" references non-existent target node "${edge.target}"`);
  }

  detectParentCycles(json.nodes);

  store.batch(() => {
    store.clear();
    for (const node of json.nodes) store.addNode(node);
    for (const edge of json.edges) store.addEdge(edge);
    store.setViewport(json.viewport);
  });
}
