import type { TreeNode } from "../types/treeView.types";
import type { DropPosition } from "../types/dragDrop.types";

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
 * Check if `candidateDescendantId` is a descendant of `ancestorId` in the tree.
 */
function isDescendant<ID>(
    nodes: TreeNode<ID>[],
    ancestorId: ID,
    candidateDescendantId: ID,
): boolean {
    for (const node of nodes) {
        if (node.id === ancestorId) {
            // Found the ancestor - search its subtree for the candidate
            return containsNode(node.children ?? [], candidateDescendantId);
        }
        if (node.children && isDescendant(node.children, ancestorId, candidateDescendantId)) {
            return true;
        }
    }
    return false;
}

/** Check if a node with the given ID exists anywhere in the subtree. */
function containsNode<ID>(nodes: TreeNode<ID>[], nodeId: ID): boolean {
    for (const node of nodes) {
        if (node.id === nodeId) return true;
        if (node.children && containsNode(node.children, nodeId)) return true;
    }
    return false;
}

/** Deep clone a tree structure so mutations don't affect the original. */
function deepCloneTree<ID>(nodes: TreeNode<ID>[]): TreeNode<ID>[] {
    return nodes.map(node => ({
        ...node,
        children: node.children ? deepCloneTree(node.children) : undefined,
    }));
}

/**
 * Remove a node by ID from the tree. Mutates the cloned tree in-place.
 * Returns the removed node, or null if not found.
 */
function removeNodeById<ID>(
    nodes: TreeNode<ID>[],
    nodeId: ID,
): TreeNode<ID> | null {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.id === nodeId) {
            const [removed] = nodes.splice(i, 1);
            return removed!;
        }
        const children = nodes[i]!.children;
        if (children) {
            const removed = removeNodeById(children, nodeId);
            if (removed) {
                // Clean up empty children arrays
                if (children.length === 0) {
                    nodes[i] = { ...nodes[i]!, children: undefined };
                }
                return removed;
            }
        }
    }
    return null;
}

/**
 * Insert a node relative to a target node. Mutates the cloned tree in-place.
 * Returns true if insertion was successful.
 */
function insertNode<ID>(
    nodes: TreeNode<ID>[],
    nodeToInsert: TreeNode<ID>,
    targetId: ID,
    position: DropPosition,
): boolean {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.id === targetId) {
            if (position === "above") {
                nodes.splice(i, 0, nodeToInsert);
            } else if (position === "below") {
                nodes.splice(i + 1, 0, nodeToInsert);
            } else {
                // "inside" - add as first child
                const target = nodes[i]!;
                if (target.children) {
                    target.children.unshift(nodeToInsert);
                } else {
                    nodes[i] = { ...target, children: [nodeToInsert] };
                }
            }
            return true;
        }
        const children = nodes[i]!.children;
        if (children) {
            if (insertNode(children, nodeToInsert, targetId, position)) {
                return true;
            }
        }
    }
    return false;
}
