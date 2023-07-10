import { useStore } from "../store/global.store";

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
        childToParentMap
    } = useStore.getState();

    // Create new sets for checked and indeterminate state so as not to mutate the original state.
    const tempChecked = new Set(checked);
    const tempIndeterminate = new Set(indeterminate);

    // Maps for memoization of the recursive functions areAllDescendantsChecked and areAnyDescendantsChecked.
    const memoAllDescendantsChecked = new Map();
    const memoAnyDescendantsChecked = new Map();

    /**
     * Recursive function to check/uncheck a node and all its children.
     * @param {string} nodeId - The id of the node to be checked or unchecked.
     * @param {boolean} isChecked - Whether the node should be checked or unchecked.
     */
    const toggleNodeAndChildren = (nodeId: string, isChecked: boolean) => {
        // Set or unset this node in the checked set, and remove it from the indeterminate set.
        if (isChecked) {
            tempChecked.add(nodeId);
            tempIndeterminate.delete(nodeId);
        } else {
            tempChecked.delete(nodeId);
        }

        // Get the node from the node map and recursively apply the same state to all its children.
        const node = nodeMap.get(nodeId);
        node?.children?.forEach((childNode) => {
            if (isChecked) tempIndeterminate.delete(childNode.id);
            toggleNodeAndChildren(childNode.id, isChecked);
        });
    };

    /**
     * Recursive function to check if all descendants of a node are checked.
     * It uses memoization to avoid redundant calculations.
     * @param {string} nodeId - The id of the node to be checked.
     * @returns {boolean} - Whether all descendants of the node are checked.
     */
    const areAllDescendantsChecked = (nodeId: string): boolean => {
        // If the result for this node is already in the map, return it.
        if (memoAllDescendantsChecked.has(nodeId)) {
            return memoAllDescendantsChecked.get(nodeId);
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
     * Recursive function to check if any descendants of a node are checked.
     * It uses memoization to avoid redundant calculations.
     * @param {string} nodeId - The id of the node to be checked.
     * @returns {boolean} - Whether any descendants of the node are checked.
     */
    const areAnyDescendantsChecked = (nodeId: string): boolean => {
        // If the result for this node is already in the map, return it.
        if (memoAnyDescendantsChecked.has(nodeId)) {
            return memoAnyDescendantsChecked.get(nodeId);
        }

        const node = nodeMap.get(nodeId);
        let anyChecked = false;
        if (node?.children) {
            // If the node has children, recursively check all children.
            for (const childNode of node.children) {
                anyChecked = anyChecked || areAnyDescendantsChecked(childNode.id);
            }
        } else {
            // If the node has no children, its state is equal to whether it is in the checked set.
            anyChecked = tempChecked.has(nodeId);
        }

        // Store the result in the map and return it.
        memoAnyDescendantsChecked.set(nodeId, anyChecked);
        return anyChecked;
    };

    /**
     * Function to update the indeterminate and checked state of a node and its ancestors.
     * @param {string} nodeId - The id of the node to be updated.
     */
    const updateNodeAndAncestorsState = (nodeId: string) => {
        const node = nodeMap.get(nodeId);
        const hasOnlyOneChild = node?.children && node.children.length === 1;

        // Update the node's state based on the state of its descendants.
        if (areAllDescendantsChecked(nodeId)) {
            tempChecked.add(nodeId);
            tempIndeterminate.delete(nodeId);
        } else if (areAnyDescendantsChecked(nodeId)) {
            if (hasOnlyOneChild) {
                // If a node has only one child and it's not checked,
                // remove this node from both checked and indeterminate sets.
                tempChecked.delete(nodeId);
                tempIndeterminate.delete(nodeId);
            } else {
                tempChecked.delete(nodeId);
                tempIndeterminate.add(nodeId);
            }
        } else {
            tempChecked.delete(nodeId);
            tempIndeterminate.delete(nodeId);
        }
    };

    // Toggle the clicked nodes and their children.
    ids.forEach((id) => {
        const isChecked = tempChecked.has(id);
        toggleNodeAndChildren(id, forceCheck === undefined ? !isChecked : forceCheck);
    });

    // Update the state of all affected nodes.
    ids.forEach((id) => {
        let currentNodeId: string | undefined = id;
        while (currentNodeId) {
            updateNodeAndAncestorsState(currentNodeId);
            currentNodeId = childToParentMap.get(currentNodeId);
        }
    });

    // Update the state object with the new checked and indeterminate sets.
    updateChecked(tempChecked);
    updateIndeterminate(tempIndeterminate);
};
