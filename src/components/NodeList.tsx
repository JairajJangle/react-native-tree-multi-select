import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import type {
    __FlattenedTreeNode__,
    DropIndicatorStyleProps,
    NodeListProps,
    NodeProps,
    TreeNode,
} from "../types/treeView.types";

import { useTreeViewStore } from "../store/treeView.store";
import {
    getFilteredTreeData,
    getFlattenedTreeData,
    getCheckboxValue,
    getInnerMostChildrenIdsInTree,
    handleToggleExpand,
    toggleCheckboxes
} from "../helpers";
import { CheckboxView } from "./CheckboxView";
import { CustomExpandCollapseIcon } from "./CustomExpandCollapseIcon";
import { DragOverlay } from "./DragOverlay";
import type { DropPosition } from "../types/dragDrop.types";
import {
    defaultIndentationMultiplier,
    listHeaderFooterPadding
} from "../constants/treeView.constants";
import { useShallow } from "zustand/react/shallow";
import { typedMemo } from "../utils/typedMemo";
import { useScrollToNode } from "../hooks/useScrollToNode";
import { useDragDrop } from "../hooks/useDragDrop";

const NodeList = typedMemo(_NodeList);
export default NodeList;

function _NodeList<ID>(props: NodeListProps<ID>) {
    const {
        storeId,

        scrollToNodeHandlerRef,
        initialScrollNodeID,

        treeFlashListProps,
        checkBoxViewStyleProps,
        indentationMultiplier,

        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
        CustomNodeRowComponent,

        dragAndDrop,
    } = props;

    const {
        enabled: _dragEnabled,
        onDragStart,
        onDragEnd,
        onDragCancel,
        longPressDuration = 400,
        autoScrollThreshold = 60,
        autoScrollSpeed = 1.0,
        dragOverlayOffset = -4,
        autoExpandDelay = 800,
        customizations: dragDropCustomizations,
        canDrop: canDropCallback,
        maxDepth,
        canNodeHaveChildren,
        canDrag,
    } = dragAndDrop ?? {};

    // When the dragAndDrop prop is provided, drag is enabled by default.
    // Users can still toggle it off with enabled: false at runtime.
    const dragEnabled = dragAndDrop ? (_dragEnabled ?? true) : false;

    const {
        expanded,
        initialTreeViewData,
        updateInnerMostChildrenIds,
        searchKeys,
        searchText
    } = useTreeViewStore<ID>(storeId)(useShallow(
        state => ({
            expanded: state.expanded,
            initialTreeViewData: state.initialTreeViewData,
            updateInnerMostChildrenIds: state.updateInnerMostChildrenIds,
            searchKeys: state.searchKeys,
            searchText: state.searchText,
        })
    ));

    const flashListRef = useRef<FlashList<__FlattenedTreeNode__<ID>> | null>(null);
    const containerRef = useRef<View>(null);
    const internalDataRef = useRef<TreeNode<ID>[] | null>(null);
    const measuredItemHeightRef = useRef(0);

    const handleItemLayout = useCallback((height: number) => {
        if (measuredItemHeightRef.current === 0 && height > 0) {
            measuredItemHeightRef.current = height;
        }
    }, []);

    const [initialScrollIndex, setInitialScrollIndex] = useState<number>(-1);

    // First we filter the tree as per the search term and keys
    const filteredTree = useMemo(() => getFilteredTreeData<ID>(
        initialTreeViewData,
        searchText.trim().toLowerCase(),
        searchKeys
    ), [initialTreeViewData, searchText, searchKeys]);

    // Then we flatten the tree to make it "render-compatible" in a "flat" list
    const flattenedFilteredNodes = useMemo(() => getFlattenedTreeData<ID>(
        filteredTree,
        expanded,
    ), [filteredTree, expanded]);

    useScrollToNode<ID>({
        storeId,
        scrollToNodeHandlerRef,
        flashListRef,
        flattenedFilteredNodes,
        setInitialScrollIndex,
        initialScrollNodeID,
    });

    // And update the innermost children id -> required to un/select filtered tree
    useEffect(() => {
        const updatedInnerMostChildrenIds = getInnerMostChildrenIdsInTree<ID>(
            filteredTree
        );
        updateInnerMostChildrenIds(updatedInnerMostChildrenIds);
    }, [filteredTree, updateInnerMostChildrenIds]);

    const effectiveIndentationMultiplier = indentationMultiplier ?? defaultIndentationMultiplier;

    // --- Drag and drop ---
    const {
        panResponder,
        overlayY,
        overlayX,
        isDragging,
        draggedNode,
        effectiveDropLevel,
        handleNodeTouchStart,
        handleNodeTouchEnd,
        cancelLongPressTimer,
        scrollOffsetRef,
    } = useDragDrop<ID>({
        storeId,
        flattenedNodes: flattenedFilteredNodes,
        flashListRef,
        containerRef,
        dragEnabled,
        onDragStart,
        onDragEnd,
        onDragCancel,
        longPressDuration,
        autoScrollThreshold,
        autoScrollSpeed,
        internalDataRef,
        measuredItemHeightRef,
        dragOverlayOffset,
        autoExpandDelay,
        indentationMultiplier: effectiveIndentationMultiplier,
        canDrop: canDropCallback,
        maxDepth,
        canNodeHaveChildren,
        canDrag,
    });

    // Combined onScroll handler
    const handleScroll = useCallback((
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        // Cancel long press timer if user is scrolling
        cancelLongPressTimer();
        // Forward to user's onScroll
        treeFlashListProps?.onScroll?.(event as any);
    }, [scrollOffsetRef, cancelLongPressTimer, treeFlashListProps]);

    const nodeRenderer = useCallback((
        { item, index }: { item: __FlattenedTreeNode__<ID>; index: number; }
    ) => {
        return (
            <Node<ID>
                storeId={storeId}

                node={item}
                level={item.level || 0}

                checkBoxViewStyleProps={checkBoxViewStyleProps}
                indentationMultiplier={indentationMultiplier}

                CheckboxComponent={CheckboxComponent}
                ExpandCollapseIconComponent={ExpandCollapseIconComponent}
                ExpandCollapseTouchableComponent={ExpandCollapseTouchableComponent}
                CustomNodeRowComponent={CustomNodeRowComponent}

                nodeIndex={index}
                dragEnabled={dragEnabled}
                isDragging={isDragging}
                onNodeTouchStart={dragEnabled ? handleNodeTouchStart : undefined}
                onNodeTouchEnd={dragEnabled ? handleNodeTouchEnd : undefined}
                onItemLayout={dragEnabled ? handleItemLayout : undefined}
                dragDropCustomizations={dragDropCustomizations}
            />
        );
    }, [
        storeId,
        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
        CustomNodeRowComponent,
        checkBoxViewStyleProps,
        indentationMultiplier,
        dragEnabled,
        isDragging,
        handleNodeTouchStart,
        handleNodeTouchEnd,
        dragDropCustomizations,
        handleItemLayout,
    ]);

    // Extract FlashList props but exclude onScroll (we provide our own combined handler)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onScroll: _userOnScroll, ...restFlashListProps } = treeFlashListProps ?? {};

    const flashListElement = (
        <FlashList
            ref={flashListRef}
            estimatedItemSize={36}
            initialScrollIndex={initialScrollIndex}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            drawDistance={50}
            ListHeaderComponent={<HeaderFooterView />}
            ListFooterComponent={<HeaderFooterView />}
            {...restFlashListProps}
            onScroll={handleScroll}
            scrollEnabled={isDragging ? false : (restFlashListProps?.scrollEnabled ?? true)}
            data={flattenedFilteredNodes}
            renderItem={nodeRenderer}
        />
    );

    return (
        <>
            {dragEnabled ? (
                <View
                    ref={containerRef}
                    style={styles.dragContainer}
                    {...panResponder.panHandlers}
                >
                    {flashListElement}
                    {isDragging && draggedNode && (
                        <DragOverlay<ID>
                            storeId={storeId}
                            overlayY={overlayY}
                            overlayX={overlayX}
                            node={draggedNode}
                            level={effectiveDropLevel}
                            indentationMultiplier={effectiveIndentationMultiplier}
                            CheckboxComponent={CheckboxComponent}
                            ExpandCollapseIconComponent={ExpandCollapseIconComponent}
                            CustomNodeRowComponent={CustomNodeRowComponent}
                            checkBoxViewStyleProps={checkBoxViewStyleProps}
                            dragDropCustomizations={dragDropCustomizations}
                        />
                    )}
                </View>
            ) : (
                flashListElement
            )}
        </>
    );
};

