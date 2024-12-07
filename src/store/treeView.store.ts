import type { SelectionPropagation, TreeNode } from "src/types/treeView.types";
import { create, StoreApi, UseBoundStore } from 'zustand';

export type TreeViewState = {
    // Store ids of checked tree nodes
    checked: Set<string>;
    updateChecked: (checked: Set<string>) => void;

    // Store ids of indeterminate state nodes
    indeterminate: Set<string>;
    updateIndeterminate: (indeterminate: Set<string>) => void;

    // Store ids of expanded parent nodes
    expanded: Set<string>;
    updateExpanded: (expanded: Set<string>) => void;

    // Store initial tree view data exactly as passed by the consumer
    initialTreeViewData: TreeNode[];
    updateInitialTreeViewData: (initialTreeViewData: TreeNode[]) => void;

    // Map to store the id to the tree node map
    nodeMap: Map<string, TreeNode>;
    updateNodeMap: (nodeMap: Map<string, TreeNode>) => void;

    // Map to store child id to parent id map
    childToParentMap: Map<string, string>;
    updateChildToParentMap: (childToParentMap: Map<string, string>) => void;

    // Search text state
    searchText: string;
    updateSearchText: (searchText: string) => void;

    // Search keys state
    searchKeys: string[];
    updateSearchKeys: (searchKeys: string[]) => void;

    // To store inner most children ids - required to un/select all filtered-only nodes
    innerMostChildrenIds: string[];
    updateInnerMostChildrenIds: (innerMostChildrenIds: string[]) => void;

    selectionPropagation: SelectionPropagation;
    setSelectionPropagation: (
        selectionPropagation: SelectionPropagation
    ) => void;

    // Cleanup all states in this store
    cleanUpTreeViewStore: () => void;
};

// Map to store individual tree view stores by id
const treeViewStores = new Map<string, UseBoundStore<StoreApi<TreeViewState>>>();

export function getTreeViewStore(id: string): UseBoundStore<StoreApi<TreeViewState>> {
    if (!treeViewStores.has(id)) {
        const store = create<TreeViewState>((set) => ({
            checked: new Set(),
            updateChecked: (checked: Set<string>) => set({ checked }),

            indeterminate: new Set(),
            updateIndeterminate: (indeterminate: Set<string>) => set({ indeterminate }),

            expanded: new Set<string>(),
            updateExpanded: (expanded: Set<string>) => set({ expanded }),

            initialTreeViewData: [],
            updateInitialTreeViewData: (initialTreeViewData: TreeNode[]) => set({
                initialTreeViewData
            }),

            nodeMap: new Map<string, TreeNode>(),
            updateNodeMap: (nodeMap: Map<string, TreeNode>) => set({ nodeMap }),

            childToParentMap: new Map<string, string>(),
            updateChildToParentMap: (childToParentMap: Map<string, string>) => set({
                childToParentMap
            }),

            searchText: "",
            updateSearchText: (searchText: string) => set({ searchText }),

            searchKeys: [""],
            updateSearchKeys: (searchKeys: string[]) => set({ searchKeys }),

            innerMostChildrenIds: [],
            updateInnerMostChildrenIds: (innerMostChildrenIds: string[]) => set({
                innerMostChildrenIds
            }),

            selectionPropagation: { toChildren: true, toParents: true },
            setSelectionPropagation: (selectionPropagation) => set({
                selectionPropagation: {
                    // Default selection propagation for parent and children to true if not specified
                    toChildren: selectionPropagation.toChildren ?? true,
                    toParents: selectionPropagation.toParents ?? true
                }
            }),

            cleanUpTreeViewStore: () =>
                set({
                    checked: new Set(),
                    indeterminate: new Set(),
                    expanded: new Set<string>(),
                    initialTreeViewData: [],
                    nodeMap: new Map<string, TreeNode>(),
                    childToParentMap: new Map<string, string>(),
                    searchText: "",
                    searchKeys: [""],
                    innerMostChildrenIds: [],
                    selectionPropagation: { toChildren: true, toParents: true },
                }),
        }));

        treeViewStores.set(id, store);
    }
    return treeViewStores.get(id)!;
}

export function useTreeViewStore(id: string) {
    return getTreeViewStore(id);
}