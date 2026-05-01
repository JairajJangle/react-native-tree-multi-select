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

describe("given the drag-and-drop store", () => {
    const store = getTreeViewStore<string>(STORE_ID);

    beforeEach(() => {
        store.getState().cleanUpTreeViewStore();
    });

    it("when setting and clearing drag state, then draggedNodeId, invalidDragTargetIds, and cleanup all update correctly", () => {
        // All fields start at defaults
        expect(store.getState().draggedNodeId).toBeNull();
        expect(store.getState().invalidDragTargetIds.size).toBe(0);

        // Set draggedNodeId
        act(() => {
            store.getState().updateDraggedNodeId("1.1");
        });
        expect(store.getState().draggedNodeId).toBe("1.1");

        // Reset draggedNodeId back to null
        act(() => {
            store.getState().updateDraggedNodeId(null);
        });
        expect(store.getState().draggedNodeId).toBeNull();

        // Set invalidDragTargetIds
        const ids = new Set(["1", "1.1", "1.1.1", "1.1.2", "1.2"]);
        act(() => {
            store.getState().updateInvalidDragTargetIds(ids);
        });
        expect(store.getState().invalidDragTargetIds).toEqual(ids);

        // Reset invalidDragTargetIds
        act(() => {
            store.getState().updateInvalidDragTargetIds(new Set());
        });
        expect(store.getState().invalidDragTargetIds.size).toBe(0);

        // Set all drag state then cleanUpTreeViewStore
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

    it("when updating drop target position, then target and position update correctly through all transitions", () => {
        // Starts null
        expect(store.getState().dropTargetNodeId).toBeNull();
        expect(store.getState().dropPosition).toBeNull();

        // Set target with "above" position
        act(() => {
            store.getState().updateDropTarget("2.1", "above");
        });
        expect(store.getState().dropTargetNodeId).toBe("2.1");
        expect(store.getState().dropPosition).toBe("above");

        // Update to "inside" position on a different node
        act(() => {
            store.getState().updateDropTarget("1", "inside");
        });
        expect(store.getState().dropTargetNodeId).toBe("1");
        expect(store.getState().dropPosition).toBe("inside");

        // Update same node to "below" position
        act(() => {
            store.getState().updateDropTarget("1", "below");
        });
        expect(store.getState().dropTargetNodeId).toBe("1");
        expect(store.getState().dropPosition).toBe("below");

        // Change to a completely different node
        act(() => {
            store.getState().updateDropTarget("2", "below");
        });
        expect(store.getState().dropTargetNodeId).toBe("2");
        expect(store.getState().dropPosition).toBe("below");

        // Clear drop target
        act(() => {
            store.getState().updateDropTarget(null, null);
        });
        expect(store.getState().dropTargetNodeId).toBeNull();
        expect(store.getState().dropPosition).toBeNull();
    });
});

describe("given a tree with checked and expanded nodes", () => {
    const store = getTreeViewStore<string>(STORE_ID);

    beforeEach(() => {
        store.getState().cleanUpTreeViewStore();
        const tree = makeTree();
        act(() => {
            store.getState().updateInitialTreeViewData(tree);
            initializeNodeMaps(STORE_ID, tree);
        });
    });

    it("when performing a drag-drop move, then both checked and expanded states are preserved", () => {
        // Check nodes 1.1.1 and 2.1
        act(() => {
            toggleCheckboxes(STORE_ID, ["1.1.1", "2.1"], true);
        });

        const { checked: checkedBefore } = store.getState();
        expect(checkedBefore.has("1.1.1")).toBe(true);
        expect(checkedBefore.has("2.1")).toBe(true);

        // Move "3" above "1"
        const currentData1 = store.getState().initialTreeViewData;
        const newData1 = moveTreeNode(currentData1, "3", "1", "above");

        act(() => {
            store.getState().updateInitialTreeViewData(newData1);
            initializeNodeMaps(STORE_ID, newData1);
        });

        // Checked state is still intact after move
        const { checked: checkedAfter } = store.getState();
        expect(checkedAfter.has("1.1.1")).toBe(true);
        expect(checkedAfter.has("2.1")).toBe(true);

        // Expand nodes 1 and 2
        act(() => {
            store.getState().updateExpanded(new Set(["1", "2"]));
        });

        const { expanded: expandedBefore } = store.getState();
        expect(expandedBefore.has("1")).toBe(true);
        expect(expandedBefore.has("2")).toBe(true);

        // Move "1.2" inside "2"
        const currentData2 = store.getState().initialTreeViewData;
        const newData2 = moveTreeNode(currentData2, "1.2", "2", "inside");

        act(() => {
            store.getState().updateInitialTreeViewData(newData2);
            initializeNodeMaps(STORE_ID, newData2);
        });

        // Expanded state is still intact after move
        const { expanded: expandedAfter } = store.getState();
        expect(expandedAfter.has("1")).toBe(true);
        expect(expandedAfter.has("2")).toBe(true);
    });

    it("when moving a node inside another, then node maps reflect new structure", () => {
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

    it("when computing drag targets for a parent node, then self and all descendants are invalid", () => {
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

    it("when performing a full drag lifecycle with recalculation, then checked parent becomes indeterminate and drag state clears", () => {
        // Check all of 2's children so 2 becomes checked
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

        // 2 now has [3 unchecked, 2.1 checked, 2.2 checked] -> indeterminate
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

        // Also exercise a simple set-move-clear lifecycle
        // 1. Start drag on node "3" (in its new location)
        act(() => {
            store.getState().updateDraggedNodeId("3");
            store.getState().updateInvalidDragTargetIds(new Set(["3"]));
        });
        expect(store.getState().draggedNodeId).toBe("3");

        // 2. Move "3" above "1" (using the already-moved tree)
        const currentData2 = store.getState().initialTreeViewData;
        const newData2 = moveTreeNode(currentData2, "3", "1", "above");
        act(() => {
            store.getState().updateInitialTreeViewData(newData2);
            initializeNodeMaps(STORE_ID, newData2);
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
