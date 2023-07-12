import { useTreeViewStore } from "../store/treeView.store";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

/**
 * Selects all nodes that are currently visible due to the applied filter.
 * 
 * If there is no search text, then it selects all nodes; otherwise, it selects all visible nodes.
 */
export function selectAllFiltered() {
    const { searchText, innerMostChildrenIds } = useTreeViewStore.getState();


    // If there's no search text, select all nodes
    if (!searchText) {
        selectAll();
    } else {
        // If there's search text, only select the visible nodes
        toggleCheckboxes(innerMostChildrenIds, true);
    }
};

/**
 * Unselects all nodes that are currently visible due to the applied filter.
 * 
 * If there is no search text, then it unselects all nodes; otherwise, it unselects all visible nodes.
 */
export function unselectAllFiltered() {
    const { searchText, innerMostChildrenIds } = useTreeViewStore.getState();

    // If there's no search text, unselect all nodes
    if (!searchText) {
        unselectAll();
    } else {
        // If there's search text, only unselect the visible nodes
        toggleCheckboxes(innerMostChildrenIds, false);
    }
};

/**
 * Selects all nodes in the tree.
 * 
 * This function selects all nodes by adding all node ids to the checked set and clearing the indeterminate set.
 */
export function selectAll() {
    const {
        nodeMap,
        updateChecked,
        updateIndeterminate
    } = useTreeViewStore.getState();

    // Create a new set containing the ids of all nodes
    const newChecked = new Set(nodeMap.keys());
    // Update the state to mark all nodes as checked

    updateChecked(newChecked);
    updateIndeterminate(new Set());
};

/**
 * Unselects all nodes in the tree.
 * 
 * This function unselects all nodes by clearing both the checked and indeterminate sets.
 */
export function unselectAll() {
    const { updateChecked, updateIndeterminate } = useTreeViewStore.getState();
    // Update the state to mark all nodes as unchecked

    updateChecked(new Set());
    updateIndeterminate(new Set());
};
