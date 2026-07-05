import type { TreeNode } from "../types/treeView.types";
import type { DropPosition } from "../types/dragDrop.types";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps } from "./treeNode.helper";
import { recalculateCheckedStates } from "./toggleCheckbox.helper";
import { expandNodes } from "./expandCollapse.helper";

/**
 * Move a node within a tree structure. Returns a new tree (no mutation).
 *
 * @param data - The current tree data
 * @param draggedNodeId - The ID of the node to move
 * @param targetNodeId - The ID of the target node
 * @param position - Where to place relative to target: "above", "below", or "inside"
 * @returns New tree data with the node moved, or the original data if the move is invalid
 */
export function moveTreeNode<ID>(
    data: TreeNode<ID>[],
    draggedNodeId: ID,
    targetNodeId: ID,
    position: DropPosition
): TreeNode<ID>[] {
    if (draggedNodeId === targetNodeId) return data;

    // Prevent moving a node into its own descendant (would create a cycle)
    if (isDescendant(data, draggedNodeId, targetNodeId)) return data;

    // Step 1: Deep clone the tree
    const cloned = deepCloneTree(data);

    // Step 2: Remove the dragged node
    const removedNode = removeNodeById(cloned, draggedNodeId);
    if (!removedNode) return data;

    // Step 3: Insert at the new position
    const inserted = insertNode(cloned, removedNode, targetNodeId, position);
    if (!inserted) return data;

    return cloned;
}

/**
 * Commit the result of a `moveTreeNode` to the store: swap in the new tree,
 * rebuild the node maps, recalculate parent checked/indeterminate states, and
 * expand whatever is needed to make the moved node visible ("inside" drops
 * expand the target; ancestors of the moved node are always expanded).
 *
 * Shared by the interactive drag commit (useDragDrop.handleDragEnd) and the
 * programmatic `TreeViewRef.moveNode` so the two paths cannot drift.
 */
export function applyMoveToStore<ID>(
    storeId: string,
    newData: TreeNode<ID>[],
    movedNodeId: ID,
    targetNodeId: ID,
    position: DropPosition
): void {
    const store = getTreeViewStore<ID>(storeId);
    store.getState().updateInitialTreeViewData(newData);
    initializeNodeMaps(storeId, newData);
    recalculateCheckedStates<ID>(storeId);
    if (position === "inside") {
        expandNodes(storeId, [targetNodeId]);
    }
    expandNodes(storeId, [movedNodeId], true);
}

/**
 * Locate a node within a tree, returning its parent id (null at root) and its
 * index within that parent's children (or the root array). Returns null if the
 * node is not found. Iterative (stack-based) DFS.
 *
 * Used to build the lightweight `MoveResult` delta (previous/new parent + index)
 * without exposing a full tree copy.
 */
export function findNodePosition<ID>(
    data: TreeNode<ID>[],
    nodeId: ID
): { parentId: ID | null; index: number; } | null {
    const stack: Array<{ nodes: TreeNode<ID>[]; parentId: ID | null; }> = [
        { nodes: data, parentId: null }
    ];
    while (stack.length > 0) {
        const { nodes, parentId } = stack.pop()!;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]!;
            if (node.id === nodeId) return { parentId, index: i };
            if (node.children?.length) {
                stack.push({ nodes: node.children, parentId: node.id });
            }
        }
    }
    return null;
}

/**
 * `findNodePosition` for a node that is still in the store's CURRENT tree:
 * uses the already-built childToParentMap/nodeMap for O(depth + siblings)
 * instead of a full-tree DFS. Only valid while the maps match `data` (i.e.
 * before the move mutates the tree).
 */
export function findNodePositionFromMaps<ID>(
    data: TreeNode<ID>[],
    nodeMap: Map<ID, TreeNode<ID>>,
    childToParentMap: Map<ID, ID>,
    nodeId: ID
): { parentId: ID | null; index: number; } | null {
    const parentId = childToParentMap.get(nodeId);
    const siblings = parentId !== undefined
        ? nodeMap.get(parentId)?.children
        : data;
    if (!siblings) return null;
    const index = siblings.findIndex((n) => n.id === nodeId);
    return index === -1 ? null : { parentId: parentId ?? null, index };
}

/**
 * Check if `candidateDescendantId` is a descendant of `ancestorId` in the tree.
 * Iterative (stack-based) DFS to avoid call-stack limits on deep trees.
 */
