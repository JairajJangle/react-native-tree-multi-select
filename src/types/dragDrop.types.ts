import type { TreeNode } from "./treeView.types";

/** Where a node is dropped relative to the target: as a sibling above/below, or as a child inside */
export type DropPosition = "above" | "below" | "inside";

/** Event payload passed to the onDragStart callback when a drag begins */
export interface DragStartEvent<ID = string> {
    /** The id of the node being dragged */
    draggedNodeId: ID;
}

/** Event payload passed to the onDragCancel callback when a drag is cancelled without a drop */
export interface DragCancelEvent<ID = string> {
    /** The id of the node that was being dragged */
    draggedNodeId: ID;
}

/** Event payload passed to the onDragEnd callback after a successful drop */
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

/** Internal representation of the current drop target during a drag operation */
export interface DropTarget<ID = string> {
    /** The id of the node being hovered over */
    targetNodeId: ID;
    /** Index of the target node in the flattened list */
    targetIndex: number;
    /** Where the drop would occur relative to the target */
    position: DropPosition;
    /** Whether this is a valid drop location (e.g. not dropping a node onto itself or its descendants) */
    isValid: boolean;
    /** Nesting level of the target node */
    targetLevel: number;
    /** Y-coordinate for positioning the drop indicator */
    indicatorTop: number;
}
