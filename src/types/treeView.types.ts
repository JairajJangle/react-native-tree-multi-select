import type { TouchableOpacityProps } from "react-native";
import type { FlashListProps } from "@shopify/flash-list";

export type CheckboxValueType = boolean | 'indeterminate';

export interface CheckboxProps {
    onValueChange: () => void;
    value: CheckboxValueType;
    text: string;
}

export interface ExpandIconProps {
    isExpanded: boolean;
}

export type __CheckBoxState__ = {
    checked: Set<string>;
    indeterminate: Set<string>;
};

export interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    level?: number;
}

export type TreeFlatListProps<ItemT = any> = Omit<
    FlashListProps<ItemT>,
    "data"
    | "renderItem"
    | "keyExtractor"
>;

export interface TreeViewProps {
    data: TreeNode[];
    onSelectionChange?: (selectedIds: string[]) => void;

    preselectedIds?: string[],

    searchText: string;

    treeFlatListProps?: TreeFlatListProps;

    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

export interface TreeViewRef {
    selectAll: () => void;
    unselectAll: () => void;
}