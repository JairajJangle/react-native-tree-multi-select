import { childToParentMap, nodeMap, state } from "../signals/global.signals";

export function toggleCheckbox(id: string, forceCheck?: boolean) {
    const checked = new Set(state.value.checked);
    const indeterminate = new Set(state.value.indeterminate);

    // Recursive function to check/uncheck a node and its children
    const toggleNodeAndChildren = (nodeId: string, isChecked: boolean) => {
        if (isChecked) {
            checked.add(nodeId);
            indeterminate.delete(nodeId); // remove node from indeterminate when checked
        } else {
            checked.delete(nodeId);
        }
        const node = nodeMap.value.get(nodeId);
        node?.children?.forEach((childNode) => {
            if (isChecked) indeterminate.delete(childNode.id); // remove children from indeterminate when parent is checked
            toggleNodeAndChildren(childNode.id, isChecked);
        });
    };

    // Recursive function to check if all descendants of a node are checked
    const areAllDescendantsChecked = (nodeId: string): boolean => {
        const node = nodeMap.value.get(nodeId);
        if (!node?.children) return checked.has(nodeId);
        return node.children.every((childNode) =>
            areAllDescendantsChecked(childNode.id)
        );
    };

    // Recursive function to check if any descendants of a node are checked
    const areAnyDescendantsChecked = (nodeId: string): boolean => {
        if (checked.has(nodeId)) return true;
        const node = nodeMap.value.get(nodeId);
        if (!node?.children) return false;
        return node.children.some((childNode) =>
            areAnyDescendantsChecked(childNode.id)
        );
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
    const isChecked = checked.has(id);
    toggleNodeAndChildren(id, forceCheck === undefined ? !isChecked : forceCheck);

    // Update the indeterminate state of all nodes
    let currentNodeId: string | undefined = id;
    while (currentNodeId) {
        updateNodeAndAncestorsState(currentNodeId);
        currentNodeId = childToParentMap.value.get(currentNodeId);
    }

    state.value = ({ checked, indeterminate });
};