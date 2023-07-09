import type { TreeNode } from "../types/treeView.types";
import {
    childToParentMap,
    nodeMap,
} from "../signals/global.signals";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

/**
 * Initialize the maps for tracking tree nodes and their parent-child relationships.
 *
 * This function is intended to be called once, during component initialization, 
 * with the initial tree data and any preselected node IDs.
 *
 * @param initialData - An array of TreeNode objects that represent the initial tree structure.
 * @param preselectedIds - An optional array of TreeNode IDs that should be preselected.
 */
export function initializeNodeMaps(
    initialData: TreeNode[],
    preselectedIds: string[] = [],
) {
    /**
     * Recursively processes nodes, adding them to the nodeMap and childToParentMap.
     *
     * @param nodes - An array of TreeNode objects to be processed.
     * @param parentId - The ID of the parent node, if applicable.
     */
    const processNodes = (
        nodes: TreeNode[],
        parentId: string | null = null
    ) => {
        nodes.forEach((node) => {
            // Each node is added to the nodeMap with its ID as the key
            nodeMap.value.set(node.id, node);
            // If the node has a parent, its ID is mapped to the parent's ID in the childToParentMap
            if (parentId) childToParentMap.value.set(node.id, parentId);
            // If the node has children, recursively process them
            if (node.children) processNodes(node.children, node.id);
        });
    };

    // Begin processing with the initial tree data
    processNodes(initialData);

    // Check any preselected nodes
    toggleCheckboxes(preselectedIds, true);
}