function HeaderFooterView() {
    return (
        <View style={{ padding: listHeaderFooterPadding }} />
    );
}


const Node = typedMemo(_Node);
function _Node<ID>(props: NodeProps<ID>) {
    const {
        storeId,

        node,
        level,

        checkBoxViewStyleProps,
        indentationMultiplier = defaultIndentationMultiplier,

        ExpandCollapseIconComponent = CustomExpandCollapseIcon,
        CheckboxComponent = CheckboxView,
        ExpandCollapseTouchableComponent = TouchableOpacity,
        CustomNodeRowComponent,

        nodeIndex = 0,
        dragEnabled,
        isDragging: isDraggingGlobal,
        onNodeTouchStart,
        onNodeTouchEnd,
        onItemLayout,
        dragDropCustomizations,
    } = props;

    const {
        isExpanded,
        value,
        isBeingDragged,
        isDragInvalid,
        isDropTarget,
        nodeDropPosition,
        nodeDropLevel,
    } = useTreeViewStore<ID>(storeId)(useShallow(
        state => ({
            isExpanded: state.expanded.has(node.id),
            value: getCheckboxValue(
                state.checked.has(node.id),
                state.indeterminate.has(node.id)
            ),
            isBeingDragged: state.draggedNodeId === node.id,
            isDragInvalid: state.invalidDragTargetIds.has(node.id),
            isDropTarget: state.dropTargetNodeId === node.id,
            nodeDropPosition: state.dropTargetNodeId === node.id ? state.dropPosition : null,
            nodeDropLevel: state.dropTargetNodeId === node.id ? state.dropLevel : null,
        })
    ));

    // Track when this node was dragged so we can swallow the onPress/onCheck
    // that fires when the user lifts their finger after a long-press-initiated drag.
    // The flag is set during render (synchronous) and cleared on the next touch start.
    // It is also cleared via effect when dragging ends, to prevent stale `true`
    // values surviving FlashList recycling (where refs persist across items).
    const wasDraggedRef = useRef(false);
    if (isDraggingGlobal && isBeingDragged) {
        wasDraggedRef.current = true;
    }

    useEffect(() => {
        if (!isDraggingGlobal) {
            wasDraggedRef.current = false;
        }
    }, [isDraggingGlobal]);

    const _onToggleExpand = useCallback(() => {
        if (wasDraggedRef.current) return;
        handleToggleExpand(storeId, node.id);
    }, [storeId, node.id]);

    const _onCheck = useCallback(() => {
        if (wasDraggedRef.current) return;
        toggleCheckboxes(storeId, [node.id]);
    }, [storeId, node.id]);

    const handleTouchStart = useCallback((e: any) => {
        wasDraggedRef.current = false;
        if (!onNodeTouchStart) return;
        const { pageY, locationY } = e.nativeEvent;
        onNodeTouchStart(node.id, pageY, locationY, nodeIndex);
    }, [node.id, nodeIndex, onNodeTouchStart]);

    const handleTouchEnd = useCallback(() => {
        onNodeTouchEnd?.();
    }, [onNodeTouchEnd]);

    // Determine opacity for drag state (separate values for dragged node vs invalid targets).
    // When CustomNodeRowComponent is used, hand off all visual control
    // (including drag opacity) to the custom component — it receives
    // isDraggedNode / isInvalidDropTarget / isDragging props.
    const draggedOpacity = dragDropCustomizations?.draggedNodeOpacity ?? 0.3;
    const invalidOpacity = dragDropCustomizations?.invalidTargetOpacity ?? 0.3;
    const nodeOpacity = CustomNodeRowComponent
        ? 1.0
        : isDraggingGlobal
            ? (isBeingDragged ? draggedOpacity : isDragInvalid ? invalidOpacity : 1.0)
            : 1.0;

    const handleLayout = useCallback((e: any) => {
        onItemLayout?.(e.nativeEvent.layout.height);
    }, [onItemLayout]);

    const touchHandlers = dragEnabled ? {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd,
    } : undefined;

    const CustomDropIndicator = dragDropCustomizations?.CustomDropIndicatorComponent;
    const indicatorLevel = nodeDropLevel ?? level;
    const dropIndicator = isDropTarget && nodeDropPosition ? (
        CustomDropIndicator
            ? <CustomDropIndicator position={nodeDropPosition} level={indicatorLevel} indentationMultiplier={indentationMultiplier} />
            : <NodeDropIndicator position={nodeDropPosition} level={indicatorLevel} indentationMultiplier={indentationMultiplier} styleProps={dragDropCustomizations?.dropIndicatorStyleProps} />
    ) : null;

    if (!CustomNodeRowComponent) {
        return (
            <View
                testID={`node_row_${node.id}`}
                {...touchHandlers}
                onLayout={onItemLayout ? handleLayout : undefined}
                style={[
                    styles.nodeCheckboxAndArrowRow,
                    { paddingStart: level * indentationMultiplier },
                    { opacity: nodeOpacity },
                    dropIndicator ? styles.nodeOverflowVisible : undefined,
                ]}>
                {dropIndicator}
                <CheckboxComponent
                    text={node.name}
                    onValueChange={_onCheck}
                    value={value}
                    testID={`${node.id}`}
                    {...checkBoxViewStyleProps} />

                {node.children?.length ? (
                    <ExpandCollapseTouchableComponent
                        testID={`expandable_arrow_${node.id}`}
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        <ExpandCollapseIconComponent
                            isExpanded={isExpanded}
                        />
                    </ExpandCollapseTouchableComponent>
                ) : null}
            </View>
        );
    }
    else {
        return (
            <View
                onLayout={onItemLayout ? handleLayout : undefined}
                style={[
                    { opacity: nodeOpacity },
                    dropIndicator ? styles.nodeOverflowVisible : undefined,
                ]}
            >
                {dropIndicator}
                <CustomNodeRowComponent
                    node={node}
                    level={level}
                    checkedValue={value}
                    isExpanded={isExpanded}
                    onCheck={_onCheck}
                    onExpand={_onToggleExpand}
                    isInvalidDropTarget={isDragInvalid}
                    isDropTarget={isDropTarget}
                    dropPosition={nodeDropPosition ?? undefined}
                    isDragging={isDraggingGlobal}
                    isDraggedNode={isBeingDragged}
                    dragHandleProps={touchHandlers}
                />
            </View>
        );
    }
};