function isDescendant<ID>(
    nodes: TreeNode<ID>[],
    ancestorId: ID,
    candidateDescendantId: ID,
): boolean {
    const stack: TreeNode<ID>[] = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.id === ancestorId) {
            // Found the ancestor - search its subtree for the candidate.
            // IDs are unique, so the first match is the only ancestor to check.
            return containsNode(node.children ?? [], candidateDescendantId);
        }
        if (node.children) {
            for (const child of node.children) stack.push(child);
        }
    }
    return false;
}

/**
 * Check if a node with the given ID exists anywhere in the subtree.
 * Iterative (stack-based) DFS to avoid call-stack limits on deep trees.
 */
function containsNode<ID>(nodes: TreeNode<ID>[], nodeId: ID): boolean {
    const stack: TreeNode<ID>[] = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.id === nodeId) return true;
        if (node.children) {
            for (const child of node.children) stack.push(child);
        }
    }
    return false;
}

/**
 * Deep clone a tree structure so mutations don't affect the original.
 * Iterative (stack-based) clone to avoid call-stack limits on deep trees.
 * Preserves the original shape: every node carries a `children` key
 * (`undefined` for leaves, a cloned array - possibly empty - otherwise).
 */
function deepCloneTree<ID>(nodes: TreeNode<ID>[]): TreeNode<ID>[] {
    const root: TreeNode<ID>[] = nodes.map(node => ({ ...node, children: undefined }));
    const stack: Array<{ src: TreeNode<ID>[]; dst: TreeNode<ID>[]; }> = [
        { src: nodes, dst: root }
    ];
    while (stack.length > 0) {
        const { src, dst } = stack.pop()!;
        for (let i = 0; i < src.length; i++) {
            const children = src[i]!.children;
            if (children) {
                const clonedChildren: TreeNode<ID>[] =
                    children.map(child => ({ ...child, children: undefined }));
                dst[i]!.children = clonedChildren;
                stack.push({ src: children, dst: clonedChildren });
            }
        }
    }
    return root;
}

/**
 * Remove a node by ID from the tree. Mutates the cloned tree in-place.
 * Returns the removed node, or null if not found.
 * Iterative (stack-based) DFS to avoid call-stack limits on deep trees.
 */
function removeNodeById<ID>(
    nodes: TreeNode<ID>[],
    nodeId: ID,
): TreeNode<ID> | null {
    // Each frame carries the array being scanned plus the node that owns it
    // (null at the root) so an emptied children array can be detached.
    const stack: Array<{ nodes: TreeNode<ID>[]; parent: TreeNode<ID> | null; }> = [
        { nodes, parent: null }
    ];
    while (stack.length > 0) {
        const { nodes: level, parent } = stack.pop()!;
        for (let i = 0; i < level.length; i++) {
            const node = level[i]!;
            if (node.id === nodeId) {
                const [removed] = level.splice(i, 1);
                // Clean up an emptied children array on the owning parent
                // (matches the original shape: leaves carry children: undefined).
                if (parent && level.length === 0) {
                    parent.children = undefined;
                }
                /* istanbul ignore next -- splice at a found index always yields
                   the element; noUncheckedIndexedAccess guard */
                return removed ?? null;
            }
            if (node.children?.length) {
                stack.push({ nodes: node.children, parent: node });
            }
        }
    }
    return null;
}

/**
 * Insert a node relative to a target node. Mutates the cloned tree in-place.
 * Returns true if insertion was successful.
 * Iterative (stack-based) DFS to avoid call-stack limits on deep trees.
 */
function insertNode<ID>(
    nodes: TreeNode<ID>[],
    nodeToInsert: TreeNode<ID>,
    targetId: ID,
    position: DropPosition,
): boolean {
    const stack: TreeNode<ID>[][] = [nodes];
    while (stack.length > 0) {
        const level = stack.pop()!;
        for (let i = 0; i < level.length; i++) {
            const node = level[i]!;
            if (node.id === targetId) {
                if (position === "above") {
                    level.splice(i, 0, nodeToInsert);
                } else if (position === "below") {
                    level.splice(i + 1, 0, nodeToInsert);
                } else {
                    // "inside" - add as first child
                    if (node.children) {
                        node.children.unshift(nodeToInsert);
                    } else {
                        node.children = [nodeToInsert];
                    }
                }
                return true;
            }
            if (node.children?.length) {
                stack.push(node.children);
            }
        }
    }
    return false;
}
