import { getTreeViewStore } from "../store/treeView.store";

/**
 * Toggle the expanded state of a tree node by its ID.
 *
 * If the node is currently expanded, it and its descendants will be collapsed.
 * If it is currently collapsed, it will be expanded.
 *
 * @param id - The ID of the tree node to toggle.
 */
export function handleToggleExpand<ID>(storeId: string, id: ID) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const {
        expanded,
        updateExpanded,
        nodeMap
    } = treeViewStore.getState();

    // Create a new Set based on the current expanded state
    const newExpanded = new Set(expanded);

    if (expanded.has(id)) {
        // If the node is currently expanded, collapse it and its descendants
        newExpanded.delete(id);

        // Use an iterative approach to remove all descendants from the expanded set
        const stack = [id];

        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const node = nodeMap.get(currentId);

            if (node && node.children) {
                for (const child of node.children) {
                    newExpanded.delete(child.id);
                    stack.push(child.id);
                }
            }
        }
    } else {
        // If the node is currently collapsed, expand it
        newExpanded.add(id);
    }

    // Update the expanded state
    updateExpanded(newExpanded);
}

/**
 * Expand all nodes in the tree.
 */
export function expandAll(storeId: string) {
    const treeViewStore = getTreeViewStore(storeId);
    const { nodeMap, updateExpanded } = treeViewStore.getState();
    // Create a new Set containing the IDs of all nodes
    const newExpanded = new Set(nodeMap.keys());
    updateExpanded(newExpanded);
}

/**
 * Collapse all nodes in the tree.
 */
export function collapseAll(storeId: string) {
    const treeViewStore = getTreeViewStore(storeId);
    const { updateExpanded } = treeViewStore.getState();
    // Clear the expanded state
    updateExpanded(new Set<string>());
}

/**
 * Expand tree nodes of given ids. If the id is of a child, it also expands
 * its ancestors up to the root.
 * @param ids - Ids of nodes to expand.
 */
export function expandNodes<ID>(storeId: string, ids: ID[]) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { expanded, updateExpanded, childToParentMap } = treeViewStore.getState();
    const newExpanded = new Set(expanded);
    const processedIds = new Set<ID>();

    ids.forEach((id) => {
        let currentId: ID | undefined = id;
        while (currentId && !processedIds.has(currentId)) {
            newExpanded.add(currentId);
            processedIds.add(currentId);
            currentId = childToParentMap.get(currentId);
        }
    });

    updateExpanded(newExpanded);
}

/**
 * Collapse tree nodes of given ids. If the id is of a parent, it also collapses
 * its descendants.
 * @param ids - Ids of nodes to collapse.
 */
export function collapseNodes<ID>(storeId: string, ids: ID[]) {
    const treeViewStore = getTreeViewStore<ID>(storeId);
    const { expanded, updateExpanded, nodeMap } = treeViewStore.getState();
    const newExpanded = new Set(expanded);

    // Use an iterative approach to remove all descendants from the expanded set
    const deleteChildrenFromExpanded = (nodeId: ID) => {
        const stack = [nodeId];

        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const node = nodeMap.get(currentId);

            if (node && node.children) {
                for (const child of node.children) {
                    newExpanded.delete(child.id);
                    stack.push(child.id);
                }
            }
        }
    };

    ids.forEach((id) => {
        // Remove the node ID from the set and all its descendants
        newExpanded.delete(id);
        deleteChildrenFromExpanded(id);
    });

    updateExpanded(newExpanded);
}
