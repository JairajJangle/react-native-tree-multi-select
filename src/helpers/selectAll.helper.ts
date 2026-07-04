import { type TreeNode } from "../types/treeView.types";
import { getTreeViewStore } from "../store/treeView.store";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

/**
 * Selects all nodes that are currently visible due to the applied filter.
 *
 * If there is no search text, then it selects all nodes; otherwise, it selects all visible nodes.
 */
export function selectAllFiltered<ID>(storeId: string) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { searchText, innerMostChildrenIds } = treeViewStore.getState();

    // If there's no search text, select all nodes
    if (!searchText) {
        selectAll<ID>(storeId);
    } else {
        // If there's search text, only select the visible nodes
        toggleCheckboxes(storeId, innerMostChildrenIds, true);
    }
};

/**
 * Unselects all nodes that are currently visible due to the applied filter.
 *
 * If there is no search text, then it unselects all nodes; otherwise, it unselects all visible nodes.
 */
export function unselectAllFiltered<ID>(storeId: string) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { searchText, innerMostChildrenIds } = treeViewStore.getState();

    // If there's no search text, unselect all nodes
    if (!searchText) {
        unselectAll<ID>(storeId);
    } else {
        // If there's search text, only unselect the visible nodes
        toggleCheckboxes(storeId, innerMostChildrenIds, false);
    }
};

/**
 * Selects all nodes in the tree.
 *
 * This function selects all nodes by adding all node ids to the checked set and clearing the indeterminate set.
 */
export function selectAll<ID>(storeId: string) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const {
        nodeMap,
        updateChecked,
        updateIndeterminate
    } = treeViewStore.getState();

    // Create a new set containing the ids of all nodes
    const newChecked = new Set(nodeMap.keys());
    // Update the state to mark all nodes as checked

    updateChecked(newChecked);
    updateIndeterminate(new Set());
};

/**
 * Unselects all nodes in the tree.
 *
 * This function unselects all nodes by clearing both the checked and indeterminate sets.
 */
export function unselectAll<ID>(storeId: string) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { updateChecked, updateIndeterminate } = treeViewStore.getState();
    // Update the state to mark all nodes as unchecked

    updateChecked(new Set());
    updateIndeterminate(new Set());
};

/**
 * Get the ids of the innermost children in the tree
 *
 * @param filteredTreeNodes - The filtered tree data
 * @returns - array of ids of the inner most children only
 */
export function getInnerMostChildrenIdsInTree<ID>(
    filteredTreeNodes: TreeNode<ID>[]
): ID[] {
    const allLeafIds: ID[] = [];

    const getLeafNodes = (_nodes: TreeNode<ID>[]) => {
        for (let node of _nodes) {
            if (node.children) {
                getLeafNodes(node.children);
            } else {
                allLeafIds.push(node.id);
            }
        }
    };

    getLeafNodes(filteredTreeNodes);

    return allLeafIds;
}
