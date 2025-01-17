import { getTreeViewStore } from "../store/treeView.store";

/**
 * Function to toggle checkbox state for a tree structure.
 * It sets the checked and indeterminate state for all affected nodes in the tree after an action to check/uncheck is made.
 * @param {string[]} ids - The ids of nodes that need to be checked or unchecked.
 * @param {boolean} [forceCheck] - Optional. If provided, will force the check state of the nodes to be this value.
 * If not provided, the check state will be toggled based on the current state.
 */
export function toggleCheckboxes<ID>(
    storeId: string,
    ids: ID[],
    forceCheck?: boolean
) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const {
        checked,
        updateChecked,

        indeterminate,
        updateIndeterminate,

        nodeMap,
        childToParentMap,
        selectionPropagation
    } = treeViewStore.getState();

    const { toChildren, toParents } = selectionPropagation;

    // Create new sets for checked and indeterminate state so as not to mutate the original state.
    const tempChecked = new Set(checked);
    const tempIndeterminate = new Set(indeterminate);

    // Keep track of nodes that have been toggled or affected.
    const affectedNodes = new Set<ID>();

    // Memoization maps for node depths.
    const nodeDepths = new Map<ID, number>();

    // Step 1: Toggle the clicked nodes and their children without updating parents yet.
    ids.forEach((id) => {
        const node = nodeMap.get(id);
        if (!node) {
            // Node does not exist; skip processing this ID
            return;
        }

        const isChecked = tempChecked.has(id);
        const newCheckedState = forceCheck === undefined ? !isChecked : forceCheck;

        if (newCheckedState) {
            tempChecked.add(id);
            tempIndeterminate.delete(id);
            affectedNodes.add(id);
            if (toChildren) {
                updateChildrenIteratively(id, true);
            }
        } else {
            tempChecked.delete(id);
            tempIndeterminate.delete(id);
            affectedNodes.add(id);
            if (toChildren) {
                updateChildrenIteratively(id, false);
            }
        }
    });

    // Step 2: Collect all affected parent nodes.
    const nodesToUpdate = new Set<ID>();

    if (toParents) {
        affectedNodes.forEach((id) => {
            let currentNodeId: ID | undefined = id;
            while (currentNodeId) {
                const parentNodeId = childToParentMap.get(currentNodeId);
                if (parentNodeId) {
                    nodesToUpdate.add(parentNodeId);
                    currentNodeId = parentNodeId;
                } else {
                    break;
                }
            }
        });
    }

    // Step 3: Update parent nodes in bottom-up order.
    if (toParents && nodesToUpdate.size > 0) {
        // Convert the set to an array and sort nodes by depth (deepest first).
        const sortedNodes = Array.from(nodesToUpdate).sort((a, b) => {
            return getNodeDepth(b) - getNodeDepth(a);
        });

        sortedNodes.forEach((nodeId) => {
            updateNodeState(nodeId);
        });
    }

    /**
     * Function to iteratively update children nodes as per childrenChecked value.
     * @param rootId - The ID of the root node to start updating from.
     * @param childrenChecked - The desired checked state for children.
     */
    function updateChildrenIteratively(rootId: ID, childrenChecked: boolean) {
        const stack = [rootId];

        while (stack.length > 0) {
            const nodeId = stack.pop()!;
            const node = nodeMap.get(nodeId);
            if (!node) continue; // Node does not exist; skip

            if (childrenChecked) {
                tempChecked.add(nodeId);
                tempIndeterminate.delete(nodeId);
            } else {
                tempChecked.delete(nodeId);
                tempIndeterminate.delete(nodeId);
            }
            affectedNodes.add(nodeId);

            if (node.children && node.children.length > 0) {
                for (const childNode of node.children) {
                    stack.push(childNode.id);
                }
            }
        }
    }

    /**
     * Function to get the depth of a node for sorting purposes, with memoization.
     * @param nodeId - The ID of the node to get the depth for.
     * @returns The depth of the node.
     */
    function getNodeDepth(nodeId: ID): number {
        if (nodeDepths.has(nodeId)) {
            return nodeDepths.get(nodeId)!;
        }

        let depth = 0;
        let currentNodeId: ID | undefined = nodeId;
        while (currentNodeId) {
            const parentNodeId = childToParentMap.get(currentNodeId);
            if (parentNodeId) {
                depth++;
                currentNodeId = parentNodeId;
            } else {
                break;
            }
        }

        nodeDepths.set(nodeId, depth);
        return depth;
    }

    /**
     * Function to update the state of a node based on its children's states.
     * @param nodeId - The ID of the node to update.
     */
    function updateNodeState(nodeId: ID) {
        const node = nodeMap.get(nodeId);
        if (!node || !node.children || node.children.length === 0) {
            // Leaf nodes are already updated.
            return;
        }

        let allChildrenChecked = true;
        let anyChildCheckedOrIndeterminate = false;

        for (const child of node.children) {
            const isChecked = tempChecked.has(child.id);
            const isIndeterminate = tempIndeterminate.has(child.id);

            if (isChecked) {
                anyChildCheckedOrIndeterminate = true;
            } else if (isIndeterminate) {
                anyChildCheckedOrIndeterminate = true;
                allChildrenChecked = false;
            } else {
                allChildrenChecked = false;
            }

            // If both conditions are met, we can break early.
            if (!allChildrenChecked && anyChildCheckedOrIndeterminate) {
                break;
            }
        }

        if (allChildrenChecked) {
            tempChecked.add(nodeId);
            tempIndeterminate.delete(nodeId);
        } else if (anyChildCheckedOrIndeterminate) {
            tempChecked.delete(nodeId);
            tempIndeterminate.add(nodeId);
        } else {
            tempChecked.delete(nodeId);
            tempIndeterminate.delete(nodeId);
        }
    }

    // Update the state object with the new checked and indeterminate sets.
    updateChecked(tempChecked);
    updateIndeterminate(tempIndeterminate);
}
