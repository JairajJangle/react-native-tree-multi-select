import { TreeNode } from "../types/treeView.types";

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
export function doesNodeContainSearchTerm(
    node: TreeNode,
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
