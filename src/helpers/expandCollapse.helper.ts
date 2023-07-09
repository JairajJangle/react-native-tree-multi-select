import { TreeNode } from "../types/treeView.types";
import {
    expanded,
    globalData,
    nodeMap
} from "../signals/global.signals";

/**
 * Toggle the expanded state of a tree node by its ID.
 *
 * If the node is currently expanded, it and its descendants will be collapsed.
 * If it is currently collapsed, it will be expanded.
 *
 * @param id - The ID of the tree node to toggle.
 */
export function handleToggleExpand(id: string) {
    // Create a new Set based on the current expanded state
    const newExpanded = new Set(expanded.value);

    /**
     * Recursively deletes a node and its descendants from the expanded set.
     *
     * @param node - The tree node to start deleting from.
     */
    function deleteChildrenFromExpanded(node: TreeNode) {
        if (node.children) {
            for (let child of node.children) {
                newExpanded.delete(child.id);
                deleteChildrenFromExpanded(child);
            }
        }
    }

    /**
     * Finds a node in the tree by its ID.
     *
     * @param nodes - The array of tree nodes to search through.
     * @returns The found tree node, or undefined if not found.
     */
    function findNode(nodes: TreeNode[]): TreeNode | undefined {
        for (let node of nodes) {
            if (node.id === id) {
                return node;
            } else if (node.children) {
                const found = findNode(node.children);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    // Find the node to expand or collapse
    const node = findNode(globalData.value);

    if (expanded.value.has(id)) {
        // If the node is currently expanded, collapse it and its descendants
        newExpanded.delete(id);
        if (node) {
            deleteChildrenFromExpanded(node);
        }
    } else {
        // If the node is currently collapsed, expand it
        newExpanded.add(id);
    }

    // Set the new expanded state
    expanded.value = newExpanded;
};

/**
 * Expand all nodes in the tree.
 */
export function expandAll() {
    // Create a new Set containing the IDs of all nodes
    const newExpanded = new Set(nodeMap.value.keys());
    expanded.value = newExpanded;
};

/**
 * Collapse all nodes in the tree.
 */
export function collapseAll() {
    // Create an empty Set
    const newExpanded = new Set<string>();
    expanded.value = newExpanded;
};
