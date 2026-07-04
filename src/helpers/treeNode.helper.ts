import type { TreeNode } from "../types/treeView.types";
import { getTreeViewStore } from "../store/treeView.store";

/**
 * Initialize the maps for tracking tree nodes and their parent-child relationships.
 *
 * This function is intended to be called once, during component initialization,
 * with the initial tree data and any preselected node IDs.
 *
 * @param storeId - Identifier for the specific tree view store.
 * @param initialData - An array of TreeNode objects that represent the initial tree structure.
 */
export function initializeNodeMaps<ID>(storeId: string, initialData: TreeNode<ID>[]) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { updateNodeMap, updateChildToParentMap } = treeViewStore.getState();

    const nodeMap = new Map<ID, TreeNode<ID>>();
    const childToParentMap = new Map<ID, ID>();

    // Use an iterative approach with a stack instead of recursion
    const stack: Array<{ nodes: TreeNode<ID>[], parentId: ID | null; }> = [
        { nodes: initialData, parentId: null }
    ];

    while (stack.length > 0) {
        const { nodes, parentId } = stack.pop()!;

        for (const node of nodes) {
            nodeMap.set(node.id, node);

            if (parentId !== null) {
                childToParentMap.set(node.id, parentId);
            }

            if (node.children && node.children.length > 0) {
                stack.push({ nodes: node.children, parentId: node.id });
            }
        }
    }

    // Batch update the store with both maps at once
    updateNodeMap(nodeMap);
    updateChildToParentMap(childToParentMap);
}

/**
 * Compute the maximum depth of a node's subtree (0 for a leaf node).
 * Uses an iterative stack-based DFS to avoid call-stack limits on deep trees.
 *
 * @param nodeMap - Map of node ID to node (from `initializeNodeMaps`).
 * @param nodeId - The root of the subtree to measure.
 */
export function getSubtreeDepthFromMap<ID>(
    nodeMap: Map<ID, TreeNode<ID>>,
    nodeId: ID
): number {
    const root = nodeMap.get(nodeId);
    if (!root?.children?.length) return 0;

    let maxDepth = 0;
    const stack: Array<{ node: TreeNode<ID>; depth: number; }> = [
        { node: root, depth: 0 }
    ];

    while (stack.length > 0) {
        const { node, depth } = stack.pop()!;
        if (node.children?.length) {
            for (const child of node.children) {
                if (depth + 1 > maxDepth) maxDepth = depth + 1;
                stack.push({ node: child, depth: depth + 1 });
            }
        }
    }

    return maxDepth;
}

/**
 * Compute a node's depth (its level, 0 for root) by walking the child-to-parent map.
 *
 * @param childToParentMap - Map of child ID to parent ID (from `initializeNodeMaps`).
 * @param nodeId - The node whose depth to compute.
 */
export function getNodeDepthFromParentMap<ID>(
    childToParentMap: Map<ID, ID>,
    nodeId: ID
): number {
    let depth = 0;
    let currentId: ID | undefined = nodeId;
    while (currentId !== undefined && childToParentMap.has(currentId)) {
        currentId = childToParentMap.get(currentId);
        depth++;
    }
    return depth;
}
