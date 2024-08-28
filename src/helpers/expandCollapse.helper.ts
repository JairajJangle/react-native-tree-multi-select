import { TreeNode } from "../types/treeView.types";
import { useTreeViewStore } from "../store/treeView.store";

/**
 * Toggle the expanded state of a tree node by its ID.
 *
 * If the node is currently expanded, it and its descendants will be collapsed.
 * If it is currently collapsed, it will be expanded.
 *
 * @param id - The ID of the tree node to toggle.
 */
export function handleToggleExpand(id: string) {
    const {
        initialTreeViewData,
        expanded,
        updateExpanded
    } = useTreeViewStore.getState();

    // Create a new Set based on the current expanded state
    const newExpanded = new Set(expanded);

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

    // Find the node to expand or collapse
    const node = findNode(initialTreeViewData, id);

    if (expanded.has(id)) {
        // If the node is currently expanded, collapse it and its descendants
        newExpanded.delete(id);
        /* 
            istanbul ignore next:
             
            ignore because this condition is just added to satisfy 
            typescript type check but the node will never be undefined if it is already in 
            expanded Set 
        */
        if (node) {
            deleteChildrenFromExpanded(node);
        }
    } else {
        // If the node is currently collapsed, expand it
        newExpanded.add(id);
    }

    // Set the new expanded state
    updateExpanded(newExpanded);
};

/**
 * Expand all nodes in the tree.
 */
export function expandAll() {
    const { nodeMap, updateExpanded } = useTreeViewStore.getState();
    // Create a new Set containing the IDs of all nodes
    const newExpanded = new Set(nodeMap.keys());
    updateExpanded(newExpanded);
};

/**
 * Collapse all nodes in the tree.
 */
export function collapseAll() {
    const { updateExpanded } = useTreeViewStore.getState();
    // Create an empty Set
    const newExpanded = new Set<string>();
    updateExpanded(newExpanded);
};

/**
 * Expand tree nodes of given ids. If the id is of a child, it also expands
 * the parent which it belongs to. 
 * @param ids Ids of nodes to expand.
 */
export function expandNodes(ids: string[]) {
    const { expanded, updateExpanded, childToParentMap } = useTreeViewStore.getState();
    const newExpanded = new Set(expanded);
    const processedParents = new Set();  // To track already processed parents

    ids.forEach(id => {
        newExpanded.add(id);  // Start by adding the node ID to the set
        let currentId = id;

        while (currentId && childToParentMap.has(currentId) && !processedParents.has(currentId)) {
            const parentId = childToParentMap.get(currentId);
            /*
                istanbul ignore else:

                ignore because this condition is just added to satisfy 
                typescript type check as parentId will never be undefined if it is already in 
                childToParentMap Map 
            */
            if (parentId) {
                /* istanbul ignore else: nothing to be done in else block */
                if (!newExpanded.has(parentId)) {
                    newExpanded.add(parentId);  // Add the parent ID only if not already processed
                    processedParents.add(parentId);
                }
                currentId = parentId;  // Move up to the next parent
            } else {
                break;  // Break the loop if there's no further parent
            }
        }
    });

    updateExpanded(newExpanded);
}

/**
 * Collapse tree nodes of given ids. If the id is of a parent, it also collapses
 * the children inside it. 
 * @param ids Ids of nodes to collapse.
 */
export function collapseNodes(ids: string[]) {
    const { expanded, updateExpanded, nodeMap } = useTreeViewStore.getState();
    const newExpanded = new Set(expanded);

    // Function to recursively remove child nodes from the expanded set
    const deleteChildrenFromExpanded = (nodeId: string, visited = new Set()) => {
        /* 
            istanbul ignore next:
             
            ignore because this is a redundancy check.
        */
        if (visited.has(nodeId)) return; // Prevent redundant processing
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        node?.children?.forEach(child => {
            newExpanded.delete(child.id);
            deleteChildrenFromExpanded(child.id, visited);
        });
    };

    ids.forEach(id => {
        // Remove the node ID from the set and all its children
        newExpanded.delete(id);
        deleteChildrenFromExpanded(id);
    });

    updateExpanded(newExpanded);
}

/**
 * Finds a node in the tree by its ID.
 *
 * @param nodes - The array of tree nodes to search through.
 * @returns The found tree node, or undefined if not found.
 */
function findNode(nodes: TreeNode[], parentId: string): TreeNode | undefined {
    for (let node of nodes) {
        if (node.id === parentId) {
            return node;
        } else if (node.children) {
            const found = findNode(node.children, parentId);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}