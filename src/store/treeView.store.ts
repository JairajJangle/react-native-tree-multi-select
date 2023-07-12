import type { TreeNode } from "src/types/treeView.types";

import { create } from 'zustand';

type TreeViewState = {
    checked: Set<string>;
    updateChecked: (checked: Set<string>) => void;

    indeterminate: Set<string>;
    updateIndeterminate: (indeterminate: Set<string>) => void;

    expanded: Set<string>;
    updateExpanded: (expanded: Set<string>) => void;

    initialTreeViewData: TreeNode[];
    updateInitialTreeViewData: (initialTreeViewData: TreeNode[]) => void;

    nodeMap: Map<string, TreeNode>;
    updateNodeMap: (nodeMap: Map<string, TreeNode>) => void;

    childToParentMap: Map<string, string>;
    updateChildToParentMap: (childToParentMap: Map<string, string>) => void;

    searchText: string;
    updatedSearchText: (searchText: string) => void;

    searchKeys: string[];
    updatedSearchKeys: (searchKeys: string[]) => void;

    innerMostChildrenIds: string[];
    updatedInnerMostChildrenIds: (innerMostChildrenIds: string[]) => void;

    cleanUpTreeViewStore: () => void;
};

export const useTreeViewStore = create<TreeViewState>((set) => ({
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
    updateChildToParentMap: (childToParentMap: Map<string, string>) => set({ childToParentMap }),

    searchText: "",
    updatedSearchText: (searchText: string) => set({ searchText }),

    searchKeys: [""],
    updatedSearchKeys: (searchKeys: string[]) => set({ searchKeys }),

    innerMostChildrenIds: [],
    updatedInnerMostChildrenIds: (innerMostChildrenIds: string[]) => set({ innerMostChildrenIds }),

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
        }),
}));