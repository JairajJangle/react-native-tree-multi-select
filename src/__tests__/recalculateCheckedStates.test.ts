jest.mock("zustand");

import { act } from "react-test-renderer";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps, toggleCheckboxes, recalculateCheckedStates } from "../helpers";
import { moveTreeNode } from "../helpers/moveTreeNode.helper";
import type { TreeNode } from "../types/treeView.types";

const STORE_ID = "recalculate-test-store";

/**
 * Test tree:
 *  1
 *  ├── 1.1
 *  │   ├── 1.1.1
 *  │   └── 1.1.2
 *  └── 1.2
 *  2
 *  ├── 2.1
 *  └── 2.2
 *  3 (leaf)
 */
function makeTree(): TreeNode<string>[] {
    return [
        {
            id: "1", name: "node1", children: [
                {
                    id: "1.1", name: "node1.1", children: [
                        { id: "1.1.1", name: "node1.1.1" },
                        { id: "1.1.2", name: "node1.1.2" },
                    ]
                },
                { id: "1.2", name: "node1.2" },
            ]
        },
        {
            id: "2", name: "node2", children: [
                { id: "2.1", name: "node2.1" },
                { id: "2.2", name: "node2.2" },
            ]
        },
        { id: "3", name: "node3" },
    ];
}

/**
 * Simulates a drag-drop move: moveTreeNode + updateInitialTreeViewData +
 * initializeNodeMaps + recalculateCheckedStates, matching the real
 * handleDragEnd flow.
 */
function simulateDragDrop(
    draggedNodeId: string,
    targetNodeId: string,
    position: "above" | "below" | "inside"
) {
    const store = getTreeViewStore<string>(STORE_ID);
    const currentData = store.getState().initialTreeViewData;
    const newData = moveTreeNode(currentData, draggedNodeId, targetNodeId, position);

    act(() => {
        store.getState().updateInitialTreeViewData(newData);
        initializeNodeMaps(STORE_ID, newData);
        recalculateCheckedStates<string>(STORE_ID);
    });

    return newData;
}

