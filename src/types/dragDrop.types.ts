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

/**
 * Lightweight description of a completed move. Returned by the imperative
 * `moveNode` ref method and delivered to the `onDragEnd` callback. It carries
 * only the delta (ids, position, and the moved node's previous/new parent and
 * index) so a consumer can update external state or persist the change without
 * handling a full tree copy. To get the full reordered tree, use the
 * `getTreeData` ref method or reconstruct it with the exported `moveTreeNode`.
 */
export interface MoveResult<ID = string> {
    /** The id of the node that was moved */
    draggedNodeId: ID;
    /** The id of the target node the move was relative to */
    targetNodeId: ID;
    /** Where relative to the target: above/below = sibling, inside = child */
    position: DropPosition;
    /** Parent id before the move (null if it was a root-level node) */
    previousParentId: ID | null;
    /** Parent id after the move (null if it is now a root-level node) */
    newParentId: ID | null;
    /** Index within the previous parent's children (or the root array) */
    previousIndex: number;
    /** Index within the new parent's children (or the root array) */
    newIndex: number;
}

/** Event payload passed to the onDragEnd callback after a successful drop. */
export type DragEndEvent<ID = string> = MoveResult<ID>;

/** Internal representation of the current drop target during a drag operation.
 *  Held in a ref and read at commit time; the per-node visual indicator is driven
 *  separately by the store (dropTargetNodeId / dropPosition / dropLevel). */
export interface DropTarget<ID = string> {
    /** The id of the node being hovered over */
    targetNodeId: ID;
    /** Index of the target node in the flattened list */
    targetIndex: number;
    /** Where the drop would occur relative to the target */
    position: DropPosition;
    /** Whether this is a valid drop location (e.g. not dropping a node onto itself or its descendants) */
    isValid: boolean;
}
