import {
    innerMostChildrenIds,
    nodeMap,
    searchText,
    state
} from "../signals/global.signals";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

/**
 * Selects all nodes that are currently visible due to the applied filter.
 * 
 * If there is no search text, then it selects all nodes; otherwise, it selects all visible nodes.
 */
export function selectAllFiltered() {
    // If there's no search text, select all nodes
    if (!searchText.value) {
        selectAll();
    } else {
        // If there's search text, only select the visible nodes
        toggleCheckboxes(innerMostChildrenIds.value, true);
    }
};

/**
 * Unselects all nodes that are currently visible due to the applied filter.
 * 
 * If there is no search text, then it unselects all nodes; otherwise, it unselects all visible nodes.
 */
export function unselectAllFiltered() {
    // If there's no search text, unselect all nodes
    if (!searchText.value) {
        unselectAll();
    } else {
        // If there's search text, only unselect the visible nodes
        toggleCheckboxes(innerMostChildrenIds.value, false);
    }
};

/**
 * Selects all nodes in the tree.
 * 
 * This function selects all nodes by adding all node ids to the checked set and clearing the indeterminate set.
 */
export function selectAll() {
    // Create a new set containing the ids of all nodes
    const newChecked = new Set(nodeMap.value.keys());
    // Update the state to mark all nodes as checked
    state.value = ({ checked: newChecked, indeterminate: new Set() });
};

/**
 * Unselects all nodes in the tree.
 * 
 * This function unselects all nodes by clearing both the checked and indeterminate sets.
 */
export function unselectAll() {
    // Update the state to mark all nodes as unchecked
    state.value = ({ checked: new Set(), indeterminate: new Set() });
};