describe("recalculateCheckedStates", () => {
    const store = getTreeViewStore<string>(STORE_ID);

    beforeEach(() => {
        store.getState().cleanUpTreeViewStore();
        const tree = makeTree();
        act(() => {
            store.getState().updateInitialTreeViewData(tree);
            initializeNodeMaps(STORE_ID, tree);
        });
    });

    // =====================
    // BASIC PARENT RECALCULATION
    // =====================
    describe("parent state recalculation after move", () => {
        it("makes fully-checked parent indeterminate when unchecked node is moved inside", () => {
            // Check all children of 2 → parent 2 becomes checked
            act(() => {
                toggleCheckboxes(STORE_ID, ["2.1", "2.2"], true);
            });

            const { checked: before } = store.getState();
            expect(before.has("2")).toBe(true);
            expect(before.has("2.1")).toBe(true);
            expect(before.has("2.2")).toBe(true);

            // Move unchecked leaf "3" inside node "2"
            simulateDragDrop("3", "2", "inside");

            // 2 now has children [3✗, 2.1✓, 2.2✓] → should be indeterminate
            const { checked, indeterminate } = store.getState();
            expect(checked.has("2")).toBe(false);
            expect(indeterminate.has("2")).toBe(true);
            expect(checked.has("2.1")).toBe(true);
            expect(checked.has("2.2")).toBe(true);
            expect(checked.has("3")).toBe(false);
        });

        it("makes indeterminate parent unchecked when only checked child is moved out", () => {
            // Check 1.1.1 → 1.1 becomes indeterminate, 1 becomes indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1"], true);
            });

            expect(store.getState().indeterminate.has("1.1")).toBe(true);
            expect(store.getState().indeterminate.has("1")).toBe(true);

            // Move the checked leaf 1.1.1 out → below node 3
            simulateDragDrop("1.1.1", "3", "below");

            // 1.1 now has only [1.1.2✗] → unchecked
            // 1 now has [1.1✗, 1.2✗] → unchecked
            const { checked, indeterminate } = store.getState();
            expect(checked.has("1.1")).toBe(false);
            expect(indeterminate.has("1.1")).toBe(false);
            expect(checked.has("1")).toBe(false);
            expect(indeterminate.has("1")).toBe(false);

            // The moved leaf retains its checked state
            expect(checked.has("1.1.1")).toBe(true);
        });

        it("makes parent checked when all children become checked after move", () => {
            // Check 2.1 only → 2 becomes indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["2.1"], true);
            });

            expect(store.getState().indeterminate.has("2")).toBe(true);

            // Move unchecked 2.2 out → below 3
            simulateDragDrop("2.2", "3", "below");

            // 2 now has only [2.1✓] → fully checked
            const { checked, indeterminate } = store.getState();
            expect(checked.has("2")).toBe(true);
            expect(indeterminate.has("2")).toBe(false);
        });
    });

    // =====================
    // CROSS-BRANCH MOVES
    // =====================
    describe("cross-branch moves update both old and new parent chains", () => {
        it("updates both source and target parent chains", () => {
            // Check all of node 1's subtree → 1 is fully checked
            act(() => {
                toggleCheckboxes(STORE_ID, ["1"], true);
            });

            expect(store.getState().checked.has("1")).toBe(true);
            expect(store.getState().checked.has("1.1")).toBe(true);
            expect(store.getState().checked.has("1.2")).toBe(true);

            // Move checked leaf 1.2 inside unchecked node 2
            simulateDragDrop("1.2", "2", "inside");

            const { checked, indeterminate } = store.getState();

            // Source: 1 still has [1.1✓] → 1 stays checked
            expect(checked.has("1")).toBe(true);
            expect(checked.has("1.1")).toBe(true);

            // Target: 2 now has [1.2✓, 2.1✗, 2.2✗] → indeterminate
            expect(checked.has("2")).toBe(false);
            expect(indeterminate.has("2")).toBe(true);
            expect(checked.has("1.2")).toBe(true);
        });

        it("moves checked subtree between branches and recalculates grandparents", () => {
            // Check 1.1 (and its children via propagation) → 1.1 checked, 1 indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1"], true);
            });

            expect(store.getState().checked.has("1.1")).toBe(true);
            expect(store.getState().checked.has("1.1.1")).toBe(true);
            expect(store.getState().checked.has("1.1.2")).toBe(true);
            expect(store.getState().indeterminate.has("1")).toBe(true);

            // Move entire subtree 1.1 inside node 2
            simulateDragDrop("1.1", "2", "inside");

            const { checked, indeterminate } = store.getState();

            // Source: 1 now has only [1.2✗] → unchecked
            expect(checked.has("1")).toBe(false);
            expect(indeterminate.has("1")).toBe(false);

            // Target: 2 now has [1.1✓, 2.1✗, 2.2✗] → indeterminate
            expect(checked.has("2")).toBe(false);
            expect(indeterminate.has("2")).toBe(true);

            // Moved subtree retains internal checked state
            expect(checked.has("1.1")).toBe(true);
            expect(checked.has("1.1.1")).toBe(true);
            expect(checked.has("1.1.2")).toBe(true);
        });
    });

    // =====================
    // LEAF INDETERMINATE CLEANUP
    // =====================
    describe("leaf node indeterminate cleanup", () => {
        it("clears indeterminate from a node that loses all its children", () => {
            // Make 2 have only 1 child: remove 2.2 first
            simulateDragDrop("2.2", "3", "below");

            // Now node 2 has one child [2.1]. Check 2.1 → 2 becomes checked.
            // Then uncheck 2.1 → 2 becomes unchecked.
            // But let's create indeterminate some other way...

            // Reset and use a tree where node has 1 indeterminate child
            store.getState().cleanUpTreeViewStore();
            const tree: TreeNode<string>[] = [
                {
                    id: "P", name: "Parent", children: [
                        {
                            id: "C", name: "Child", children: [
                                { id: "C1", name: "C1" },
                                { id: "C2", name: "C2" },
                            ]
                        },
                    ]
                },
                { id: "X", name: "X" },
            ];
            act(() => {
                store.getState().updateInitialTreeViewData(tree);
                initializeNodeMaps(STORE_ID, tree);
            });

            // Check C1 only → C becomes indeterminate, P becomes indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["C1"], true);
            });

            expect(store.getState().indeterminate.has("C")).toBe(true);
            expect(store.getState().indeterminate.has("P")).toBe(true);

            // Move the only child C out of P → P becomes a leaf
            const currentData = store.getState().initialTreeViewData;
            const newData = moveTreeNode(currentData, "C", "X", "below");
            act(() => {
                store.getState().updateInitialTreeViewData(newData);
                initializeNodeMaps(STORE_ID, newData);
                recalculateCheckedStates<string>(STORE_ID);
            });

            // P is now a leaf — must NOT be indeterminate
            const { checked, indeterminate } = store.getState();
            expect(indeterminate.has("P")).toBe(false);
            expect(checked.has("P")).toBe(false);

            // C retains its indeterminate state (it still has children C1✓, C2✗)
            expect(indeterminate.has("C")).toBe(true);
            expect(checked.has("C1")).toBe(true);
            expect(checked.has("C2")).toBe(false);
        });
    });

    // =====================
    // SELECTION PROPAGATION MODES
    // =====================
    describe("respects selectionPropagation settings", () => {
        it("does not recalculate when toParents is false", () => {
            // Set toParents = false
            act(() => {
                store.getState().setSelectionPropagation({
                    toChildren: true,
                    toParents: false,
                });
            });

            // Manually set 2 as checked (simulating direct user action)
            act(() => {
                toggleCheckboxes(STORE_ID, ["2"], true);
            });

            // 2 should be checked (along with children via toChildren)
            expect(store.getState().checked.has("2")).toBe(true);
            expect(store.getState().checked.has("2.1")).toBe(true);
            expect(store.getState().checked.has("2.2")).toBe(true);

            // Move unchecked "3" inside "2"
            simulateDragDrop("3", "2", "inside");

            // With toParents=false, recalculate is a no-op → 2 stays checked
            const { checked } = store.getState();
            expect(checked.has("2")).toBe(true);
            expect(checked.has("3")).toBe(false);
        });

        it("recalculates correctly with default selectionPropagation (both true)", () => {
            // Default is toChildren: true, toParents: true
            // Check all of 2's children
            act(() => {
                toggleCheckboxes(STORE_ID, ["2.1", "2.2"], true);
            });

            expect(store.getState().checked.has("2")).toBe(true);

            // Move unchecked "1.2" inside "2"
            simulateDragDrop("1.2", "2", "inside");

            // 2 has [1.2✗, 2.1✓, 2.2✓] → indeterminate
            const { checked, indeterminate } = store.getState();
            expect(checked.has("2")).toBe(false);
            expect(indeterminate.has("2")).toBe(true);
        });
    });

    // =====================
    // COMPLEX MULTI-LEVEL SCENARIOS
    // =====================
    describe("complex multi-level recalculation", () => {
        it("recalculates entire ancestor chain when deeply nested node is moved", () => {
            // Check 1.1.1 → 1.1 indeterminate, 1 indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1"], true);
            });

            expect(store.getState().indeterminate.has("1.1")).toBe(true);
            expect(store.getState().indeterminate.has("1")).toBe(true);

            // Also check 1.1.2 → 1.1 becomes checked, 1 still indeterminate
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.2"], true);
            });

            expect(store.getState().checked.has("1.1")).toBe(true);
            expect(store.getState().indeterminate.has("1")).toBe(true);

            // Move 1.1.1 (checked) inside node 2
            simulateDragDrop("1.1.1", "2", "inside");

            const { checked, indeterminate } = store.getState();

            // 1.1 now has [1.1.2✓] → checked
            expect(checked.has("1.1")).toBe(true);

            // 1 has [1.1✓, 1.2✗] → indeterminate (unchanged)
            expect(indeterminate.has("1")).toBe(true);

            // 2 has [1.1.1✓, 2.1✗, 2.2✗] → indeterminate
            expect(indeterminate.has("2")).toBe(true);
        });

        it("handles chain of moves maintaining consistency", () => {
            // Check 1.1.1 and 2.1
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1", "2.1"], true);
            });

            // Move 1: 1.1.1 inside 2
            simulateDragDrop("1.1.1", "2", "inside");

            // 1.1 was indeterminate (had 1.1.1✓, 1.1.2✗), now has [1.1.2✗] → unchecked
            expect(store.getState().checked.has("1.1")).toBe(false);
            expect(store.getState().indeterminate.has("1.1")).toBe(false);

            // 1 has [1.1✗, 1.2✗] → unchecked
            expect(store.getState().checked.has("1")).toBe(false);
            expect(store.getState().indeterminate.has("1")).toBe(false);

            // 2 has [1.1.1✓, 2.1✓, 2.2✗] → indeterminate
            expect(store.getState().indeterminate.has("2")).toBe(true);

            // Move 2: 2.2 (unchecked) above 3
            simulateDragDrop("2.2", "3", "above");

            // 2 now has [1.1.1✓, 2.1✓] → all checked → 2 becomes checked
            const { checked, indeterminate } = store.getState();
            expect(checked.has("2")).toBe(true);
            expect(indeterminate.has("2")).toBe(false);
        });

        it("handles moving a checked node into a fully unchecked subtree", () => {
            // Check node 3
            act(() => {
                toggleCheckboxes(STORE_ID, ["3"], true);
            });

            // Move checked 3 inside unchecked 1.1
            simulateDragDrop("3", "1.1", "inside");

            const { checked, indeterminate } = store.getState();

            // 1.1 has [3✓, 1.1.1✗, 1.1.2✗] → indeterminate
            expect(indeterminate.has("1.1")).toBe(true);
            expect(checked.has("1.1")).toBe(false);

            // 1 has [1.1(indeterminate), 1.2✗] → indeterminate
            expect(indeterminate.has("1")).toBe(true);
            expect(checked.has("1")).toBe(false);
        });

        it("handles moving all checked children out of parent → parent becomes unchecked", () => {
            // Check all of 2's children → 2 is checked
            act(() => {
                toggleCheckboxes(STORE_ID, ["2.1", "2.2"], true);
            });

            expect(store.getState().checked.has("2")).toBe(true);

            // Move 2.1 out
            simulateDragDrop("2.1", "3", "below");

            // 2 has [2.2✓] → still checked
            expect(store.getState().checked.has("2")).toBe(true);

            // Move 2.2 out
            simulateDragDrop("2.2", "3", "below");

            // 2 has no children → children is undefined → it's a leaf
            const { checked, indeterminate, nodeMap } = store.getState();
            expect(nodeMap.get("2")?.children).toBeUndefined();
            expect(checked.has("2")).toBe(true); // Keeps its checked state as a leaf
            expect(indeterminate.has("2")).toBe(false); // Must NOT be indeterminate as a leaf
        });
    });

    // =====================
    // EDGE CASES
    // =====================
    describe("edge cases", () => {
        it("does not crash on empty tree", () => {
            store.getState().cleanUpTreeViewStore();
            act(() => {
                store.getState().updateInitialTreeViewData([]);
                initializeNodeMaps(STORE_ID, []);
            });

            // Should not throw
            act(() => {
                recalculateCheckedStates<string>(STORE_ID);
            });

            const { checked, indeterminate } = store.getState();
            expect(checked.size).toBe(0);
            expect(indeterminate.size).toBe(0);
        });

        it("handles tree with single node correctly", () => {
            store.getState().cleanUpTreeViewStore();
            const singleTree: TreeNode<string>[] = [{ id: "only", name: "only" }];
            act(() => {
                store.getState().updateInitialTreeViewData(singleTree);
                initializeNodeMaps(STORE_ID, singleTree);
                toggleCheckboxes(STORE_ID, ["only"], true);
            });

            act(() => {
                recalculateCheckedStates<string>(STORE_ID);
            });

            // Single checked leaf should remain checked
            expect(store.getState().checked.has("only")).toBe(true);
            expect(store.getState().indeterminate.has("only")).toBe(false);
        });

        it("does not affect leaf node checked states", () => {
            // Check some leaf nodes
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1", "2.2", "3"], true);
            });

            // Recalculate without moving anything
            act(() => {
                recalculateCheckedStates<string>(STORE_ID);
            });

            // Leaf checked states are unchanged
            const { checked } = store.getState();
            expect(checked.has("1.1.1")).toBe(true);
            expect(checked.has("2.2")).toBe(true);
            expect(checked.has("3")).toBe(true);

            // Unchecked leaves remain unchecked
            expect(checked.has("1.1.2")).toBe(false);
            expect(checked.has("1.2")).toBe(false);
            expect(checked.has("2.1")).toBe(false);
        });

        it("is idempotent — calling twice produces same result", () => {
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1", "2.1"], true);
            });

            simulateDragDrop("1.1.1", "2", "inside");

            const { checked: checked1, indeterminate: indeterminate1 } = store.getState();
            const checked1Arr = Array.from(checked1).sort();
            const indeterminate1Arr = Array.from(indeterminate1).sort();

            // Call recalculate again
            act(() => {
                recalculateCheckedStates<string>(STORE_ID);
            });

            const { checked: checked2, indeterminate: indeterminate2 } = store.getState();
            expect(Array.from(checked2).sort()).toEqual(checked1Arr);
            expect(Array.from(indeterminate2).sort()).toEqual(indeterminate1Arr);
        });

        it("handles moving node to same parent (reorder) without state change", () => {
            // Check 1.1.1
            act(() => {
                toggleCheckboxes(STORE_ID, ["1.1.1"], true);
            });

            const { checked: before, indeterminate: indBefore } = store.getState();
            const beforeChecked = Array.from(before).sort();
            const beforeIndet = Array.from(indBefore).sort();

            // Move 1.1.1 below 1.1.2 (reorder within same parent)
            simulateDragDrop("1.1.1", "1.1.2", "below");

            const { checked: after, indeterminate: indAfter } = store.getState();
            expect(Array.from(after).sort()).toEqual(beforeChecked);
            expect(Array.from(indAfter).sort()).toEqual(beforeIndet);
        });
    });

    // =====================
    // NUMERIC IDs
    // =====================
    describe("numeric IDs", () => {
        it("works with number-type IDs", () => {
            const numStore = getTreeViewStore<number>("recalc-num-store");
            numStore.getState().cleanUpTreeViewStore();

            const numTree: TreeNode<number>[] = [
                {
                    id: 1, name: "One", children: [
                        { id: 11, name: "OneOne" },
                        { id: 12, name: "OneTwo" },
                    ]
                },
                { id: 2, name: "Two" },
            ];

            act(() => {
                numStore.getState().updateInitialTreeViewData(numTree);
                initializeNodeMaps("recalc-num-store", numTree);
                toggleCheckboxes("recalc-num-store", [11, 12], true);
            });

            // 1 should be fully checked
            expect(numStore.getState().checked.has(1)).toBe(true);

            // Move unchecked 2 inside 1
            const newData = moveTreeNode(numTree, 2, 1, "inside");
            act(() => {
                numStore.getState().updateInitialTreeViewData(newData);
                initializeNodeMaps("recalc-num-store", newData);
                recalculateCheckedStates<number>("recalc-num-store");
            });

            // 1 has [2✗, 11✓, 12✓] → indeterminate
            expect(numStore.getState().checked.has(1)).toBe(false);
            expect(numStore.getState().indeterminate.has(1)).toBe(true);
        });
    });
});
