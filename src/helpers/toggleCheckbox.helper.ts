import { useTreeViewStore } from "../store/treeView.store";

/**
 * Function to toggle checkbox state for a tree structure.
 * It sets the checked and indeterminate state for all affected nodes in the tree after an action to check/uncheck is made.
 * @param {string[]} ids - The ids of nodes that need to be checked or unchecked.
 * @param {boolean} [forceCheck] - Optional. If provided, will force the check state of the nodes to be this value. 
 * If not provided, the check state will be toggled based on the current state.
 */
export function toggleCheckboxes(ids: string[], forceCheck?: boolean) {
    const {
        checked,
        updateChecked,

        indeterminate,
        updateIndeterminate,

        nodeMap,
        childToParentMap,
        selectionPropagationBehavior
    } = useTreeViewStore.getState();

    const { toChildren, toParents } = selectionPropagationBehavior;

    // Create new sets for checked and indeterminate state so as not to mutate the original state.
    const tempChecked = new Set(checked);
    const tempIndeterminate = new Set(indeterminate);

    // Maps for memoization of the recursive functions areAllDescendantsChecked and areAnyDescendantsChecked.
    const memoAllDescendantsChecked = new Map<string, boolean>();
    const memoAnyDescendantsChecked = new Map<string, boolean>();

    /**
     * Recursive function to check if all descendants of a node are checked.
     * It uses memoization to avoid redundant calculations.
     * @param {string} nodeId - The id of the node to be checked.
     * @returns {boolean} - Whether all descendants of the node are checked.
     */
    const areAllDescendantsChecked = (nodeId: string): boolean => {
        // If the result for this node is already in the map, return it.
        if (memoAllDescendantsChecked.has(nodeId)) {
            return memoAllDescendantsChecked.get(nodeId)!;
        }

        const node = nodeMap.get(nodeId);
        let allChecked = true;
        if (node?.children) {
            // If the node has children, recursively check all children.
            for (const childNode of node.children) {
                allChecked = allChecked && areAllDescendantsChecked(childNode.id);
            }
        } else {
            // If the node has no children, its state is equal to whether it is in the checked set.
            allChecked = tempChecked.has(nodeId);
        }

        // Store the result in the map and return it.
        memoAllDescendantsChecked.set(nodeId, allChecked);
        return allChecked;
    };

    /**
     * Updated function to check if any descendants of a node are checked.
     * It uses memoization to avoid redundant calculations and avoids unnecessarily deep recursion.
     * @param {string} nodeId - The id of the node to be checked.
     * @returns {boolean} - Whether any descendants of the node are checked.
     */
    const areAnyDescendantsChecked = (nodeId: string): boolean => {
        // If the result for this node is already in the map, return it.
        if (memoAnyDescendantsChecked.has(nodeId)) {
            return memoAnyDescendantsChecked.get(nodeId)!;
        }

        const node = nodeMap.get(nodeId);
        let anyChecked = false;
        if (node?.children) {
            // Check if any direct child is checked, without requiring all descendants.
            for (const childNode of node.children) {
                if (tempChecked.has(childNode.id) || areAnyDescendantsChecked(childNode.id)) {
                    anyChecked = true;
                    break;
                }
            }
        } else {
            // If the node has no children, its state is equal to whether it is in the checked set.
            anyChecked = tempChecked.has(nodeId);
        }

        // Store the result in the map and return it.
        memoAnyDescendantsChecked.set(nodeId, anyChecked);
        return anyChecked;
    };

    // Toggle the clicked nodes and their children.
    ids.forEach((id) => {
        const isChecked = tempChecked.has(id);
        const newCheckedState = forceCheck === undefined ? !isChecked : forceCheck;

        if (newCheckedState) {
            tempChecked.add(id);
            tempIndeterminate.delete(id);
            if (toChildren) {
                recursivelyUpdateChildren(id, true);
            }
        } else {
            tempChecked.delete(id);
            tempIndeterminate.delete(id);
            if (toChildren) {
                recursivelyUpdateChildren(id, false);
            }
        }

        // Skip updating parent nodes if toParents is false
        if (toParents) {
            updateParentNodes(id);
        }
    });

    // Function to recursively update children nodes as per childrenChecked value
    function recursivelyUpdateChildren(nodeId: string, childrenChecked: boolean) {
        const node = nodeMap.get(nodeId);
        if (node && node.children) {
            node.children.forEach((childNode) => {
                if (childrenChecked) {
                    tempChecked.add(childNode.id);
                    tempIndeterminate.delete(childNode.id);
                } else {
                    tempChecked.delete(childNode.id);
                    tempIndeterminate.delete(childNode.id);
                }
                recursivelyUpdateChildren(childNode.id, childrenChecked);
            });
        }
    }

    // Function to update parent nodes
    function updateParentNodes(nodeId: string) {
        let currentNodeId: string | undefined = nodeId;
        while (currentNodeId) {
            const parentNodeId = childToParentMap.get(currentNodeId);
            if (parentNodeId) {
                if (tempChecked.has(parentNodeId)) {
                    // If the parent node is currently checked, but not all child nodes are checked,
                    // move the parent node to an indeterminate state
                    if (!areAllDescendantsChecked(parentNodeId)) {
                        tempChecked.delete(parentNodeId);
                        tempIndeterminate.add(parentNodeId);
                    }
                } else if (tempIndeterminate.has(parentNodeId)) {
                    // If the parent node is currently in an indeterminate state,
                    // then check if all descendants are checked
                    if (areAllDescendantsChecked(parentNodeId)) {
                        tempIndeterminate.delete(parentNodeId);
                        tempChecked.add(parentNodeId);
                    } else if (!areAnyDescendantsChecked(parentNodeId)) {
                        // If no descendants are checked, remove from indeterminate set
                        tempIndeterminate.delete(parentNodeId);
                    }
                } else {
                    // If the parent node is not checked or indeterminate,
                    // check if any descendants are checked and update appropriately
                    if (areAnyDescendantsChecked(parentNodeId)) {
                        tempIndeterminate.add(parentNodeId);
                    }
                }
            }
            currentNodeId = parentNodeId;
        }
    }

    // Update the state object with the new checked and indeterminate sets.
    updateChecked(tempChecked);
    updateIndeterminate(tempIndeterminate);
}
