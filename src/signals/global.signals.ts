import { signal } from "@preact/signals-react";
import type { TreeNode, __CheckBoxState__ } from "src/types/treeView.types";

export const state = signal<__CheckBoxState__>({
    checked: new Set(),
    indeterminate: new Set(),
});
export const expanded = signal(new Set<string>());

export const globalData = signal<TreeNode[]>([]);

export const nodeMap = signal(new Map<string, TreeNode>());
export const childToParentMap = signal(new Map<string, string>());

export const searchText = signal("");
export const searchKeys = signal<string[]>([""]);

export const innerMostChildrenIds = signal<string[]>([]);

export function cleanUpGlobalSignals() {
    state.value = ({
        checked: new Set(),
        indeterminate: new Set(),
    });
    expanded.value = new Set<string>();

    globalData.value = [];

    nodeMap.value = new Map<string, TreeNode>();
    childToParentMap.value = new Map<string, string>();

    searchText.value = "";
    searchKeys.value = [];

    innerMostChildrenIds.value = [];
}