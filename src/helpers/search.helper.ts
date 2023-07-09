import { TreeNode } from "../types/treeView.types";

export function doesNodeContainSearchTerm(
    node: TreeNode,
    searchTerm: string,
    searchKeys: string[]
): boolean {
    return searchKeys.some(key => {
        const nodeValue = node[key];
        return (nodeValue?.toString().toLowerCase().includes(searchTerm));
    });
}