import type { TreeNode } from "../types/treeView.types";
import {
    childToParentMap,
    nodeMap,
    state
} from "../signals/global.signals";

/**
 * Custom hook to manage the state of a tree of checkboxes.
 *
 * @param initialData - Initial data for the tree nodes.
 * @param preselectedIds - Array of the ids of the nodes that should be preselected.
 * @param onSelectionChange - Callback function called whenever the selection changes.
 *
 * @returns An array with the current checkbox state and a function to toggle a checkbox.
 */
export function initializeNodeMaps(
    initialData: TreeNode[],
    preselectedIds: string[] = [],
) {
    // Populate the maps and preselect nodes on initial render
    const processNodes = (
        nodes: TreeNode[],
        parentId: string | null = null
    ) => {
        nodes.forEach((node) => {
            nodeMap.value.set(node.id, node);
            if (parentId) childToParentMap.value.set(node.id, parentId);
            if (node.children) processNodes(node.children, node.id);
        });
    };
    processNodes(initialData);

    // Preselect nodes
    const checked = new Set(state.value.checked);
    const indeterminate = new Set(state.value.indeterminate);
    preselectedIds.forEach(id => {
        checked.add(id);
        let parentId = childToParentMap.value.get(id);
        while (parentId) {
            indeterminate.add(parentId);
            parentId = childToParentMap.value.get(parentId);
        }
    });
    state.value = ({ checked, indeterminate });
}