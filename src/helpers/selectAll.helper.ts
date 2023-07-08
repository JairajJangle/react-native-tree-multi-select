import { batch } from "@preact/signals-react";
import { innerMostChildrenIds, nodeMap, state } from "../signals/global.signals";
import { toggleCheckbox } from "./toggleCheckbox.helper";

export function selectAllFiltered() {
    batch(() => {
        innerMostChildrenIds.value.forEach(i => toggleCheckbox(i, true));
    });
};

export function unselectAllFiltered() {
    batch(() => {
        innerMostChildrenIds.value.forEach(i => toggleCheckbox(i, false));
    });
};

export function selectAll() {
    const newChecked = new Set(nodeMap.value.keys());
    state.value = ({ checked: newChecked, indeterminate: new Set() });
};

export function unselectAll() {
    state.value = ({ checked: new Set(), indeterminate: new Set() });
};