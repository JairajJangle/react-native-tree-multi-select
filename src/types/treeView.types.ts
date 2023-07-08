import type { StyleProp, TextProps, TouchableOpacityProps, ViewStyle } from "react-native";
import type { FlashListProps } from "@shopify/flash-list";
import {
    type Props as RNPaperCheckboxAndroidProps
} from 'react-native-paper/src/components/Checkbox/CheckboxAndroid';

export type CheckboxValueType = boolean | 'indeterminate';

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

    treeFlashListProps?: TreeFlatListProps;
    customCheckBoxViewProps?: CustomCheckBoxViewProps;

    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

type CheckboxProps = Omit<RNPaperCheckboxAndroidProps, "onPress" | "status">;
export interface CustomCheckBoxViewProps {
    // Optional style modifiers
    outermostParentViewStyle?: StyleProp<ViewStyle> | {};
    checkboxParentViewStyle?: StyleProp<ViewStyle> | {};
    textTouchableStyle?: StyleProp<ViewStyle> | {};

    // Optional checkbox and text component props
    checkboxProps?: CheckboxProps;
    textProps?: TextProps;
}

export interface TreeViewRef {
    selectAll: () => void;
    unselectAll: () => void;

    selectAllFiltered: () => void;
    unselectAllFiltered: () => void;

    setSearchText: (searchText: string) => void;
}