import type { TreeNode } from "./treeView.types";

export type DropPosition = "above" | "below" | "inside";

export interface DragEndEvent<ID = string> {
    /** The id of the node that was dragged */
    draggedNodeId: ID;
    /** The id of the target node where the dragged node was dropped */
    targetNodeId: ID;
    /** Where relative to the target: above/below = sibling, inside = child */
    position: DropPosition;
    /** The reordered tree data after the move */
    newTreeData: TreeNode<ID>[];
}

export interface DropTarget<ID = string> {
    targetNodeId: ID;
    targetIndex: number;
    position: DropPosition;
    isValid: boolean;
    targetLevel: number;
    indicatorTop: number;
}
