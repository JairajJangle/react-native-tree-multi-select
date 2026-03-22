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
import type { DragEndEvent, DropPosition } from "./dragDrop.types";

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

    isDragTarget?: boolean;
    isDragging?: boolean;
    isDraggedNode?: boolean;
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

    nodeIndex?: number;
    dragEnabled?: boolean;
    isDragging?: boolean;
    onNodeTouchStart?: (
        nodeId: ID,
        pageY: number,
        locationY: number,
        nodeIndex: number
    ) => void;
    onNodeTouchEnd?: () => void;
    longPressDuration?: number;
    onItemLayout?: (height: number) => void;
    dragDropCustomizations?: DragDropCustomizations<ID>;
}

export interface NodeListProps<ID> extends TreeItemCustomizations<ID> {
    treeFlashListProps?: TreeFlatListProps;

    scrollToNodeHandlerRef: React.RefObject<ScrollToNodeHandlerRef<ID>>;
    initialScrollNodeID?: ID;

    storeId: string;

    dragEnabled?: boolean;
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    longPressDuration?: number;
    autoScrollThreshold?: number;
    autoScrollSpeed?: number;
    /** Offset of the dragged overlay from the finger, in item-height units. Default: -1 (one item above finger) */
    dragOverlayOffset?: number;
    /** Delay in ms before auto-expanding a collapsed node during drag hover. Default: 800 */
    autoExpandDelay?: number;
    /** Customizations for drag-and-drop visuals (overlay, indicator, opacity) */
    dragDropCustomizations?: DragDropCustomizations<ID>;
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

    /** Enable drag-and-drop reordering */
    dragEnabled?: boolean;
    /** Callback fired after a node is dropped at a new position */
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    /** Long press duration in ms to start drag. Default: 400 */
    longPressDuration?: number;
    /** Distance from edge (px) to trigger auto-scroll. Default: 60 */
    autoScrollThreshold?: number;
    /** Speed multiplier for auto-scroll. Default: 1.0 */
    autoScrollSpeed?: number;
    /** Offset of the dragged overlay from the finger, in item-height units. Default: -1 (one item above finger) */
    dragOverlayOffset?: number;
    /** Delay in ms before auto-expanding a collapsed node during drag hover. Default: 800 */
    autoExpandDelay?: number;
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

// --- Drag-and-drop customization types ---

/** Props for the drop indicator rendered on the target node during drag */
export interface DropIndicatorComponentProps {
    /** Whether the indicator is above, below, or inside the target node */
    position: DropPosition;
}

/** Style props for customizing the built-in drop indicator appearance */
export interface DropIndicatorStyleProps {
    /** Color of the line indicator (above/below). Default: "#0078FF" */
    lineColor?: string;
    /** Thickness of the line indicator. Default: 3 */
    lineThickness?: number;
    /** Diameter of the circle at the line's start. Default: 10 */
    circleSize?: number;
    /** Background color of the "inside" highlight. Default: "rgba(0, 120, 255, 0.15)" */
    highlightColor?: string;
    /** Border color of the "inside" highlight. Default: "rgba(0, 120, 255, 0.5)" */
    highlightBorderColor?: string;
}

/** Style props for customizing the drag overlay (the "lifted" node ghost) */
export interface DragOverlayStyleProps {
    /** Background color of the overlay. Default: "rgba(255, 255, 255, 0.95)" */
    backgroundColor?: string;
    /** Shadow color. Default: "#000" */
    shadowColor?: string;
    /** Shadow opacity. Default: 0.25 */
    shadowOpacity?: number;
    /** Shadow radius. Default: 4 */
    shadowRadius?: number;
    /** Android elevation. Default: 10 */
    elevation?: number;
    /** Custom style applied to the overlay container */
    style?: StyleProp<ViewStyle>;
}

/** Combined drag-and-drop customization props */
export interface DragDropCustomizations<ID> {
    /** Opacity applied to the dragged node and its invalid drop targets. Default: 0.3 */
    draggedNodeOpacity?: number;
    /** Style props for the built-in drop indicator */
    dropIndicatorStyleProps?: DropIndicatorStyleProps;
    /** Style props for the drag overlay (lifted node ghost) */
    dragOverlayStyleProps?: DragOverlayStyleProps;
    /** Fully custom drop indicator component — replaces the built-in line/highlight */
    CustomDropIndicatorComponent?: React.ComponentType<DropIndicatorComponentProps>;
    /** Fully custom drag overlay component — replaces the built-in ghost node */
    CustomDragOverlayComponent?: React.ComponentType<DragOverlayComponentProps<ID>>;
}

/** Props passed to a custom drag overlay component */
export interface DragOverlayComponentProps<ID = string> {
    /** The node being dragged */
    node: __FlattenedTreeNode__<ID>;
    /** The nesting level of the dragged node */
    level: number;
}
