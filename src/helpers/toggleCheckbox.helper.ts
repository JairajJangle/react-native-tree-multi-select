import { childToParentMap, nodeMap, state } from "../signals/global.signals";

export function toggleCheckboxes(ids: string[], forceCheck?: boolean) {
    const checked = new Set(state.value.checked);
    const indeterminate = new Set(state.value.indeterminate);

    const memoAllDescendantsChecked = new Map();
    const memoAnyDescendantsChecked = new Map();

    // Recursive function to check/uncheck a node and its children
    const toggleNodeAndChildren = (nodeId: string, isChecked: boolean) => {
        if (isChecked) {
            checked.add(nodeId);
            indeterminate.delete(nodeId);
        } else {
            checked.delete(nodeId);
        }
        const node = nodeMap.value.get(nodeId);
        node?.children?.forEach((childNode) => {
            if (isChecked) indeterminate.delete(childNode.id);
            toggleNodeAndChildren(childNode.id, isChecked);
        });
    };

    // Recursive function to check if all descendants of a node are checked
    const areAllDescendantsChecked = (nodeId: string): boolean => {
        if (memoAllDescendantsChecked.has(nodeId)) {
            return memoAllDescendantsChecked.get(nodeId);
        }
        const node = nodeMap.value.get(nodeId);
        let allChecked = true;
        if (node?.children) {
            for (const childNode of node.children) {
                allChecked = allChecked && areAllDescendantsChecked(childNode.id);
            }
        } else {
            allChecked = checked.has(nodeId);
        }
        memoAllDescendantsChecked.set(nodeId, allChecked);
        return allChecked;
    };

    // Recursive function to check if any descendants of a node are checked
    const areAnyDescendantsChecked = (nodeId: string): boolean => {
        if (memoAnyDescendantsChecked.has(nodeId)) {
            return memoAnyDescendantsChecked.get(nodeId);
        }
        const node = nodeMap.value.get(nodeId);
        let anyChecked = false;
        if (node?.children) {
            for (const childNode of node.children) {
                anyChecked = anyChecked || areAnyDescendantsChecked(childNode.id);
            }
        } else {
            anyChecked = checked.has(nodeId);
        }
        memoAnyDescendantsChecked.set(nodeId, anyChecked);
        return anyChecked;
    };

    // Recursive function to update the indeterminate and checked state of a node and its ancestors
    const updateNodeAndAncestorsState = (nodeId: string) => {
        const node = nodeMap.value.get(nodeId);
        const hasOnlyOneChild = node?.children && node.children.length === 1;

        if (areAllDescendantsChecked(nodeId)) {
            checked.add(nodeId);
            indeterminate.delete(nodeId);
        } else if (areAnyDescendantsChecked(nodeId)) {
            if (hasOnlyOneChild) {
                // If a node has only one child and it's not checked,
                // remove this node from both checked and indeterminate sets
                checked.delete(nodeId);
                indeterminate.delete(nodeId);
            } else {
                checked.delete(nodeId);
                indeterminate.add(nodeId);
            }
        } else {
            checked.delete(nodeId);
            indeterminate.delete(nodeId);
        }
    };

    // Toggle the clicked node and its children
    ids.forEach((id) => {
        const isChecked = checked.has(id);
        toggleNodeAndChildren(id, forceCheck === undefined ? !isChecked : forceCheck);
    });

    // Update the indeterminate state of all nodes
    ids.forEach((id) => {
        let currentNodeId: string | undefined = id;
        while (currentNodeId) {
            updateNodeAndAncestorsState(currentNodeId);
            currentNodeId = childToParentMap.value.get(currentNodeId);
        }
    });

    state.value = ({ checked, indeterminate });
};