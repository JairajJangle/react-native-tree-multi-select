import {
    innerMostChildrenIds,
    nodeMap,
    searchText,
    state
} from "../signals/global.signals";
import { toggleCheckboxes } from "./toggleCheckbox.helper";

export function selectAllFiltered() {
    if (!searchText.value)
        selectAll();
    else
        toggleCheckboxes(innerMostChildrenIds.value, true);
};

export function unselectAllFiltered() {
    if (!searchText.value)
        unselectAll();
    else
        toggleCheckboxes(innerMostChildrenIds.value, false);
};

export function selectAll() {
    const newChecked = new Set(nodeMap.value.keys());
    state.value = ({ checked: newChecked, indeterminate: new Set() });
};

export function unselectAll() {
    state.value = ({ checked: new Set(), indeterminate: new Set() });
};