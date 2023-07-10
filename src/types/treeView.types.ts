import type { StyleProp, TextProps, TouchableOpacityProps, ViewStyle } from "react-native";
import type { FlashListProps } from "@shopify/flash-list";
import {
    type Props as RNPaperCheckboxAndroidProps
} from 'react-native-paper/src/components/Checkbox/CheckboxAndroid';

export type CheckboxValueType = boolean | 'indeterminate';

export interface ExpandIconProps {
    isExpanded: boolean;
}

export interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    [key: string]: any;
}

export interface __FlattenedTreeNode__ extends TreeNode {
    level?: number;
}

// Remove non-modifiable keys
export type TreeFlatListProps<ItemT = any> = Omit<
    FlashListProps<ItemT>,
    "data"
    | "renderItem"
    | "keyExtractor"
>;

export interface TreeViewProps {
    data: TreeNode[];

    onCheck?: (checkedIds: string[]) => void;
    onExpand?: (expandedIds: string[]) => void;

    preselectedIds?: string[],

    treeFlashListProps?: TreeFlatListProps;
    checkBoxViewStyleProps?: CheckBoxViewStyleProps;

    CheckboxComponent?: React.ComponentType<CheckBoxViewProps>;
    ExpandCollapseIconComponent?: React.ComponentType<ExpandIconProps>;
    ExpandCollapseTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

type CheckboxProps = Omit<RNPaperCheckboxAndroidProps, "onPress" | "status">;

export interface CheckBoxViewStyleProps {
    // Optional style modifiers
    outermostParentViewStyle?: StyleProp<ViewStyle> | {};
    checkboxParentViewStyle?: StyleProp<ViewStyle> | {};
    textTouchableStyle?: StyleProp<ViewStyle> | {};

    // Optional checkbox and text component props
    checkboxProps?: CheckboxProps;
    textProps?: TextProps;
}

export interface CheckBoxViewProps extends CheckBoxViewStyleProps {
    value: CheckboxValueType;
    onValueChange: (value: boolean) => void;
    text: string;
}

export interface TreeViewRef {
    selectAll: () => void;
    unselectAll: () => void;

    selectAllFiltered: () => void;
    unselectAllFiltered: () => void;

    expandAll: () => void;
    collapseAll: () => void;

    setSearchText: (searchText: string, searchKeys?: string[]) => void;
}