import type { FlatListProps, TouchableOpacityProps } from "react-native";

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
}

export type TreeFlatListProps<ItemT = any> = Omit<
    FlatListProps<ItemT>,
    "data"
    | "renderItem"
    | "keyExtractor"
>;

export interface TreeViewProps {
    data: TreeNode[];
    onSelectionChange?: (selectedIds: string[]) => void;

    searchText: string;

    treeFlatListProps?: TreeFlatListProps;

    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}