import { useCallback, useEffect, useRef, useState } from "react";
import type {
    __CheckBoxState__,
    TreeNode
} from "../types/treeView.types";

/**
 * Custom hook to manage the state of a tree of checkboxes.
 *
 * @param initialData - Initial data for the tree nodes.
 * @param onSelectionChange - Callback function called whenever the selection changes.
 *
 * @returns An array with the current checkbox state and a function to toggle a checkbox.
 */
export default function useCheckboxState(
    initialData: TreeNode[],
    onSelectionChange?: (selectedIds: string[]) => void
): [__CheckBoxState__, (id: string) => void] {
    // Map of node id to node, and child id to parent id, populated on initial render
    const nodeMap = useRef(new Map<string, TreeNode>()).current;
    const childToParentMap = useRef(new Map<string, string>()).current;

    // Populate the maps on initial render
    useEffect(() => {
        const processNodes = (
            nodes: TreeNode[],
            parentId: string | null = null
        ) => {
            nodes.forEach((node) => {
                nodeMap.set(node.id, node);
                if (parentId) childToParentMap.set(node.id, parentId);
                if (node.children) processNodes(node.children, node.id);
            });
        };
        processNodes(initialData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    // State for the checked and indeterminate checkboxes
    const [state, setState] = useState<__CheckBoxState__>({
        checked: new Set(),
        indeterminate: new Set(),
    });

    /**
     * Toggle the checked state of a checkbox and update its ancestors and descendants.
     *
     * @param id - The id of the checkbox to toggle.
     */
    const toggleCheckbox = useCallback(
        (id: string) => {
            const checked = new Set(state.checked);
            const indeterminate = new Set(state.indeterminate);

            // Recursive function to check/uncheck a node and its children
            const toggleNodeAndChildren = (nodeId: string, isChecked: boolean) => {
                if (isChecked) {
                    checked.add(nodeId);
                    indeterminate.delete(nodeId); // remove node from indeterminate when checked
                } else {
                    checked.delete(nodeId);
                }
                const node = nodeMap.get(nodeId);
                node?.children?.forEach((childNode) => {
                    if (isChecked) indeterminate.delete(childNode.id); // remove children from indeterminate when parent is checked
                    toggleNodeAndChildren(childNode.id, isChecked);
                });
            };

            // Recursive function to check if all descendants of a node are checked
            const areAllDescendantsChecked = (nodeId: string): boolean => {
                const node = nodeMap.get(nodeId);
                if (!node?.children) return checked.has(nodeId);
                return node.children.every((childNode) =>
                    areAllDescendantsChecked(childNode.id)
                );
            };

            // Recursive function to check if any descendants of a node are checked
            const areAnyDescendantsChecked = (nodeId: string): boolean => {
                if (checked.has(nodeId)) return true;
                const node = nodeMap.get(nodeId);
                if (!node?.children) return false;
                return node.children.some((childNode) =>
                    areAnyDescendantsChecked(childNode.id)
                );
            };

            // Recursive function to update the indeterminate and checked state of a node and its ancestors
            const updateNodeAndAncestorsState = (nodeId: string) => {
                const node = nodeMap.get(nodeId);
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
                currentNodeId = childToParentMap.get(currentNodeId);
            }

            setState({ checked, indeterminate });

            // Call the callback function with the selected ids
            onSelectionChange?.(Array.from(checked));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state, onSelectionChange]
    );

    return [state, toggleCheckbox];
}