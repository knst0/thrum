import { describe, it, expect } from "vitest";
import { nodeId, edgeId } from "../types";
import { createFlowStore } from "../store";
import { serializeFlow, deserializeFlow, flowToString, flowFromString } from "../serialization";
import type { FlowJSON } from "../types";

function makeStore() {
  return createFlowStore({
    nodes: [
      { id: nodeId("a"), position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: nodeId("b"), position: { x: 100, y: 100 }, data: { label: "B" } },
    ],
    edges: [{ id: edgeId("e1"), source: nodeId("a"), target: nodeId("b") }],
  });
}

describe("serializeFlow / deserializeFlow", () => {
  it("round-trips nodes and edges", () => {
    const store = makeStore();
    const json = serializeFlow(store);

    expect(json.version).toBe(1);
    expect(json.nodes).toHaveLength(2);
    expect(json.edges).toHaveLength(1);

    const store2 = createFlowStore();
    deserializeFlow(store2, json);

    const state = store2.getState();
    expect(state.nodes.size).toBe(2);
    expect(state.edges.size).toBe(1);
    expect(state.nodes.get(nodeId("a"))?.position).toEqual({ x: 0, y: 0 });
  });

  it("preserves viewport", () => {
    const store = makeStore();
    store.setViewport({ x: 50, y: -30, zoom: 1.5 });
    const json = serializeFlow(store);
    expect(json.viewport).toEqual({ x: 50, y: -30, zoom: 1.5 });

    const store2 = createFlowStore();
    deserializeFlow(store2, json);
    expect(store2.getState().viewport).toEqual({ x: 50, y: -30, zoom: 1.5 });
  });
});

describe("flowToString / flowFromString", () => {
  it("round-trips through JSON string", () => {
    const store = makeStore();
    const str = flowToString(store);
    expect(typeof str).toBe("string");

    const store2 = createFlowStore();
    flowFromString(store2, str);
    expect(store2.getState().nodes.size).toBe(2);
    expect(store2.getState().edges.size).toBe(1);
  });

  it("throws on invalid JSON string", () => {
    const store = createFlowStore();
    expect(() => flowFromString(store, "not-json{{{")).toThrow("Invalid JSON string");
  });
});

describe("validation", () => {
  it("throws on wrong version", () => {
    const store = createFlowStore();
    expect(() => deserializeFlow(store, { version: 99 as 1, viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [] })).toThrow(
      "Unknown FlowJSON version",
    );
  });

  it("throws when nodes is not an array", () => {
    const store = createFlowStore();
    const bad = { version: 1, viewport: { x: 0, y: 0, zoom: 1 }, nodes: "bad", edges: [] } as unknown as FlowJSON;
    expect(() => deserializeFlow(store, bad)).toThrow("'nodes' must be an array");
  });

  it("throws when node missing id", () => {
    const store = createFlowStore();
    const bad: FlowJSON = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [{ position: { x: 0, y: 0 }, data: {} } as any],
      edges: [],
    };
    expect(() => deserializeFlow(store, bad)).toThrow("node.id must be a string");
  });

  it("throws when edge references non-existent node", () => {
    const store = createFlowStore();
    const bad: FlowJSON = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [{ id: nodeId("a"), position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: edgeId("e1"), source: nodeId("a"), target: nodeId("missing") }],
    };
    expect(() => deserializeFlow(store, bad)).toThrow("non-existent target node");
  });

  it("throws on circular parentId references", () => {
    const store = createFlowStore();
    const bad: FlowJSON = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: nodeId("a"), position: { x: 0, y: 0 }, data: {}, parentId: nodeId("b") },
        { id: nodeId("b"), position: { x: 0, y: 0 }, data: {}, parentId: nodeId("a") },
      ],
      edges: [],
    };
    expect(() => deserializeFlow(store, bad)).toThrow("circular parentId");
  });

  it("throws on non-existent parentId", () => {
    const store = createFlowStore();
    const bad: FlowJSON = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [{ id: nodeId("a"), position: { x: 0, y: 0 }, data: {}, parentId: nodeId("missing") }],
      edges: [],
    };
    expect(() => deserializeFlow(store, bad)).toThrow("non-existent parent");
  });
});
