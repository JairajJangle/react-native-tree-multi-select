import type { TreeNode } from "src/types/treeView.types";

import { create } from 'zustand';

export type GlobalState = {
    checked: Set<string>;
    updateChecked: (checked: Set<string>) => void;

    indeterminate: Set<string>;
    updateIndeterminate: (indeterminate: Set<string>) => void;

    expanded: Set<string>;
    updateExpanded: (expanded: Set<string>) => void;

    globalData: TreeNode[];
    updateGlobalData: (globalData: TreeNode[]) => void;

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

    cleanUpGlobalSignals: () => void;
};

export const useStore = create<GlobalState>((set) => ({
    checked: new Set(),
    updateChecked: (checked: Set<string>) => set({ checked }),

    indeterminate: new Set(),
    updateIndeterminate: (indeterminate: Set<string>) => set({ indeterminate }),

    expanded: new Set<string>(),
    updateExpanded: (expanded: Set<string>) => set({ expanded }),

    globalData: [],
    updateGlobalData: (globalData: TreeNode[]) => set({ globalData }),

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

    cleanUpGlobalSignals: () =>
        set({
            checked: new Set(),
            indeterminate: new Set(),
            expanded: new Set<string>(),
            globalData: [],
            nodeMap: new Map<string, TreeNode>(),
            childToParentMap: new Map<string, string>(),
            searchText: "",
            searchKeys: [""],
            innerMostChildrenIds: [],
        }),
}));


// export const state = signal<__CheckBoxState__>({
//     checked: new Set(),
//     indeterminate: new Set(),
// });
// export const expanded = signal(new Set<string>());

// export const globalData = signal<TreeNode[]>([]);

// export const nodeMap = signal(new Map<string, TreeNode>());
// export const childToParentMap = signal(new Map<string, string>());

// export const searchText = signal("");
// export const searchKeys = signal<string[]>([""]);

// export const innerMostChildrenIds = signal<string[]>([]);

// export function cleanUpGlobalSignals() {
//     state.value = ({
//         checked: new Set(),
//         indeterminate: new Set(),
//     });
//     expanded.value = new Set<string>();

//     globalData.value = [];

//     nodeMap.value = new Map<string, TreeNode>();
//     childToParentMap.value = new Map<string, string>();

//     searchText.value = "";
//     searchKeys.value = [];

//     innerMostChildrenIds.value = [];
// }