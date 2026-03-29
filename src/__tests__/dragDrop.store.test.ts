jest.mock("zustand");

import { act } from "react-test-renderer";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps, toggleCheckboxes, recalculateCheckedStates } from "../helpers";
import { moveTreeNode } from "../helpers/moveTreeNode.helper";
import type { TreeNode } from "../types/treeView.types";

const STORE_ID = "drag-drop-test-store";

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

describe("Drag-and-drop store state", () => {
    const store = getTreeViewStore<string>(STORE_ID);

    beforeEach(() => {
        store.getState().cleanUpTreeViewStore();
    });

    // =====================
    // draggedNodeId
    // =====================
    describe("draggedNodeId", () => {
        it("starts as null", () => {
            expect(store.getState().draggedNodeId).toBeNull();
        });

        it("updates to a node ID", () => {
            act(() => {
                store.getState().updateDraggedNodeId("1.1");
            });
            expect(store.getState().draggedNodeId).toBe("1.1");
        });

        it("resets back to null", () => {
            act(() => {
                store.getState().updateDraggedNodeId("1.1");
            });
            act(() => {
                store.getState().updateDraggedNodeId(null);
            });
            expect(store.getState().draggedNodeId).toBeNull();
        });
    });

    // =====================
    // invalidDragTargetIds
    // =====================
    describe("invalidDragTargetIds", () => {
        it("starts as empty set", () => {
            expect(store.getState().invalidDragTargetIds.size).toBe(0);
        });

        it("updates with a set of IDs", () => {
            const ids = new Set(["1", "1.1", "1.1.1", "1.1.2", "1.2"]);
            act(() => {
                store.getState().updateInvalidDragTargetIds(ids);
            });
            expect(store.getState().invalidDragTargetIds).toEqual(ids);
        });

        it("resets back to empty set", () => {
            act(() => {
                store.getState().updateInvalidDragTargetIds(new Set(["1"]));
            });
            act(() => {
                store.getState().updateInvalidDragTargetIds(new Set());
            });
            expect(store.getState().invalidDragTargetIds.size).toBe(0);
        });
    });

    // =====================
    // dropTarget state
    // =====================
    describe("dropTarget state", () => {
        it("starts with null dropTargetNodeId and dropPosition", () => {
            expect(store.getState().dropTargetNodeId).toBeNull();
            expect(store.getState().dropPosition).toBeNull();
        });

        it("updates drop target with node ID and position", () => {
            act(() => {
                store.getState().updateDropTarget("2.1", "above");
            });
            expect(store.getState().dropTargetNodeId).toBe("2.1");
            expect(store.getState().dropPosition).toBe("above");
        });

        it("updates drop target to different positions", () => {
            act(() => {
                store.getState().updateDropTarget("1", "inside");
            });
            expect(store.getState().dropTargetNodeId).toBe("1");
            expect(store.getState().dropPosition).toBe("inside");

            act(() => {
                store.getState().updateDropTarget("1", "below");
            });
            expect(store.getState().dropTargetNodeId).toBe("1");
            expect(store.getState().dropPosition).toBe("below");
        });

        it("clears drop target when set to null", () => {
            act(() => {
                store.getState().updateDropTarget("1.1", "above");
            });
            expect(store.getState().dropTargetNodeId).toBe("1.1");

            act(() => {
                store.getState().updateDropTarget(null, null);
            });
            expect(store.getState().dropTargetNodeId).toBeNull();
            expect(store.getState().dropPosition).toBeNull();
        });

        it("changes drop target to a different node", () => {
            act(() => {
                store.getState().updateDropTarget("1", "above");
            });
            act(() => {
                store.getState().updateDropTarget("2", "below");
            });
            expect(store.getState().dropTargetNodeId).toBe("2");
            expect(store.getState().dropPosition).toBe("below");
        });
    });

    // =====================
    // cleanUpTreeViewStore includes drag state
    // =====================
    describe("cleanUpTreeViewStore", () => {
        it("resets all drag state on cleanup", () => {
            act(() => {
                store.getState().updateDraggedNodeId("1");
                store.getState().updateInvalidDragTargetIds(new Set(["1", "1.1"]));
                store.getState().updateDropTarget("2", "inside");
            });

            expect(store.getState().draggedNodeId).toBe("1");
            expect(store.getState().invalidDragTargetIds.size).toBe(2);
            expect(store.getState().dropTargetNodeId).toBe("2");
            expect(store.getState().dropPosition).toBe("inside");

            act(() => {
                store.getState().cleanUpTreeViewStore();
            });

            expect(store.getState().draggedNodeId).toBeNull();
            expect(store.getState().invalidDragTargetIds.size).toBe(0);
            expect(store.getState().dropTargetNodeId).toBeNull();
            expect(store.getState().dropPosition).toBeNull();
        });
    });
});