function NodeDropIndicator({ position, level, indentationMultiplier, styleProps }: {
    position: DropPosition;
    level: number;
    indentationMultiplier: number;
    styleProps?: DropIndicatorStyleProps;
}) {
    const lineColor = styleProps?.lineColor ?? "#0078FF";
    const lineThickness = styleProps?.lineThickness ?? 3;
    const circleSize = styleProps?.circleSize ?? 10;
    const highlightColor = styleProps?.highlightColor ?? "rgba(0, 120, 255, 0.15)";
    const highlightBorderColor = styleProps?.highlightBorderColor ?? "rgba(0, 120, 255, 0.5)";

    // Indent the line to match the node's nesting level so users can
    // visually distinguish drops at different tree depths.
    const leftOffset = level * indentationMultiplier;

    if (position === "inside") {
        return (
            <View
                pointerEvents="none"
                style={[
                    styles.dropHighlight,
                    {
                        left: leftOffset,
                        backgroundColor: highlightColor,
                        borderColor: highlightBorderColor,
                    },
                ]}
            />
        );
    }

    // Ensure the circle isn't clipped at shallow indent levels
    const safeLeftOffset = Math.max(leftOffset, circleSize / 2);

    return (
        <View
            pointerEvents="none"
            style={[
                styles.dropLineContainer,
                { height: lineThickness, left: safeLeftOffset },
                position === "above" ? styles.dropLineTop : styles.dropLineBottom,
            ]}
        >
            <View style={{
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                backgroundColor: lineColor,
                marginLeft: -(circleSize / 2),
            }} />
            <View style={[
                styles.dropLine,
                {
                    height: lineThickness,
                    backgroundColor: lineColor,
                },
            ]} />
        </View>
    );
}

const styles = StyleSheet.create({
    nodeExpandableArrowTouchable: {
        flex: 1
    },
    nodeCheckboxAndArrowRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: "100%"
    },
    dragContainer: {
        flex: 1,
    },
    // Drop indicator styles (rendered by each node)
    dropHighlight: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 120, 255, 0.15)",
        borderWidth: 2,
        borderColor: "rgba(0, 120, 255, 0.5)",
        borderRadius: 4,
        zIndex: 10,
    },
    dropLineContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        height: 3,
        zIndex: 10,
        overflow: "visible",
    },
    dropLineTop: {
        top: 0,
    },
    dropLineBottom: {
        bottom: 0,
    },
    dropLine: {
        flex: 1,
        height: 3,
        backgroundColor: "#0078FF",
    },
    nodeOverflowVisible: {
        overflow: "visible",
    },
});
