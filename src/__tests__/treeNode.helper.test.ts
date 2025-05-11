jest.mock("zustand");

import { act } from "react-test-renderer";
import { getTreeViewStore } from "../store/treeView.store";
import { type TreeNode } from "../types/treeView.types";
import { initializeNodeMaps } from "../helpers";
import { testStoreId } from "../constants/tests.constants";

describe("initNodeMap helper", () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);
    });

    test("initializeNodeMaps correctly initializes the node maps", () => {
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
});
describe("initNodeMap helper [number id]", () => {
    const useTreeViewStore = getTreeViewStore<number>(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);
    });

    test("initializeNodeMaps correctly initializes the node maps", () => {
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
