jest.mock("zustand");

import { getTreeViewStore } from "../store/treeView.store";
import {
    getCheckboxValue,
    initializeNodeMaps,
    toggleCheckboxes
} from "../helpers";
import { act } from "react-test-renderer";
import { tree3d2b } from "../__mocks__/generateTree.mock";
import { testStoreId } from "../constants/tests.constants";

describe("getCheckboxValue", () => {
    it("when called with each combination, then returns the correct tri-state value", () => {
        expect(getCheckboxValue(true, false)).toBe(true);
        expect(getCheckboxValue(false, false)).toBe(false);
        expect(getCheckboxValue(false, true)).toBe("indeterminate");
        expect(getCheckboxValue(true, true)).toBe("indeterminate");
    });
});

describe("toggleCheckboxes", () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.getState().cleanUpTreeViewStore();

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it("given default propagation, when checking parents then unchecking a child then rechecking, then checked/indeterminate update through full lifecycle", () => {
        // Check nodes 1 and 2: all descendants should be checked
        act(() => {
            toggleCheckboxes(testStoreId, ["1", "2"], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            "1", "1.1", "1.1.1", "1.1.2", "1.2", "1.2.1", "1.2.2",
            "2", "2.1", "2.1.1", "2.1.2", "2.2", "2.2.1", "2.2.2"
        ]));
        expect(indeterminate).toEqual(new Set([]));

        // Uncheck node 1.2: parent 1 becomes indeterminate
        act(() => {
            toggleCheckboxes(testStoreId, ["1.2"]);
        });

        const {
            checked: checkedAfterUncheck,
            indeterminate: indeterminateAfterUncheck
        } = useTreeViewStore.getState();
        expect(checkedAfterUncheck).toEqual(new Set([
            "1.1", "1.1.1", "1.1.2",
            "2", "2.1", "2.1.1", "2.1.2", "2.2", "2.2.1", "2.2.2"
        ]));
        expect(indeterminateAfterUncheck).toEqual(new Set(["1"]));

        // Uncheck node 2: entire branch 2 unchecked
        act(() => {
            toggleCheckboxes(testStoreId, ["2"]);
        });

        const {
            checked: checkedAfterUncheck2,
            indeterminate: indeterminateAfterUncheck2
        } = useTreeViewStore.getState();
        expect(checkedAfterUncheck2).toEqual(new Set(["1.1", "1.1.1", "1.1.2"]));
        expect(indeterminateAfterUncheck2).toEqual(new Set(["1"]));

        // Recheck node 1.2: all children of 1 are checked so 1 becomes fully checked
        act(() => {
            toggleCheckboxes(testStoreId, ["1.2"]);
        });

        const {
            checked: checkedAfter1ChildrenCheck,
            indeterminate: indeterminateAfter1ChildrenCheck
        } = useTreeViewStore.getState();
        expect(checkedAfter1ChildrenCheck).toEqual(new Set([
            "1", "1.1", "1.1.1", "1.1.2", "1.2", "1.2.1", "1.2.2"
        ]));
        expect(indeterminateAfter1ChildrenCheck).toEqual(new Set([]));
    });

    describe("given selectionPropagation to both parents and children", () => {
        it("when checking and unchecking, then children and parents propagate correctly", () => {
            useTreeViewStore.getState().setSelectionPropagation({
                toChildren: true,
                toParents: true,
            });

            // Check parent 1: all descendants selected
            act(() => {
                toggleCheckboxes(testStoreId, ["1"], true);
            });

            let { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                "1", "1.1", "1.1.1", "1.1.2", "1.2", "1.2.1", "1.2.2",
            ]));
            expect(indeterminate).toEqual(new Set([]));

            // Uncheck parent 1: all descendants deselected
            act(() => {
                toggleCheckboxes(testStoreId, ["1"], false);
            });

            ({ checked, indeterminate } = useTreeViewStore.getState());
            expect(checked).toEqual(new Set([]));
            expect(indeterminate).toEqual(new Set([]));

            // Check child 1.1: parent 1 becomes indeterminate, siblings stay unchecked
            act(() => {
                toggleCheckboxes(testStoreId, ["1.1"], true);
            });

            ({ checked, indeterminate } = useTreeViewStore.getState());
            expect(checked).toEqual(new Set(["1.1", "1.1.1", "1.1.2"]));
            expect(indeterminate).toEqual(new Set(["1"]));
            expect(checked.has("1.2")).toBeFalsy();
            expect(checked.has("1.2.1")).toBeFalsy();
            expect(checked.has("1.2.2")).toBeFalsy();
        });

        it("when default propagation is used (empty object), then behavior matches toChildren+toParents=true", () => {
            useTreeViewStore.getState().setSelectionPropagation({});

            // Check child 1.1: children propagate, parent 1 becomes indeterminate
            act(() => {
                toggleCheckboxes(testStoreId, ["1.1"], true);
            });

            let { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set(["1.1", "1.1.1", "1.1.2"]));
            expect(indeterminate).toEqual(new Set(["1"]));
            expect(checked.has("1")).toBeFalsy();
            expect(checked.has("1.1.1")).toBeTruthy();
            expect(checked.has("1.1.2")).toBeTruthy();
            expect(checked.has("1.2")).toBeFalsy();
            expect(checked.has("1.2.1")).toBeFalsy();
            expect(checked.has("1.2.2")).toBeFalsy();

            // Check leaf 2.1.1: indeterminate propagates up through 2.1 and 2
            act(() => {
                toggleCheckboxes(testStoreId, ["2.1.1"], true);
            });

            ({ checked, indeterminate } = useTreeViewStore.getState());
            expect(checked).toEqual(new Set(["1.1", "1.1.1", "1.1.2", "2.1.1"]));
            expect(indeterminate).toEqual(new Set(["1", "2.1", "2"]));
            expect(checked.has("2")).toBeFalsy();
            expect(checked.has("2.1")).toBeFalsy();
            expect(checked.has("2.1.2")).toBeFalsy();
            expect(checked.has("2.2")).toBeFalsy();
            expect(checked.has("2.2.1")).toBeFalsy();
            expect(checked.has("2.2.2")).toBeFalsy();
        });
    });

    it("given selectionPropagation to children only, when checking a child, then children propagate but parent does not", () => {
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: true,
            toParents: false,
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1"], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1", "1.1.1", "1.1.2"]));
        expect(indeterminate).toEqual(new Set([]));
        expect(checked.has("1")).toBeFalsy();
        expect(checked.has("1.2")).toBeFalsy();
        expect(checked.has("1.2.1")).toBeFalsy();
        expect(checked.has("1.2.2")).toBeFalsy();
    });

    it("given selectionPropagation to parents only, when checking a child, then parent becomes indeterminate but children do not propagate", () => {
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: false,
            toParents: true,
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1"], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1"]));
        expect(indeterminate).toEqual(new Set(["1"]));

        // Children of 1.1 should NOT be checked
        expect(checked.has("1")).toBeFalsy();
        expect(checked.has("1.1.1")).toBeFalsy();
        expect(checked.has("1.1.2")).toBeFalsy();
        // Siblings and other branches untouched
        expect(checked.has("1.2")).toBeFalsy();
        expect(checked.has("1.2.1")).toBeFalsy();
        expect(checked.has("1.2.2")).toBeFalsy();
        expect(checked.has("2")).toBeFalsy();
        expect(checked.has("2.1")).toBeFalsy();
        expect(checked.has("2.1.1")).toBeFalsy();
        expect(checked.has("2.1.2")).toBeFalsy();
        expect(checked.has("2.2")).toBeFalsy();
        expect(checked.has("2.2.1")).toBeFalsy();
        expect(checked.has("2.2.2")).toBeFalsy();
    });

    it("given no propagation, when checking and unchecking nodes, then only the targeted node changes and children are preserved", () => {
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: false,
            toParents: false,
        });

        // Check a single node: only that node is checked
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1"], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1"]));
        expect(indeterminate).toEqual(new Set([]));
        expect(checked.has("1")).toBeFalsy();
        expect(checked.has("1.1.1")).toBeFalsy();
        expect(checked.has("1.1.2")).toBeFalsy();
        expect(checked.has("1.2")).toBeFalsy();
        expect(checked.has("1.2.1")).toBeFalsy();
        expect(checked.has("1.2.2")).toBeFalsy();

        // Check another node in different branch: both independently checked
        act(() => {
            toggleCheckboxes(testStoreId, ["2.1.1"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1", "2.1.1"]));
        expect(indeterminate).toEqual(new Set([]));
        expect(checked.has("2")).toBeFalsy();
        expect(checked.has("2.1")).toBeFalsy();
        expect(checked.has("2.1.2")).toBeFalsy();
        expect(checked.has("2.2")).toBeFalsy();
        expect(checked.has("2.2.1")).toBeFalsy();
        expect(checked.has("2.2.2")).toBeFalsy();

        // Unchecking parent with toChildren=false does not uncheck independently-checked child
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1", "1.1.1"], true);
        });
        expect(useTreeViewStore.getState().checked.has("1.1")).toBe(true);
        expect(useTreeViewStore.getState().checked.has("1.1.1")).toBe(true);

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1"], false);
        });
        ({ checked } = useTreeViewStore.getState());
        expect(checked.has("1.1")).toBe(false);
        expect(checked.has("1.1.1")).toBe(true); // Child untouched
    });

    it("given invalid input, when toggling empty IDs or non-existent IDs, then state is unchanged", () => {
        // Empty IDs array
        act(() => {
            toggleCheckboxes(testStoreId, [], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());

        // Non-existent node ID
        act(() => {
            toggleCheckboxes(testStoreId, ["non-existent-id"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());
    });

    it("given a leaf node, when toggling check and uncheck, then ancestors update to indeterminate and back", () => {
        // Check a single leaf node
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1"], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));

        // Uncheck the same leaf: ancestors clear indeterminate
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1"], false);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());

        // Check a different leaf (no children) to cover the same path
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.2"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1.2"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));
    });

    it("given nodes in separate branches, when toggling, then branches are independent", () => {
        // Select nodes in different branches
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1", "2.1.2"], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1", "2.1.2"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1", "2.1", "2"]));

        // Select from two disjoint branches
        act(() => {
            useTreeViewStore.getState().cleanUpTreeViewStore();
            useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
            initializeNodeMaps(testStoreId, tree3d2b);
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1", "2.2.2"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1.1", "2.2.2"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1", "2.2", "2"]));

        // Selecting in branch 1 then verifying branch 2 untouched
        act(() => {
            useTreeViewStore.getState().cleanUpTreeViewStore();
            useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
            initializeNodeMaps(testStoreId, tree3d2b);
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1", "1.1.1", "1.1.2"]));
        expect(indeterminate).toEqual(new Set(["1"]));

        // Unselect one child; verify branch 2 still untouched
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1"], false);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1.2"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));
        expect(checked.has("2")).toBeFalsy();
        expect(indeterminate.has("2")).toBeFalsy();
    });

    it("given duplicate IDs, when toggling, then duplicates are idempotent", () => {
        // Duplicate IDs in the same call
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1", "1.1.1"], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));
    });

    it("given siblings, when all are checked, then parent becomes checked", () => {
        // Check first sibling: parent is indeterminate
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1"], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));

        // Check second sibling: parent 1.1 becomes fully checked
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.2"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1.1", "1.1.2", "1.1"]));
        expect(indeterminate).toEqual(new Set(["1"]));

        // Both siblings checked via single call also works
        act(() => {
            useTreeViewStore.getState().cleanUpTreeViewStore();
            useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
            initializeNodeMaps(testStoreId, tree3d2b);
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1", "1.1.2"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(["1.1.1", "1.1.2", "1.1"]));
        expect(indeterminate).toEqual(new Set(["1"]));
    });

    it("given indeterminate parent, when force-checking parent, then all descendants become checked", () => {
        // Create indeterminate state: check 1.1.1 and 1.2.1
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1", "1.2.1"], true);
        });

        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1", "1.2.1"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1.2", "1"]));

        // Force-check indeterminate parent 1: all descendants become checked
        act(() => {
            toggleCheckboxes(testStoreId, ["1"], true);
        });

        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set([
            "1", "1.1", "1.1.1", "1.1.2", "1.2", "1.2.1", "1.2.2",
        ]));
        expect(indeterminate).toEqual(new Set([]));
    });

    it("given a deep tree, when checking deepest leaf, then indeterminate propagates up entire chain", () => {
        // Use a 4-level deep tree
        const extendedTree = [
            {
                "id": "1",
                "name": "node1",
                "children": [
                    {
                        "id": "1.1",
                        "name": "node1.1",
                        "children": [
                            {
                                "id": "1.1.1",
                                "name": "node1.1.1",
                                "children": [
                                    {
                                        "id": "1.1.1.1",
                                        "name": "node1.1.1.1"
                                    }
                                ]
                            },
                            {
                                "id": "1.1.2",
                                "name": "node1.1.2"
                            }
                        ]
                    }
                ]
            }
        ];

        act(() => {
            useTreeViewStore.getState().updateInitialTreeViewData(extendedTree);
            initializeNodeMaps(testStoreId, extendedTree);
        });

        // Check deepest leaf
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1.1"], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(["1.1.1.1", "1.1.1"]));
        expect(indeterminate).toEqual(new Set(["1.1", "1"]));

        // Also verify node with empty children array (node 3 from tree3d2b)
        act(() => {
            useTreeViewStore.getState().cleanUpTreeViewStore();
            useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
            initializeNodeMaps(testStoreId, tree3d2b);
        });

        act(() => {
            toggleCheckboxes(testStoreId, ["3"], true);
        });

        const { checked: checked2, indeterminate: indeterminate2 } = useTreeViewStore.getState();
        expect(checked2).toEqual(new Set(["3"]));
        expect(indeterminate2).toEqual(new Set());

        act(() => {
            toggleCheckboxes(testStoreId, ["3"], false);
        });

        const { checked: checked3, indeterminate: indeterminate3 } = useTreeViewStore.getState();
        expect(checked3).toEqual(new Set());
        expect(indeterminate3).toEqual(new Set());
    });

    it("given inconsistent nodeMap, when toggling a node whose children are missing from nodeMap, then the guard skips gracefully", () => {
        // Manually inject a node that references children not in nodeMap
        const store = useTreeViewStore;
        const nodeMap = new Map(store.getState().nodeMap);
        // Add a fake parent whose child "ghost" doesn't exist in nodeMap
        nodeMap.set("fake-parent" as any, { id: "fake-parent", name: "Fake", children: [{ id: "ghost", name: "Ghost" }] } as any);
        act(() => {
            store.getState().updateNodeMap(nodeMap as any);
        });

        // Toggle the fake parent — updateChildrenIteratively will try to find "ghost" in nodeMap
        act(() => {
            toggleCheckboxes(testStoreId, ["fake-parent" as any], true);
        });

        // The guard `if (!node) continue` should have skipped "ghost" without crashing
        const { checked } = store.getState();
        expect(checked.has("fake-parent" as any)).toBe(true);
    });

    it("given a childToParentMap pointing to a childless node, when toggling propagates to parents, then the guard skips gracefully", () => {
        const store = useTreeViewStore;
        const childToParentMap = new Map(store.getState().childToParentMap);
        // Make a leaf node ("3") appear as a parent of a checked node
        childToParentMap.set("1.1.1" as any, "3" as any);
        act(() => {
            store.getState().updateChildToParentMap(childToParentMap as any);
        });

        // Toggle 1.1.1 — parent propagation walks up to "3" which has no children
        act(() => {
            toggleCheckboxes(testStoreId, ["1.1.1"], true);
        });

        // The guard `if (!node?.children?.length) return` in updateNodeState should have skipped "3"
        const { checked } = store.getState();
        expect(checked.has("1.1.1")).toBe(true);
    });
});
