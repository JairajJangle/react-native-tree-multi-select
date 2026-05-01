import { ComponentType, RefObject } from "react";
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
} from "../hooks/useScrollToNode";
import type {
    CheckboxProps as _CheckboxProps
} from "@futurejj/react-native-checkbox";
import type { DragCancelEvent, DragEndEvent, DragStartEvent, DropPosition } from "./dragDrop.types";

/** The tri-state value of a checkbox: checked, unchecked, or indeterminate */
export type CheckboxValueType = boolean | "indeterminate";

/** Props passed to a custom expand/collapse icon component */
export interface ExpandIconProps {
    /** Whether the node is currently expanded */
    isExpanded: boolean;
}

/** A single node in the tree data structure */
export interface TreeNode<ID = string> {
    /** Unique identifier for this node */
    id: ID;
    /** Display name for this node */
    name: string;
    /** Child nodes (omit or empty array for leaf nodes) */
    children?: TreeNode<ID>[];
    /** Additional custom data fields */
    [key: string]: any;
}

/** Internal flattened representation of a tree node with its nesting level */
export interface __FlattenedTreeNode__<ID = string> extends TreeNode<ID> {
    /** Nesting depth of this node (0 = root level) */
    level?: number;
}

/** FlashList props available for customization (excludes `data` and `renderItem`) */
export type TreeFlatListProps<ItemT = any> = Omit<
    FlashListProps<ItemT>,
    "data"
    | "renderItem"
>;

/** Props passed to a custom node row component */
export interface NodeRowProps<ID = string> {
    /** The tree node to render */
    node: TreeNode<ID>;
    /** Nesting depth of this node (0 = root level) */
    level: number;

    /** Current checkbox state of this node */
    checkedValue: CheckboxValueType;
    /** Whether this node's children are currently visible */
    isExpanded: boolean;

    /** Callback to toggle this node's checked state */
    onCheck: () => void;
    /** Callback to toggle this node's expanded/collapsed state */
    onExpand: () => void;

    /** Whether this node is an invalid drop target during a drag operation */
    isInvalidDropTarget?: boolean;
    /** Whether this node is the current valid drop target */
    isDropTarget?: boolean;
    /** The drop position if this node is the current drop target */
    dropPosition?: DropPosition;
    /** Whether a drag operation is currently in progress */
    isDragging?: boolean;
    /** Whether this node is the one being dragged */
    isDraggedNode?: boolean;

    /** Props to spread on a drag handle element. Attach to a specific View to
     *  make only that area initiate drag, or spread on the root for whole-row drag.
     *  Only present when drag-and-drop is enabled. */
    dragHandleProps?: DragHandleProps;
}

/** Touch handlers to spread on a drag handle element within a custom node row */
export interface DragHandleProps {
    onTouchStart: (e: any) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
}

/** Customization options for tree item appearance and behavior */
export interface TreeItemCustomizations<ID> {
    /** Style props for the built-in checkbox view */
    checkBoxViewStyleProps?: BuiltInCheckBoxViewStyleProps;

    /** Pixels of indentation per nesting level. Default: 15 */
    indentationMultiplier?: number;

    /** Custom checkbox component replacing the built-in checkbox */
    CheckboxComponent?: ComponentType<CheckBoxViewProps>;
    /** Custom expand/collapse icon component */
    ExpandCollapseIconComponent?: ComponentType<ExpandIconProps>;
    /** Custom touchable component wrapping the expand/collapse icon */
    ExpandCollapseTouchableComponent?: ComponentType<TouchableOpacityProps>;

    /** Fully custom node row component replacing the entire built-in row */
    CustomNodeRowComponent?: ComponentType<NodeRowProps<ID>>;
}

/** Internal props for a single node in the list (extends TreeItemCustomizations) */
export interface NodeProps<ID> extends TreeItemCustomizations<ID> {
    /** The flattened tree node data */
    node: __FlattenedTreeNode__<ID>;
    /** Nesting depth of this node */
    level: number;
    /** Internal store identifier */
    storeId: string;

    /** Index of this node in the flattened list */
    nodeIndex?: number;
    /** Whether drag-and-drop is enabled */
    dragEnabled?: boolean;
    /** Whether a drag operation is currently in progress */
    isDragging?: boolean;
    /** Callback when a touch starts on this node (used for drag initiation) */
    onNodeTouchStart?: (
        nodeId: ID,
        pageY: number,
        locationY: number,
        nodeIndex: number
    ) => void;
    /** Callback when a touch ends on this node */
    onNodeTouchEnd?: () => void;
    /** Callback reporting this node's measured height */
    onItemLayout?: (height: number) => void;
    /** Customizations for drag-and-drop visuals */
    dragDropCustomizations?: DragDropCustomizations<ID>;
}

