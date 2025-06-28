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