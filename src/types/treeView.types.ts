import type {
    StyleProp,
    TextProps,
    TouchableOpacityProps,
    ViewStyle
} from "react-native";
import type { FlashListProps } from "@shopify/flash-list";
import type {
    ScrollToNodeHandlerRef,
    ScrollToNodeParams
} from "../handlers/ScrollToNodeHandler";
import type {
    CheckboxProps as _CheckboxProps
} from "@futurejj/react-native-checkbox";

export type CheckboxValueType = boolean | "indeterminate";

export interface ExpandIconProps {
    isExpanded: boolean;
}

export interface TreeNode<ID = string> {
    id: ID;
    name: string;
    children?: TreeNode<ID>[];
    [key: string]: any;
}

export interface __FlattenedTreeNode__<ID = string> extends TreeNode<ID> {
    level?: number;
}

// Remove non-modifiable keys
export type TreeFlatListProps<ItemT = any> = Omit<
    FlashListProps<ItemT>,
    "data"
    | "renderItem"
>;

export interface NodeRowProps<ID = string> {
    node: TreeNode<ID>;
    level: number;

    checkedValue: CheckboxValueType;
    isExpanded: boolean;

    onCheck: () => void;
    onExpand: () => void;
}

export interface TreeItemCustomizations<ID> {
    checkBoxViewStyleProps?: BuiltInCheckBoxViewStyleProps;

    indentationMultiplier?: number;

    CheckboxComponent?: React.ComponentType<CheckBoxViewProps>;
    ExpandCollapseIconComponent?: React.ComponentType<ExpandIconProps>;
    ExpandCollapseTouchableComponent?: React.ComponentType<TouchableOpacityProps>;

    CustomNodeRowComponent?: React.ComponentType<NodeRowProps<ID>>;
}

export interface NodeProps<ID> extends TreeItemCustomizations<ID> {
    node: __FlattenedTreeNode__<ID>;
    level: number;
    storeId: string;
}

export interface NodeListProps<ID> extends TreeItemCustomizations<ID> {
    treeFlashListProps?: TreeFlatListProps;

    scrollToNodeHandlerRef: React.RefObject<ScrollToNodeHandlerRef<ID>>;
    initialScrollNodeID?: ID;

    storeId: string;
}

export interface TreeViewProps<ID = string> extends Omit<
    NodeListProps<ID>, "storeId" | "scrollToNodeHandlerRef"
> {
    data: TreeNode<ID>[];

    onCheck?: (checkedIds: ID[], indeterminateIds: ID[]) => void;
    onExpand?: (expandedIds: ID[]) => void;

    preselectedIds?: ID[];

    preExpandedIds?: ID[];

    selectionPropagation?: SelectionPropagation;
}

type CheckboxProps = Omit<_CheckboxProps, "onPress" | "status">;

export interface CheckBoxViewProps {
    value: CheckboxValueType;
    onValueChange: (value: boolean) => void;
    text: string;
    testID?: string;
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

export interface TreeViewRef<ID = string> {
    selectAll: () => void;
    unselectAll: () => void;

    selectAllFiltered: () => void;
    unselectAllFiltered: () => void;

    expandAll: () => void;
    collapseAll: () => void;

    expandNodes: (ids: ID[]) => void;
    collapseNodes: (ids: ID[]) => void;

    selectNodes: (ids: ID[]) => void;
    unselectNodes: (ids: ID[]) => void;

    setSearchText: (searchText: string, searchKeys?: string[]) => void;

    scrollToNodeID: (scrollToNodeParams: ScrollToNodeParams<ID>) => void;

    getChildToParentMap: () => Map<ID, ID>;
}

export interface SelectionPropagation {
    toChildren?: boolean;
    toParents?: boolean;
}
