jest.mock("zustand");

import { act } from "@testing-library/react-native";
import { deleteTreeViewStore, getTreeViewStore, useTreeViewStore } from "../store/treeView.store";
import { createRandomNumberSet, generateTree } from "../__mocks__/generateTree.mock";
import { type TreeNode } from "../types/treeView.types";
import { testStoreId } from "../constants/tests.constants";

describe("TreeViewStore", () => {
    const treeViewStore = useTreeViewStore(testStoreId);

    beforeEach(() => {
        treeViewStore.setState(treeViewStore.getState(), true);
    });

    it("given a fresh store, when updating each state property, then values persist correctly", () => {
        // updateChecked
        const checkedVal1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateChecked(checkedVal1);
        });
        expect(treeViewStore.getState().checked).toEqual(checkedVal1);

        const checkedVal2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateChecked(checkedVal2);
        });
        expect(treeViewStore.getState().checked).toEqual(checkedVal2);

        // updateIndeterminate
        const indeterminateVal1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateIndeterminate(indeterminateVal1);
        });
        expect(treeViewStore.getState().indeterminate).toEqual(indeterminateVal1);

        const indeterminateVal2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateIndeterminate(indeterminateVal2);
        });
        expect(treeViewStore.getState().indeterminate).toEqual(indeterminateVal2);

        // updateExpanded
        const expandedVal1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateExpanded(expandedVal1);
        });
        expect(treeViewStore.getState().expanded).toEqual(expandedVal1);

        const expandedVal2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateExpanded(expandedVal2);
        });
        expect(treeViewStore.getState().expanded).toEqual(expandedVal2);

        // updateInitialTreeViewData
        const treeVal1: TreeNode[] = [{
            id: "1",
            name: "node1",
            children: [
                {
                    id: "1.1", name: "node1.1", children: [
                        { id: "1.1.1", name: "node1.1.1" },
                        { id: "1.1.2", name: "node1.1.2" },
                        { id: "1.1.3", name: "node1.1.3" },
                    ]
                },
                {
                    id: "1.2", name: "node1.2", children: [
                        { id: "1.2.1", name: "node1.2.1" },
                        { id: "1.2.2", name: "node1.2.2" },
                        { id: "1.2.3", name: "node1.2.3" },
                    ]
                },
                {
                    id: "1.3", name: "node1.3", children: [
                        { id: "1.3.1", name: "node1.3.1" },
                        { id: "1.3.2", name: "node1.3.2" },
                        { id: "1.3.3", name: "node1.3.3" },
                    ]
                },
            ],
        }];
        act(() => {
            treeViewStore.getState().updateInitialTreeViewData(treeVal1);
        });
        expect(treeViewStore.getState().initialTreeViewData).toEqual(treeVal1);

        const treeVal2 = generateTree(3, 3);
        act(() => {
            treeViewStore.getState().updateInitialTreeViewData(treeVal2);
        });
        expect(treeViewStore.getState().initialTreeViewData).toEqual(treeVal2);

        // updateNodeMap
        const nodeMapVal1 = new Map<string, TreeNode>();
        nodeMapVal1.set("1", generateTree(5, 10)[0] as TreeNode);
        act(() => {
            treeViewStore.getState().updateNodeMap(nodeMapVal1);
        });
        expect(treeViewStore.getState().nodeMap).toEqual(nodeMapVal1);

        const nodeMapVal2 = new Map<string, TreeNode>();
        nodeMapVal2.set("2", {} as TreeNode);
        act(() => {
            treeViewStore.getState().updateNodeMap(nodeMapVal2);
        });
        expect(treeViewStore.getState().nodeMap).toEqual(nodeMapVal2);

        // updateChildToParentMap
        const childParentVal1 = new Map<string, string>();
        childParentVal1.set("1", "2");
        act(() => {
            treeViewStore.getState().updateChildToParentMap(childParentVal1);
        });
        expect(treeViewStore.getState().childToParentMap).toEqual(childParentVal1);

        const childParentVal2 = new Map<string, string>();
        childParentVal2.set("3", "4");
        act(() => {
            treeViewStore.getState().updateChildToParentMap(childParentVal2);
        });
        expect(treeViewStore.getState().childToParentMap).toEqual(childParentVal2);

        // updateSearchText
        act(() => {
            treeViewStore.getState().updateSearchText("hello");
        });
        expect(treeViewStore.getState().searchText).toEqual("hello");

        act(() => {
            treeViewStore.getState().updateSearchText("world");
        });
        expect(treeViewStore.getState().searchText).toEqual("world");

        // updateSearchKeys
        act(() => {
            treeViewStore.getState().updateSearchKeys(["hello"]);
        });
        expect(treeViewStore.getState().searchKeys).toEqual(["hello"]);

        act(() => {
            treeViewStore.getState().updateSearchKeys(["world"]);
        });
        expect(treeViewStore.getState().searchKeys).toEqual(["world"]);

        // updateInnerMostChildrenIds
        act(() => {
            treeViewStore.getState().updateInnerMostChildrenIds(["1", "2"]);
        });
        expect(treeViewStore.getState().innerMostChildrenIds).toEqual(["1", "2"]);

        act(() => {
            treeViewStore.getState().updateInnerMostChildrenIds(["3", "4"]);
        });
        expect(treeViewStore.getState().innerMostChildrenIds).toEqual(["3", "4"]);
    });

    it("given a store with data, when cleaning up, then all state resets to defaults", () => {
        act(() => {
            treeViewStore.getState().cleanUpTreeViewStore();
        });

        expect(treeViewStore.getState().checked).toEqual(new Set());
        expect(treeViewStore.getState().indeterminate).toEqual(new Set());
        expect(treeViewStore.getState().expanded).toEqual(new Set());
        expect(treeViewStore.getState().initialTreeViewData).toEqual([]);
        expect(treeViewStore.getState().nodeMap).toEqual(new Map());
        expect(treeViewStore.getState().childToParentMap).toEqual(new Map());
        expect(treeViewStore.getState().searchText).toEqual("");
        expect(treeViewStore.getState().searchKeys).toEqual([""]);
        expect(treeViewStore.getState().innerMostChildrenIds).toEqual([]);
    });

    it("given an existing store, when deleting it, then next access creates fresh store", () => {
        const tempId = "temp-store-for-delete-test";
        const store = getTreeViewStore<string>(tempId);

        // Set some state to verify it's a real store
        act(() => {
            store.getState().updateChecked(new Set(["x"]));
        });
        expect(store.getState().checked.has("x")).toBe(true);

        // Delete the store
        deleteTreeViewStore(tempId);

        // Next access should create a fresh store with default state
        const freshStore = getTreeViewStore<string>(tempId);
        expect(freshStore.getState().checked.size).toBe(0);

        // Clean up
        deleteTreeViewStore(tempId);
    });
});
