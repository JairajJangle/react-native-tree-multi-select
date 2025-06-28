import type { SelectionPropagation, TreeNode } from "../types/treeView.types";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export type TreeViewState<ID> = {
    // Store ids of checked tree nodes
    checked: Set<ID>;
    updateChecked: (checked: Set<ID>) => void;

    // Store ids of indeterminate state nodes
    indeterminate: Set<ID>;
    updateIndeterminate: (indeterminate: Set<ID>) => void;

    // Store ids of expanded parent nodes
    expanded: Set<ID>;
    updateExpanded: (expanded: Set<ID>) => void;

    // Store initial tree view data exactly as passed by the consumer
    initialTreeViewData: TreeNode<ID>[];
    updateInitialTreeViewData: (initialTreeViewData: TreeNode<ID>[]) => void;

    // Map to store the id to the tree node map
    nodeMap: Map<ID, TreeNode<ID>>;
    updateNodeMap: (nodeMap: Map<ID, TreeNode<ID>>) => void;

    // Map to store child id to parent id map
    childToParentMap: Map<ID, ID>;
    updateChildToParentMap: (childToParentMap: Map<ID, ID>) => void;

    // Search text state
    searchText: string;
    updateSearchText: (searchText: string) => void;

    // Search keys state
    searchKeys: string[];
    updateSearchKeys: (searchKeys: string[]) => void;

    // To store inner most children ids - required to un/select all filtered-only nodes
    innerMostChildrenIds: ID[];
    updateInnerMostChildrenIds: (innerMostChildrenIds: ID[]) => void;

    selectionPropagation: SelectionPropagation;
    setSelectionPropagation: (
        selectionPropagation: SelectionPropagation
    ) => void;

    // Cleanup all states in this store
    cleanUpTreeViewStore: () => void;
};

// Map to store individual tree view stores by id
const treeViewStores = new Map<string, UseBoundStore<StoreApi<TreeViewState<unknown>>>>();
// a function that returns a strongly typed version of `treeViewStores`
const typedStore: <ID>() => Map<string, UseBoundStore<StoreApi<TreeViewState<ID>>>> = <ID>() => treeViewStores as Map<string, UseBoundStore<StoreApi<TreeViewState<ID>>>>;

export function getTreeViewStore<ID>(id: string): UseBoundStore<StoreApi<TreeViewState<ID>>> {
    if (!typedStore<ID>().has(id)) {
        const store = create<TreeViewState<ID>>((set) => ({
            checked: new Set(),
            updateChecked: (checked: Set<ID>) => set({ checked }),

            indeterminate: new Set(),
            updateIndeterminate: (indeterminate: Set<ID>) => set({ indeterminate }),

            expanded: new Set<ID>(),
            updateExpanded: (expanded: Set<ID>) => set({ expanded }),

            initialTreeViewData: [],
            updateInitialTreeViewData: (initialTreeViewData: TreeNode<ID>[]) => set({
                initialTreeViewData
            }),

            nodeMap: new Map<ID, TreeNode<ID>>(),
            updateNodeMap: (nodeMap: Map<ID, TreeNode<ID>>) => set({ nodeMap }),

            childToParentMap: new Map<ID, ID>(),
            updateChildToParentMap: (childToParentMap: Map<ID, ID>) => set({
                childToParentMap
            }),

            searchText: "",
            updateSearchText: (searchText: string) => set({ searchText }),

            searchKeys: [""],
            updateSearchKeys: (searchKeys: string[]) => set({ searchKeys }),

            innerMostChildrenIds: [],
            updateInnerMostChildrenIds: (innerMostChildrenIds: ID[]) => set({
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
                    expanded: new Set<ID>(),
                    initialTreeViewData: [],
                    nodeMap: new Map<ID, TreeNode<ID>>(),
                    childToParentMap: new Map<ID, ID>(),
                    searchText: "",
                    searchKeys: [""],
                    innerMostChildrenIds: [],
                    selectionPropagation: { toChildren: true, toParents: true },
                }),
        }));

        typedStore<ID>().set(id, store);
    }
    return typedStore<ID>().get(id)!;
}

export function useTreeViewStore<ID = string>(id: string) {
    return getTreeViewStore<ID>(id);
}
