import type {
    StyleProp,
    TextProps,
    TouchableOpacityProps,
    ViewStyle
} from "react-native";
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
>;

export interface NodeRowProps {
    node: TreeNode;
    level: number;

    checkedValue: CheckboxValueType;
    isExpanded: boolean;

    onCheck: () => void;
    onExpand: () => void;
}

export interface TreeItemCustomizations {
    checkBoxViewStyleProps?: BuiltInCheckBoxViewStyleProps;

    indentationMultiplier?: number;

    CheckboxComponent?: React.ComponentType<CheckBoxViewProps>;
    ExpandCollapseIconComponent?: React.ComponentType<ExpandIconProps>;
    ExpandCollapseTouchableComponent?: React.ComponentType<TouchableOpacityProps>;

    CustomNodeRowComponent?: React.ComponentType<NodeRowProps>;
}

export interface NodeProps extends TreeItemCustomizations {
    node: __FlattenedTreeNode__;
    level: number;
}

export interface NodeListProps extends TreeItemCustomizations {
    treeFlashListProps?: TreeFlatListProps;
}

export interface TreeViewProps extends NodeListProps {
    data: TreeNode[];

    onCheck?: (checkedIds: string[], indeterminateIds: string[]) => void;
    onExpand?: (expandedIds: string[]) => void;

    selectionPropagationBehavior?: SelectionPropagationBehavior;

    preselectedIds?: string[];

    preExpandedIds?: string[];
}

type CheckboxProps = Omit<RNPaperCheckboxAndroidProps, "onPress" | "status">;

export interface CheckBoxViewProps {
    value: CheckboxValueType;
    onValueChange: (value: boolean) => void;
    text: string;
}

export interface BuiltInCheckBoxViewStyleProps {
    // Optional style modifiers
    outermostParentViewStyle?: StyleProp<ViewStyle>;
    checkboxParentViewStyle?: StyleProp<ViewStyle>;
    textTouchableStyle?: StyleProp<ViewStyle>;

    // Optional checkbox and text component props
    checkboxProps?: CheckboxProps;
    textProps?: TextProps;
}

export type BuiltInCheckBoxViewProps =
    CheckBoxViewProps
    & BuiltInCheckBoxViewStyleProps;

export interface TreeViewRef {
    selectAll: () => void;
    unselectAll: () => void;

    selectAllFiltered: () => void;
    unselectAllFiltered: () => void;

    expandAll: () => void;
    collapseAll: () => void;

    expandNodes: (ids: string[]) => void;
    collapseNodes: (ids: string[]) => void;

    selectNodes: (ids: string[]) => void;
    unselectNodes: (ids: string[]) => void;

    setSearchText: (searchText: string, searchKeys?: string[]) => void;
}

export interface SelectionPropagationBehavior {
    toChildren?: boolean;
    toParents?: boolean;
}