describe("Drag-drop integration with checked/expanded state", () => {
    const store = getTreeViewStore<string>(STORE_ID);

    beforeEach(() => {
        store.getState().cleanUpTreeViewStore();
        const tree = makeTree();
        act(() => {
            store.getState().updateInitialTreeViewData(tree);
            initializeNodeMaps(STORE_ID, tree);
        });
    });

    it("preserves checked state after moveTreeNode + store update", () => {
        // Check nodes 1.1.1 and 2.1
        act(() => {
            toggleCheckboxes(STORE_ID, ["1.1.1", "2.1"], true);
        });

        const { checked: checkedBefore } = store.getState();
        expect(checkedBefore.has("1.1.1")).toBe(true);
        expect(checkedBefore.has("2.1")).toBe(true);

        // Simulate a drag: move "3" above "1"
        const currentData = store.getState().initialTreeViewData;
        const newData = moveTreeNode(currentData, "3", "1", "above");

        act(() => {
            store.getState().updateInitialTreeViewData(newData);
            initializeNodeMaps(STORE_ID, newData);
        });

        // Checked state should still be intact
        const { checked: checkedAfter } = store.getState();
        expect(checkedAfter.has("1.1.1")).toBe(true);
        expect(checkedAfter.has("2.1")).toBe(true);
    });

    it("preserves expanded state after moveTreeNode + store update", () => {
        // Expand nodes 1 and 2
        act(() => {
            store.getState().updateExpanded(new Set(["1", "2"]));
        });

        const { expanded: expandedBefore } = store.getState();
        expect(expandedBefore.has("1")).toBe(true);
        expect(expandedBefore.has("2")).toBe(true);

        // Simulate a drag: move "1.2" inside "2"
        const currentData = store.getState().initialTreeViewData;
        const newData = moveTreeNode(currentData, "1.2", "2", "inside");

        act(() => {
            store.getState().updateInitialTreeViewData(newData);
            initializeNodeMaps(STORE_ID, newData);
        });

        // Expanded state should still be intact
        const { expanded: expandedAfter } = store.getState();
        expect(expandedAfter.has("1")).toBe(true);
        expect(expandedAfter.has("2")).toBe(true);
    });

    it("updated tree structure is correct after store update", () => {
        const currentData = store.getState().initialTreeViewData;
        const newData = moveTreeNode(currentData, "2.1", "1.1", "inside");

        act(() => {
            store.getState().updateInitialTreeViewData(newData);
            initializeNodeMaps(STORE_ID, newData);
        });

        const { nodeMap, childToParentMap } = store.getState();

        // 2.1 should now be a child of 1.1
        expect(childToParentMap.get("2.1")).toBe("1.1");

        // 1.1 should have 3 children: 2.1 (prepended), 1.1.1, 1.1.2
        const node1_1 = nodeMap.get("1.1");
        expect(node1_1?.children?.length).toBe(3);
        expect(node1_1?.children?.[0]?.id).toBe("2.1");
    });

    it("invalid drag targets include self and all descendants", () => {
        // Simulate dragging node "1" - descendants are 1.1, 1.1.1, 1.1.2, 1.2
        const { nodeMap } = store.getState();

        // Build descendant set like useDragDrop does
        const descendants = new Set<string>();
        const stack: string[] = ["1"];
        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const node = nodeMap.get(currentId);
            if (node?.children) {
                for (const child of node.children) {
                    descendants.add(child.id);
                    stack.push(child.id);
                }
            }
        }
        descendants.add("1"); // Add self

        expect(descendants).toEqual(new Set(["1", "1.1", "1.1.1", "1.1.2", "1.2"]));

        // Setting these as invalid targets
        act(() => {
            store.getState().updateInvalidDragTargetIds(descendants);
        });

        const { invalidDragTargetIds } = store.getState();
        expect(invalidDragTargetIds.has("1")).toBe(true);
        expect(invalidDragTargetIds.has("1.1")).toBe(true);
        expect(invalidDragTargetIds.has("1.1.1")).toBe(true);
        expect(invalidDragTargetIds.has("1.1.2")).toBe(true);
        expect(invalidDragTargetIds.has("1.2")).toBe(true);

        // Valid targets
        expect(invalidDragTargetIds.has("2")).toBe(false);
        expect(invalidDragTargetIds.has("2.1")).toBe(false);
        expect(invalidDragTargetIds.has("3")).toBe(false);
    });

    it("full drag lifecycle with recalculation: checked parent becomes indeterminate after unchecked node moved in", () => {
        // Check all of 2's children → 2 becomes checked
        act(() => {
            toggleCheckboxes(STORE_ID, ["2.1", "2.2"], true);
        });

        expect(store.getState().checked.has("2")).toBe(true);

        // 1. Start drag on node "3" (unchecked leaf)
        act(() => {
            store.getState().updateDraggedNodeId("3");
            store.getState().updateInvalidDragTargetIds(new Set(["3"]));
            store.getState().updateDropTarget("2", "inside");
        });

        // 2. Move "3" inside "2" and recalculate
        const currentData = store.getState().initialTreeViewData;
        const newData = moveTreeNode(currentData, "3", "2", "inside");
        act(() => {
            store.getState().updateInitialTreeViewData(newData);
            initializeNodeMaps(STORE_ID, newData);
            recalculateCheckedStates<string>(STORE_ID);
        });

        // 2 now has [3✗, 2.1✓, 2.2✓] → indeterminate
        const { checked, indeterminate } = store.getState();
        expect(checked.has("2")).toBe(false);
        expect(indeterminate.has("2")).toBe(true);
        expect(checked.has("2.1")).toBe(true);
        expect(checked.has("2.2")).toBe(true);
        expect(checked.has("3")).toBe(false);

        // 3. Clear drag state
        act(() => {
            store.getState().updateDraggedNodeId(null);
            store.getState().updateInvalidDragTargetIds(new Set());
            store.getState().updateDropTarget(null, null);
        });

        expect(store.getState().draggedNodeId).toBeNull();
        expect(store.getState().invalidDragTargetIds.size).toBe(0);
        expect(store.getState().dropTargetNodeId).toBeNull();
    });

    it("full drag lifecycle: set drag state → move → clear drag state", () => {
        // 1. Start drag on node "3"
        act(() => {
            store.getState().updateDraggedNodeId("3");
            store.getState().updateInvalidDragTargetIds(new Set(["3"]));
        });
        expect(store.getState().draggedNodeId).toBe("3");

        // 2. Perform the move: "3" above "1"
        const currentData = store.getState().initialTreeViewData;
        const newData = moveTreeNode(currentData, "3", "1", "above");
        act(() => {
            store.getState().updateInitialTreeViewData(newData);
            initializeNodeMaps(STORE_ID, newData);
        });

        // Verify the move
        const { initialTreeViewData } = store.getState();
        expect(initialTreeViewData[0]!.id).toBe("3");
        expect(initialTreeViewData[1]!.id).toBe("1");
        expect(initialTreeViewData[2]!.id).toBe("2");

        // 3. Clear drag state
        act(() => {
            store.getState().updateDraggedNodeId(null);
            store.getState().updateInvalidDragTargetIds(new Set());
        });
        expect(store.getState().draggedNodeId).toBeNull();
        expect(store.getState().invalidDragTargetIds.size).toBe(0);
    });
});
