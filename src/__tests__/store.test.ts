jest.mock("zustand");

import { act } from "react-test-renderer";
import { useTreeViewStore } from "../store/treeView.store";
import { createRandomNumberSet, generateTree } from "../__mocks__/generateTree.mock";
import { type TreeNode } from "../types/treeView.types";
import { testStoreId } from "../constants/tests.constants";

describe("TreeViewStore", () => {
    const treeViewStore = useTreeViewStore(testStoreId);

    beforeEach(() => {
        treeViewStore.setState(treeViewStore.getState(), true);
    });

    test("updateChecked correctly updates the checked state", () => {
        const val1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateChecked(val1);
        });

        expect(treeViewStore.getState().checked).toEqual(val1);

        const val2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateChecked(val2);
        });

        expect(treeViewStore.getState().checked).toEqual(val2);
    });

    test("updateIndeterminate correctly updates the indeterminate state", () => {
        const val1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateIndeterminate(val1);
        });

        expect(treeViewStore.getState().indeterminate).toEqual(val1);

        const val2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateIndeterminate(val2);
        });

        expect(treeViewStore.getState().indeterminate).toEqual(val2);
    });

    test("updateExpanded correctly updates the expanded state", () => {
        const val1 = new Set(["1", "2"]);
        act(() => {
            treeViewStore.getState().updateExpanded(val1);
        });

        expect(treeViewStore.getState().expanded).toEqual(val1);

        const val2 = createRandomNumberSet();
        act(() => {
            treeViewStore.getState().updateExpanded(val2);
        });

        expect(treeViewStore.getState().expanded).toEqual(val2);
    });

    test("updateInitialTreeViewData correctly updates the initialTreeViewData state", () => {
        const val1: TreeNode[] = [{
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
            treeViewStore.getState().updateInitialTreeViewData(val1);
        });

        expect(treeViewStore.getState().initialTreeViewData).toEqual(val1);

        const val2 = generateTree(3, 3);
        act(() => {
            treeViewStore.getState().updateInitialTreeViewData(val2);
        });

        expect(treeViewStore.getState().initialTreeViewData).toEqual(val2);
    });

    test("updateNodeMap correctly updates the node map", () => {
        const val1 = new Map<string, TreeNode>();
        val1.set("1", generateTree(5, 10)[0] as TreeNode);
        act(() => {
            treeViewStore.getState().updateNodeMap(val1);
        });

        expect(treeViewStore.getState().nodeMap).toEqual(val1);

        const val2 = new Map<string, TreeNode>();
        val2.set("2", {} as TreeNode);
        act(() => {
            treeViewStore.getState().updateNodeMap(val2);
        });

        expect(treeViewStore.getState().nodeMap).toEqual(val2);
    });

    // Testing updateChildToParentMap
    test("updateChildToParentMap correctly updates the child to parent map", () => {
        const val1 = new Map<string, string>();
        val1.set("1", "2");
        act(() => {
            treeViewStore.getState().updateChildToParentMap(val1);
        });

        expect(treeViewStore.getState().childToParentMap).toEqual(val1);

        const val2 = new Map<string, string>();
        val2.set("3", "4");
        act(() => {
            treeViewStore.getState().updateChildToParentMap(val2);
        });

        expect(treeViewStore.getState().childToParentMap).toEqual(val2);
    });

    // Testing updateSearchText
    test("updateSearchText correctly updates the search text", () => {
        const val1 = "hello";
        act(() => {
            treeViewStore.getState().updateSearchText(val1);
        });

        expect(treeViewStore.getState().searchText).toEqual(val1);

        const val2 = "world";
        act(() => {
            treeViewStore.getState().updateSearchText(val2);
        });

        expect(treeViewStore.getState().searchText).toEqual(val2);
    });

    // Testing updateSearchKeys
    test("updateSearchKeys correctly updates the search keys", () => {
        const val1 = ["hello"];
        act(() => {
            treeViewStore.getState().updateSearchKeys(val1);
        });

        expect(treeViewStore.getState().searchKeys).toEqual(val1);

        const val2 = ["world"];
        act(() => {
            treeViewStore.getState().updateSearchKeys(val2);
        });

        expect(treeViewStore.getState().searchKeys).toEqual(val2);
    });

    // Testing updateInnerMostChildrenIds
    test("updateInnerMostChildrenIds correctly updates the inner most children ids", () => {
        const val1 = ["1", "2"];
        act(() => {
            treeViewStore.getState().updateInnerMostChildrenIds(val1);
        });

        expect(treeViewStore.getState().innerMostChildrenIds).toEqual(val1);

        const val2 = ["3", "4"];
        act(() => {
            treeViewStore.getState().updateInnerMostChildrenIds(val2);
        });

        expect(treeViewStore.getState().innerMostChildrenIds).toEqual(val2);
    });

    // Testing cleanUpTreeViewStore
    test("cleanUpTreeViewStore correctly cleans up the store", () => {
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
});