import { TreeNode } from "../types/treeView.types";
import { expanded, globalData } from "../signals/global.signals";

export function handleToggleExpand(id: string) {
    const newExpanded = new Set(expanded.value);

    // Helper function to recursively delete children from the expanded set.
    function deleteChildrenFromExpanded(node: TreeNode) {
        if (node.children) {
            for (let child of node.children) {
                newExpanded.delete(child.id);
                deleteChildrenFromExpanded(child);
            }
        }
    }

    // Find the clicked node in the nodes array.
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