/** Configuration options for drag-and-drop reordering */
export interface DragAndDropOptions<ID = string> {
    /** Enable drag-and-drop reordering. Default: true (when dragAndDrop is provided) */
    enabled?: boolean;
    /** Callback fired when a drag operation begins */
    onDragStart?: (event: DragStartEvent<ID>) => void;
    /** Callback fired after a node is successfully dropped at a new position */
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    /** Callback fired when a drag is cancelled without a successful drop */
    onDragCancel?: (event: DragCancelEvent<ID>) => void;
    /** Long press duration in ms to start drag. Default: 400 */
    longPressDuration?: number;
    /** Distance from edge (px) to trigger auto-scroll during drag. Default: 60 */
    autoScrollThreshold?: number;
    /** Speed multiplier for auto-scroll during drag. Default: 1.0 */
    autoScrollSpeed?: number;
    /** Offset of the dragged overlay from the finger, in item-height units. Default: -4 (four items above finger) */
    dragOverlayOffset?: number;
    /** Delay in ms before auto-expanding a collapsed node during drag hover. Default: 800 */
    autoExpandDelay?: number;
    /** Customizations for drag-and-drop visuals (overlay, indicator, opacity) */
    customizations?: DragDropCustomizations<ID>;

    /** Callback to determine if a node can be dropped on a specific target.
     *  Return false to grey out the target and suppress the drop indicator. */
    canDrop?: (draggedNode: TreeNode<ID>, targetNode: TreeNode<ID>, position: DropPosition) => boolean;
    /** Maximum nesting depth allowed. Drops that would exceed this depth are suppressed. */
    maxDepth?: number;
    /** Callback to determine if a node can accept children.
     *  Return false to suppress the "inside" drop zone for that node. */
    canNodeHaveChildren?: (node: TreeNode<ID>) => boolean;
    /** Callback to determine if a node can be dragged.
     *  Return false to prevent dragging this node. Default: all nodes are draggable. */
    canDrag?: (node: TreeNode<ID>) => boolean;
}

/** Props for the NodeList component that renders the flattened tree */
export interface NodeListProps<ID> extends TreeItemCustomizations<ID> {
    /** Additional props passed to the underlying FlashList */
    treeFlashListProps?: TreeFlatListProps;

    /** Ref for programmatic scroll-to-node functionality */
    scrollToNodeHandlerRef: RefObject<ScrollToNodeHandlerRef<ID>>;
    /** Node ID to scroll to on initial render */
    initialScrollNodeID?: ID;

    /** Internal store identifier */
    storeId: string;

    /** Drag-and-drop configuration */
    dragAndDrop?: DragAndDropOptions<ID>;
}

/** Props for the TreeView component */
export interface TreeViewProps<ID = string> extends Omit<
    NodeListProps<ID>, "storeId" | "scrollToNodeHandlerRef"
> {
    /** The tree data to render */
    data: TreeNode<ID>[];

    /** Callback fired when checked nodes change. Receives checked and indeterminate node IDs. */
    onCheck?: (checkedIds: ID[], indeterminateIds: ID[]) => void;
    /** Callback fired when expanded nodes change. Receives all currently expanded node IDs. */
    onExpand?: (expandedIds: ID[]) => void;

    /** Node IDs that should be checked on initial render */
    preselectedIds?: ID[];

    /** Node IDs that should be expanded on initial render */
    preExpandedIds?: ID[];

    /** Controls whether checking a node propagates to its children and/or parents */
    selectionPropagation?: SelectionPropagation;

    /** Drag-and-drop configuration */
    dragAndDrop?: DragAndDropOptions<ID>;
}

type CheckboxProps = Omit<_CheckboxProps, "onPress" | "status">;

/** Props for the checkbox view component */
export interface CheckBoxViewProps {
    /** Current checkbox state */
    value: CheckboxValueType;
    /** Callback when the checkbox value changes */
    onValueChange: (value: boolean) => void;
    /** Label text displayed next to the checkbox */
    text: string;
    /** Test ID for testing frameworks */
    testID?: string;
}

