import { TreeNode, __FlattenedTreeNode__ } from "../types/treeView.types";

/**
 * Flatten the tree and attach a "level" key to object to indicate it's depth. This 
 * returns the flattened tree data of expanded ids only. We do not prune the tree off the
 * children after the flattening as it would be unnecessary computation.
 * 
 * @param nodes - Input recursive tree
 * @param expandedIds - ids of currently expanded nodes
 * @param level - (optional) for internal recursive use only
 * @returns Flattened tree data with expanded ids only
 */
export function getFlattenedTreeData(
    nodes: TreeNode[],
    expandedIds: Set<string>,
    __level__: number = 0,
): __FlattenedTreeNode__[] {
    let flattened: __FlattenedTreeNode__[] = [];
    for (let node of nodes) {
        flattened.push({ ...node, level: __level__ });
        if (node.children && expandedIds.has(node.id)) {
            flattened = [
                ...flattened,
                ...getFlattenedTreeData(node.children, expandedIds, __level__ + 1)
            ];
        }
    }
    return flattened;
};