import type { TreeNode } from "../types/treeView.types";
import {
    childToParentMap,
    expanded,
    globalData,
    nodeMap,
    state
} from "../signals/global.signals";

export const toggleCheckbox = (id: string) => {
    const checked = new Set(state.value.checked);
    const indeterminate = new Set(state.value.indeterminate);

    // Recursive function to check/uncheck a node and its children
    const toggleNodeAndChildren = (nodeId: string, isChecked: boolean) => {
        if (isChecked) {
            checked.add(nodeId);
            indeterminate.delete(nodeId); // remove node from indeterminate when checked
        } else {
            checked.delete(nodeId);
        }
        const node = nodeMap.value.get(nodeId);
        node?.children?.forEach((childNode) => {
            if (isChecked) indeterminate.delete(childNode.id); // remove children from indeterminate when parent is checked
            toggleNodeAndChildren(childNode.id, isChecked);
        });
    };

    // Recursive function to check if all descendants of a node are checked
    const areAllDescendantsChecked = (nodeId: string): boolean => {
        const node = nodeMap.value.get(nodeId);
        if (!node?.children) return checked.has(nodeId);
        return node.children.every((childNode) =>
            areAllDescendantsChecked(childNode.id)
        );
    };

    // Recursive function to check if any descendants of a node are checked
    const areAnyDescendantsChecked = (nodeId: string): boolean => {
        if (checked.has(nodeId)) return true;
        const node = nodeMap.value.get(nodeId);
        if (!node?.children) return false;
        return node.children.some((childNode) =>
            areAnyDescendantsChecked(childNode.id)
        );
    };

    // Recursive function to update the indeterminate and checked state of a node and its ancestors
    const updateNodeAndAncestorsState = (nodeId: string) => {
        const node = nodeMap.value.get(nodeId);
        const hasOnlyOneChild = node?.children && node.children.length === 1;

        if (areAllDescendantsChecked(nodeId)) {
            checked.add(nodeId);
            indeterminate.delete(nodeId);
        } else if (areAnyDescendantsChecked(nodeId)) {
            if (hasOnlyOneChild) {
                // If a node has only one child and it's not checked,
                // remove this node from both checked and indeterminate sets
                checked.delete(nodeId);
                indeterminate.delete(nodeId);
            } else {
                checked.delete(nodeId);
                indeterminate.add(nodeId);
            }
        } else {
            checked.delete(nodeId);
            indeterminate.delete(nodeId);
        }
    };

    // Toggle the clicked node and its children
    const isChecked = checked.has(id);
    toggleNodeAndChildren(id, !isChecked);

    // Update the indeterminate state of all nodes
    let currentNodeId: string | undefined = id;
    while (currentNodeId) {
        updateNodeAndAncestorsState(currentNodeId);
        currentNodeId = childToParentMap.value.get(currentNodeId);
    }

    state.value = ({ checked, indeterminate });

    // Call the callback function with the selected ids
    // onSelectionChange?.(Array.from(checked));
};

export const selectAll = () => {
    const newChecked = new Set(nodeMap.value.keys());
    state.value = ({ checked: newChecked, indeterminate: new Set() });
};

export const unselectAll = () => {
    state.value = ({ checked: new Set(), indeterminate: new Set() });
};

/**
 * Custom hook to manage the state of a tree of checkboxes.
 *
 * @param initialData - Initial data for the tree nodes.
 * @param preselectedIds - Array of the ids of the nodes that should be preselected.
 * @param onSelectionChange - Callback function called whenever the selection changes.
 *
 * @returns An array with the current checkbox state and a function to toggle a checkbox.
 */
export default function initializeNodeMaps(
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

export function handleToggleExpand(id: string) {
    const newExpanded = new Set(expanded.value);

    // Helper function to recursively delete children from the expanded set.
    const deleteChildrenFromExpanded = (node: TreeNode) => {
        if (node.children) {
            for (let child of node.children) {
                newExpanded.delete(child.id);
                deleteChildrenFromExpanded(child);
            }
        }
    };

    // Find the clicked node in the nodes array.
    const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
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
    };
    const node = findNode(globalData.value);

    if (expanded.value.has(id)) {
        newExpanded.delete(id);
        // If this node was in the expanded set, also delete all its children from the set.
        if (node) {
            deleteChildrenFromExpanded(node);
        }
    } else {
        newExpanded.add(id);
    }

    expanded.value = newExpanded;
};