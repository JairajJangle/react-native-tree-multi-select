jest.mock("zustand");

import { act } from "@testing-library/react-native";
import { getTreeViewStore } from "../store/treeView.store";
import { type TreeNode } from "../types/treeView.types";
import {
    getNodeDepthFromParentMap,
    getSubtreeDepthFromMap,
    initializeNodeMaps,
} from "../helpers";
import { testStoreId } from "../constants/tests.constants";

describe("initializeNodeMaps", () => {
    beforeEach(() => {
        const store = getTreeViewStore(testStoreId);
        store.setState(store.getState(), true);
    });

    it("given a tree with string IDs, when initializing, then nodeMap and childToParentMap are built correctly", () => {
        const useTreeViewStore = getTreeViewStore(testStoreId);

        const initialData: TreeNode[] = [
            {
                id: "1",
                name: "Node 1",
                children: [
                    { id: "1.1", name: "Node 1.1" },
                    { id: "1.2", name: "Node 1.2", children: [{ id: "1.2.1", name: "Node 1.2.1" }] },
                ],
            },
            { id: "2", name: "Node 2" },
        ];

        act(() => {
            initializeNodeMaps(testStoreId, initialData);
        });

        const { nodeMap, childToParentMap } = useTreeViewStore.getState();

        // The nodeMap should contain all nodes, regardless of depth
        expect(nodeMap.has("1")).toBeTruthy();
        expect(nodeMap.has("1.1")).toBeTruthy();
        expect(nodeMap.has("1.2")).toBeTruthy();
        expect(nodeMap.has("1.2.1")).toBeTruthy();
        expect(nodeMap.has("2")).toBeTruthy();

        // The childToParentMap should contain all non-root nodes
        expect(childToParentMap.has("1")).toBeFalsy(); // Root node
        expect(childToParentMap.get("1.1")).toEqual("1");
        expect(childToParentMap.get("1.2")).toEqual("1");
        expect(childToParentMap.get("1.2.1")).toEqual("1.2");
        expect(childToParentMap.has("2")).toBeFalsy(); // Root node
    });

    it("given a tree with numeric IDs, when initializing, then nodeMap and childToParentMap are built correctly", () => {
        const useTreeViewStore = getTreeViewStore<number>(testStoreId);

        const initialData: TreeNode<number>[] = [
            {
                id: 1,
                name: "Node 1",
                children: [
                    { id: 2, name: "Node 1.1" },
                    { id: 3, name: "Node 1.2", children: [{ id: 4, name: "Node 1.2.1" }] },
                ],
            },
            { id: 5, name: "Node 2" },
        ];

        act(() => {
            initializeNodeMaps(testStoreId, initialData);
        });

        const { nodeMap, childToParentMap } = useTreeViewStore.getState();

        // The nodeMap should contain all nodes, regardless of depth
        expect(nodeMap.has(1)).toBeTruthy();
        expect(nodeMap.has(2)).toBeTruthy();
        expect(nodeMap.has(3)).toBeTruthy();
        expect(nodeMap.has(4)).toBeTruthy();
        expect(nodeMap.has(5)).toBeTruthy();

        // The childToParentMap should contain all non-root nodes
        expect(childToParentMap.has(1)).toBeFalsy(); // Root node
        expect(childToParentMap.get(2)).toEqual(1);
        expect(childToParentMap.get(3)).toEqual(1);
        expect(childToParentMap.get(4)).toEqual(3);
        expect(childToParentMap.has(5)).toBeFalsy(); // Root node
    });
});

// tree used by the depth helpers:
//   A
//   ├── A1
//   │   └── A1a
//   └── A2
const depthTree: TreeNode<string>[] = [
    {
        id: "A", name: "A", children: [
            { id: "A1", name: "A1", children: [{ id: "A1a", name: "A1a" }] },
            { id: "A2", name: "A2" },
        ],
    },
];

function buildMaps() {
    act(() => {
        initializeNodeMaps(testStoreId, depthTree);
    });
    return getTreeViewStore<string>(testStoreId).getState();
}

describe("getSubtreeDepthFromMap", () => {
    beforeEach(() => {
        const store = getTreeViewStore(testStoreId);
        store.setState(store.getState(), true);
    });

    it("given a leaf node, when measuring, then it returns 0", () => {
        const { nodeMap } = buildMaps();
        expect(getSubtreeDepthFromMap(nodeMap, "A1a")).toBe(0);
        expect(getSubtreeDepthFromMap(nodeMap, "A2")).toBe(0);
    });

    it("given an inner node, when measuring, then it returns the deepest descendant distance", () => {
        const { nodeMap } = buildMaps();
        expect(getSubtreeDepthFromMap(nodeMap, "A")).toBe(2);  // A -> A1 -> A1a
        expect(getSubtreeDepthFromMap(nodeMap, "A1")).toBe(1); // A1 -> A1a
    });

    it("given an unknown id, when measuring, then it returns 0", () => {
        const { nodeMap } = buildMaps();
        expect(getSubtreeDepthFromMap(nodeMap, "ghost")).toBe(0);
    });
});

describe("getNodeDepthFromParentMap", () => {
    beforeEach(() => {
        const store = getTreeViewStore(testStoreId);
        store.setState(store.getState(), true);
    });

    it("given a root node, when measuring depth, then it returns 0", () => {
        const { childToParentMap } = buildMaps();
        expect(getNodeDepthFromParentMap(childToParentMap, "A")).toBe(0);
    });

    it("given nested nodes, when measuring depth, then it counts the parent chain", () => {
        const { childToParentMap } = buildMaps();
        expect(getNodeDepthFromParentMap(childToParentMap, "A1")).toBe(1);
        expect(getNodeDepthFromParentMap(childToParentMap, "A1a")).toBe(2);
        expect(getNodeDepthFromParentMap(childToParentMap, "A2")).toBe(1);
    });

    it("given an unknown id, when measuring depth, then it returns 0", () => {
        const { childToParentMap } = buildMaps();
        expect(getNodeDepthFromParentMap(childToParentMap, "ghost")).toBe(0);
    });
});