/** Style props for customizing the built-in checkbox view */
export interface BuiltInCheckBoxViewStyleProps {
    /** Style for the outermost container wrapping the checkbox and text */
    outermostParentViewStyle?: StyleProp<ViewStyle>;
    /** Style for the view wrapping the checkbox itself */
    checkboxParentViewStyle?: StyleProp<ViewStyle>;
    /** Style for the touchable area wrapping the label text */
    textTouchableStyle?: StyleProp<ViewStyle>;

    /** Additional props passed to the underlying Checkbox component */
    checkboxProps?: CheckboxProps;
    /** Props passed to the label Text component */
    textProps?: TextProps;
}

/** Combined props for the built-in checkbox view (CheckBoxViewProps + style props) */
export type BuiltInCheckBoxViewProps =
    CheckBoxViewProps
    & BuiltInCheckBoxViewStyleProps;

/** Ref handle exposed by the TreeView component for imperative operations */
export interface TreeViewRef<ID = string> {
    /** Select (check) all nodes in the tree */
    selectAll: () => void;
    /** Unselect (uncheck) all nodes in the tree */
    unselectAll: () => void;

    /** Select all nodes that match the current search filter */
    selectAllFiltered: () => void;
    /** Unselect all nodes that match the current search filter */
    unselectAllFiltered: () => void;

    /** Expand all nodes in the tree */
    expandAll: () => void;
    /** Collapse all nodes in the tree */
    collapseAll: () => void;

    /** Expand specific nodes by their IDs */
    expandNodes: (ids: ID[]) => void;
    /** Collapse specific nodes by their IDs */
    collapseNodes: (ids: ID[]) => void;

    /** Select (check) specific nodes by their IDs */
    selectNodes: (ids: ID[]) => void;
    /** Unselect (uncheck) specific nodes by their IDs */
    unselectNodes: (ids: ID[]) => void;

    /** Set the search text and optionally specify which node fields to search */
    setSearchText: (searchText: string, searchKeys?: string[]) => void;

    /** Programmatically scroll to a specific node by its ID */
    scrollToNodeID: (scrollToNodeParams: ScrollToNodeParams<ID>) => void;

    /** Get a map of child node IDs to their parent node IDs */
    getChildToParentMap: () => Map<ID, ID>;

    /** Programmatically move a node to a new position in the tree.
     *  Works like a drag-and-drop but without user interaction. */
    moveNode: (nodeId: ID, targetNodeId: ID, position: DropPosition) => void;
}

/** Controls how checkbox selection propagates through the tree hierarchy */
export interface SelectionPropagation {
    /** Whether checking a parent node automatically checks all its children. Default: true */
    toChildren?: boolean;
    /** Whether checking all children automatically checks their parent. Default: true */
    toParents?: boolean;
}

// --- Drag-and-drop customization types ---

/** Props for the drop indicator rendered on the target node during drag */
export interface DropIndicatorComponentProps {
    /** Whether the indicator is above, below, or inside the target node */
    position: DropPosition;
    /** The nesting level of the target node (useful for indenting the indicator) */
    level: number;
    /** The indentation multiplier used for each level (pixels per level) */
    indentationMultiplier: number;
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
export interface DragDropCustomizations<ID = string> {
    /** Opacity applied to the node being dragged. Default: 0.3 */
    draggedNodeOpacity?: number;
    /** Opacity applied to invalid drop targets during drag. Default: 0.3 */
    invalidTargetOpacity?: number;
    /** Style props for the built-in drop indicator */
    dropIndicatorStyleProps?: DropIndicatorStyleProps;
    /** Style props for the drag overlay (lifted node ghost) */
    dragOverlayStyleProps?: DragOverlayStyleProps;
    /** Fully custom drop indicator component - replaces the built-in line/highlight */
    CustomDropIndicatorComponent?: ComponentType<DropIndicatorComponentProps>;
    /** Fully custom drag overlay component - replaces the built-in ghost node */
    CustomDragOverlayComponent?: ComponentType<DragOverlayComponentProps<ID>>;
}

/** Props passed to a custom drag overlay component */
export interface DragOverlayComponentProps<ID = string> {
    /** The node being dragged */
    node: __FlattenedTreeNode__<ID>;
    /** The nesting level of the dragged node */
    level: number;
    /** The current checkbox value of the dragged node */
    checkedValue: CheckboxValueType;
}
