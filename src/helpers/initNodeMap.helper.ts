import type { TreeNode } from "../types/treeView.types";
import {
    childToParentMap,
    nodeMap,
} from "../signals/global.signals";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

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

    toggleCheckboxes(preselectedIds, true);
}