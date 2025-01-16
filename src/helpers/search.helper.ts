import { TreeNode } from "../types/treeView.types";

/**
 * Get filtered tree data based on the search term and the search keys
 * If any of the parent contains the search term, the tree will also contain
 * it's children.
 *
 * If only one of the innermost children contains the search term then it's siblings
 * won't be included in the search. But all it's ancestor nodes will be included
 *
 * @param nodes Input tree data
 * @param trimmedSearchTerm search term
 * @param searchKeys search key
 * @returns filtered tree data
 */
export function getFilteredTreeData<ID>(
    nodes: TreeNode<ID>[],
    trimmedSearchTerm: string,
    searchKeys: string[]
): TreeNode<ID>[] {
    let filtered: TreeNode<ID>[] = [];

    for (let node of nodes) {
        const isSearchTermInNode = doesNodeContainSearchTerm(
            node,
            trimmedSearchTerm,
            searchKeys
        );

        if (!trimmedSearchTerm || isSearchTermInNode) {
            // If node itself matches, include it and all its descendants
            filtered.push(node);
        } else if (node.children) {
            // If node does not match, check its children and include them if they match
            const childMatches = getFilteredTreeData<ID>(
                node.children,
                trimmedSearchTerm,
                searchKeys
            );

            if (childMatches.length > 0) {
                // If any children match, include the node, replacing its children with the matching ones
                filtered.push({ ...node, children: childMatches });
            }
        }
    }

    return filtered;
};

/**
 * Checks if a given tree node contains a specific search term in any of its specified keys.
 *
 * This function will check each of the specified keys in the tree node, convert the key's value to a string,
 * and check if it includes the search term.
 *
 * @param node - The tree node to search through.
 * @param searchTerm - The term to search for.
 * @param searchKeys - The keys in the tree node to search in.
 * @returns True if the search term is found in any of the specified keys, false otherwise.
 */
function doesNodeContainSearchTerm<ID>(
    node: TreeNode<ID>,
    searchTerm: string,
    searchKeys: string[]
): boolean {
    // We're using the `some` method on the array of keys to check each one
    return searchKeys.some(key => {
        // Get the value of the key in the tree node
        const nodeValue = node[key];
        // Check if the string representation of the key's value includes the search term
        // If the value is undefined or null, `nodeValue?.toString()` will return undefined,
        // and the call to `toLowerCase().includes(searchTerm)` will return false.
        return (nodeValue?.toString().toLowerCase().includes(searchTerm));
    });
}
