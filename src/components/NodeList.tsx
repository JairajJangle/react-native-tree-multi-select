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
    Platform,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
    type GestureResponderEvent,
    type LayoutChangeEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import type {
    __FlattenedTreeNode__,
    DropIndicatorStyleProps,
    NodeListProps,
    NodeProps,
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
    defaultItemHeight,
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
        dragOverlayOffset = -2,
        overlayYCorrection,
        autoExpandDelay = 800,
        autoExpand = true,
        magneticSnap = true,
        customizations: dragDropCustomizations,
        canDrop: canDropCallback,
        maxDepth,
        canNodeHaveChildren,
        canDrag,
        autoScrollToDroppedNode,
    } = dragAndDrop ?? {};

    // When the dragAndDrop prop is provided, drag is enabled by default on native
    // (iOS/Android). On web it defaults OFF because the PanResponder-based drag is
    // still a work in progress there - consumers can opt in with `enabled: true`.
    const dragEnabled = dragAndDrop
        ? (_dragEnabled ?? Platform.OS !== "web")
        : false;

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
    const measuredItemHeightRef = useRef(0);
    const contentHeightRef = useRef(0);
    // Measured row heights keyed by stable node id (NOT flattened index, which is
    // reused by different nodes across expand/collapse/filter/reorder). Used for
    // accurate drop targeting with variable-height rows when the whole list is
    // rendered. Keying by id means a stale entry can never satisfy the
    // "all current rows measured" gate in useDragDrop.
    const itemHeightsRef = useRef<Map<ID, number>>(new Map());

    const handleItemLayout = useCallback((id: ID, height: number) => {
        if (height > 0) {
            itemHeightsRef.current.set(id, height);
            // First measured height seeds the uniform fallback used while
            // virtualization keeps some rows unmeasured.
            if (measuredItemHeightRef.current === 0) {
                measuredItemHeightRef.current = height;
            }
        }
    }, []);

    // Measured heights of removed nodes would otherwise accumulate forever on
    // dynamic trees; clear on structural change and let rows re-measure on layout.
    useEffect(() => {
        itemHeightsRef.current.clear();
    }, [initialTreeViewData]);

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
        handleNodeTouchStart,
        handleNodeTouchEnd,
        cancelLongPressTimer,
        scrollOffsetRef,
        containerHeightRef,
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
        measuredItemHeightRef,
        contentHeightRef,
        itemHeightsRef,
        dragOverlayOffset,
        overlayYCorrection,
        autoExpandDelay,
        autoExpand,
        magneticSnap,
        indentationMultiplier: effectiveIndentationMultiplier,
        canDrop: canDropCallback,
        maxDepth,
        canNodeHaveChildren,
        canDrag,
        scrollToNodeHandlerRef,
        autoScrollToDroppedNode,
    });

    // Combined onScroll handler
    const handleScroll = useCallback((
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        // During a drag, ALL scrolling is commanded by the auto-scroll RAF loop,
        // which is the sole writer of scrollOffsetRef. Programmatic scrollToOffset
        // still emits scroll events on some platforms; letting those (lagging)
        // events write here would fight the loop's accumulated value and make the
        // offset oscillate - juddering the scroll and flickering the drop target.
        if (!isDragging) {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }
        // Cancel long press timer if user is scrolling
        cancelLongPressTimer();
        // Forward to user's onScroll
        treeFlashListProps?.onScroll?.(event as any);
    }, [isDragging, scrollOffsetRef, cancelLongPressTimer, treeFlashListProps]);

    // Track total content height so auto-scroll during drag can clamp to the
    // scrollable range.
    const handleContentSizeChange = useCallback((width: number, height: number) => {
        contentHeightRef.current = height;
        treeFlashListProps?.onContentSizeChange?.(width, height);
    }, [contentHeightRef, treeFlashListProps]);

    // Keep the container height fresh on resize (orientation change, keyboard, split
    // view) so auto-scroll edge detection and clamping don't go stale mid-session.
    const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
        containerHeightRef.current = e.nativeEvent.layout.height;
    }, [containerHeightRef]);

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

    // Extract FlashList props but exclude onScroll / onContentSizeChange (we provide
    // our own combined handlers that still forward to the user's callbacks)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onScroll: _userOnScroll, onContentSizeChange: _userOnContentSizeChange, ...restFlashListProps } = treeFlashListProps ?? {};

    const flashListElement = (
        <FlashList
            ref={flashListRef}
            // estimatedItemSize is used by FlashList v1; v2 auto-measures and ignores
            // it. Consumers can override via treeFlashListProps (spread below).
            estimatedItemSize={defaultItemHeight}
            initialScrollIndex={initialScrollIndex}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            drawDistance={50}
            ListHeaderComponent={<HeaderFooterView />}
            ListFooterComponent={<HeaderFooterView />}
            {...restFlashListProps}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
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
                    onLayout={handleContainerLayout}
                    {...panResponder.panHandlers}
                >
                    {flashListElement}
                    {isDragging && draggedNode && (
                        <DragOverlay<ID>
                            storeId={storeId}
                            overlayY={overlayY}
                            overlayX={overlayX}
                            node={draggedNode}
                            /* Constant for the whole drag: the level shift toward the
                               drop target is expressed via the overlayX translate, not
                               a re-render (which caused visible indent flicker). */
                            level={draggedNode.level ?? 0}
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

    const handleTouchStart = useCallback((e: GestureResponderEvent) => {
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
    // (including drag opacity) to the custom component - it receives
    // isDraggedNode / isInvalidDropTarget / isDragging props.
    const draggedOpacity = dragDropCustomizations?.draggedNodeOpacity ?? 0.3;
    const invalidOpacity = dragDropCustomizations?.invalidTargetOpacity ?? 0.3;
    const nodeOpacity = CustomNodeRowComponent
        ? 1.0
        : isDraggingGlobal
            ? (isBeingDragged ? draggedOpacity : isDragInvalid ? invalidOpacity : 1.0)
            : 1.0;

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        onItemLayout?.(node.id, e.nativeEvent.layout.height);
    }, [onItemLayout, node.id]);

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
    const highlightBorderWidth = styleProps?.highlightBorderWidth ?? 2;
    const highlightBorderRadius = styleProps?.highlightBorderRadius ?? 4;

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
                        borderWidth: highlightBorderWidth,
                        borderRadius: highlightBorderRadius,
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
