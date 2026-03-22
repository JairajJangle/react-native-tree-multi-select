import React from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import type {
    CheckboxValueType,
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
    getInnerMostChildrenIdsInTree,
    handleToggleExpand,
    toggleCheckboxes
} from "../helpers";
import { CheckboxView } from "./CheckboxView";
import { CustomExpandCollapseIcon } from "./CustomExpandCollapseIcon";
import { DragOverlay } from "./DragOverlay";
import type { DropPosition } from "../types/dragDrop.types";
import { defaultIndentationMultiplier } from "../constants/treeView.constants";
import { useShallow } from "zustand/react/shallow";
import { typedMemo } from "../utils/typedMemo";
import { ScrollToNodeHandler } from "../handlers/ScrollToNodeHandler";
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

        dragEnabled,
        onDragEnd,
        longPressDuration = 400,
        autoScrollThreshold = 60,
        autoScrollSpeed = 1.0,
        dragOverlayOffset = -4,
        autoExpandDelay = 800,
        dragDropCustomizations,
    } = props;

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

    const flashListRef = React.useRef<FlashList<__FlattenedTreeNode__<ID>> | null>(null);
    const containerRef = React.useRef<View>(null);
    const internalDataRef = React.useRef<TreeNode<ID>[] | null>(null);
    const measuredItemHeightRef = React.useRef(0);

    const handleItemLayout = React.useCallback((height: number) => {
        if (measuredItemHeightRef.current === 0 && height > 0) {
            measuredItemHeightRef.current = height;
        }
    }, []);

    const [initialScrollIndex, setInitialScrollIndex] = React.useState<number>(-1);

    // First we filter the tree as per the search term and keys
    const filteredTree = React.useMemo(() => getFilteredTreeData<ID>(
        initialTreeViewData,
        searchText.trim().toLowerCase(),
        searchKeys
    ), [initialTreeViewData, searchText, searchKeys]);

    // Then we flatten the tree to make it "render-compatible" in a "flat" list
    const flattenedFilteredNodes = React.useMemo(() => getFlattenedTreeData<ID>(
        filteredTree,
        expanded,
    ), [filteredTree, expanded]);

    // And update the innermost children id -> required to un/select filtered tree
    React.useEffect(() => {
        const updatedInnerMostChildrenIds = getInnerMostChildrenIdsInTree<ID>(
            filteredTree
        );
        updateInnerMostChildrenIds(updatedInnerMostChildrenIds);
    }, [filteredTree, updateInnerMostChildrenIds]);

    // --- Drag and drop ---
    const {
        panResponder,
        overlayY,
        isDragging,
        draggedNode,
        handleNodeTouchStart,
        cancelLongPressTimer,
        scrollOffsetRef,
    } = useDragDrop<ID>({
        storeId,
        flattenedNodes: flattenedFilteredNodes,
        flashListRef,
        containerRef,
        dragEnabled: dragEnabled ?? false,
        onDragEnd,
        longPressDuration,
        autoScrollThreshold,
        autoScrollSpeed,
        internalDataRef,
        measuredItemHeightRef,
        dragOverlayOffset,
        autoExpandDelay,
    });

    // Combined onScroll handler
    const handleScroll = React.useCallback((
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        // Cancel long press timer if user is scrolling
        cancelLongPressTimer();
        // Forward to user's onScroll
        treeFlashListProps?.onScroll?.(event as any);
    }, [scrollOffsetRef, cancelLongPressTimer, treeFlashListProps]);

    const effectiveIndentationMultiplier = indentationMultiplier ?? defaultIndentationMultiplier;

    const nodeRenderer = React.useCallback((
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
                onNodeTouchEnd={dragEnabled ? cancelLongPressTimer : undefined}
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
        dragDropCustomizations,
        cancelLongPressTimer,
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
            <ScrollToNodeHandler
                ref={scrollToNodeHandlerRef}
                storeId={storeId}
                flashListRef={flashListRef}
                flattenedFilteredNodes={flattenedFilteredNodes}
                setInitialScrollIndex={setInitialScrollIndex}
                initialScrollNodeID={initialScrollNodeID} />

            {dragEnabled ? (
                <View
                    ref={containerRef}
                    style={styles.dragContainer}
                    {...panResponder.panHandlers}
                >
                    {flashListElement}
                    {isDragging && draggedNode && (
                        <DragOverlay<ID>
                            overlayY={overlayY}
                            node={draggedNode}
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
        <View style={styles.defaultHeaderFooter} />
    );
}

function getValue(
    isChecked: boolean,
    isIndeterminate: boolean
): CheckboxValueType {
    if (isIndeterminate) {
        return "indeterminate";
    } else if (isChecked) {
        return true;
    } else {
        return false;
    }
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
    } = useTreeViewStore<ID>(storeId)(useShallow(
        state => ({
            isExpanded: state.expanded.has(node.id),
            value: getValue(
                state.checked.has(node.id),
                state.indeterminate.has(node.id)
            ),
            isBeingDragged: state.draggedNodeId === node.id,
            isDragInvalid: state.invalidDragTargetIds.has(node.id),
            isDropTarget: state.dropTargetNodeId === node.id,
            nodeDropPosition: state.dropTargetNodeId === node.id ? state.dropPosition : null,
        })
    ));

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(storeId, node.id);
    }, [storeId, node.id]);

    const _onCheck = React.useCallback(() => {
        toggleCheckboxes(storeId, [node.id]);
    }, [storeId, node.id]);

    const handleTouchStart = React.useCallback((e: any) => {
        if (!onNodeTouchStart) return;
        const { pageY, locationY } = e.nativeEvent;
        onNodeTouchStart(node.id, pageY, locationY, nodeIndex);
    }, [node.id, nodeIndex, onNodeTouchStart]);

    const handleTouchEnd = React.useCallback(() => {
        onNodeTouchEnd?.();
    }, [onNodeTouchEnd]);

    // Determine opacity for drag state
    const dragOpacity = dragDropCustomizations?.draggedNodeOpacity ?? 0.3;
    const nodeOpacity = (isDraggingGlobal && (isBeingDragged || isDragInvalid))
        ? dragOpacity
        : 1.0;

    const handleLayout = React.useCallback((e: any) => {
        onItemLayout?.(e.nativeEvent.layout.height);
    }, [onItemLayout]);

    const touchHandlers = dragEnabled ? {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd,
    } : undefined;

    const CustomDropIndicator = dragDropCustomizations?.CustomDropIndicatorComponent;
    const dropIndicator = isDropTarget && nodeDropPosition ? (
        CustomDropIndicator
            ? <CustomDropIndicator position={nodeDropPosition} />
            : <NodeDropIndicator position={nodeDropPosition} styleProps={dragDropCustomizations?.dropIndicatorStyleProps} />
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
                {...touchHandlers}
                onLayout={onItemLayout ? handleLayout : undefined}
                style={{ opacity: nodeOpacity }}
            >
                {dropIndicator}
                <CustomNodeRowComponent
                    node={node}
                    level={level}
                    checkedValue={value}
                    isExpanded={isExpanded}
                    onCheck={_onCheck}
                    onExpand={_onToggleExpand}
                    isDragTarget={isDragInvalid}
                    isDragging={isDraggingGlobal}
                    isDraggedNode={isBeingDragged}
                />
            </View>
        );
    }
};

function NodeDropIndicator({ position, styleProps }: {
    position: DropPosition;
    styleProps?: DropIndicatorStyleProps;
}) {
    const lineColor = styleProps?.lineColor ?? "#0078FF";
    const lineThickness = styleProps?.lineThickness ?? 3;
    const circleSize = styleProps?.circleSize ?? 10;
    const highlightColor = styleProps?.highlightColor ?? "rgba(0, 120, 255, 0.15)";
    const highlightBorderColor = styleProps?.highlightBorderColor ?? "rgba(0, 120, 255, 0.5)";

    if (position === "inside") {
        return (
            <View
                pointerEvents="none"
                style={[
                    styles.dropHighlight,
                    {
                        backgroundColor: highlightColor,
                        borderColor: highlightBorderColor,
                    },
                ]}
            />
        );
    }

    return (
        <View
            pointerEvents="none"
            style={[
                styles.dropLineContainer,
                { height: lineThickness },
                position === "above" ? styles.dropLineTop : styles.dropLineBottom,
            ]}
        >
            <View style={[
                styles.dropLineCircle,
                {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                    backgroundColor: lineColor,
                    marginLeft: -(circleSize / 2),
                    marginTop: -(circleSize / 2 - lineThickness / 2),
                },
            ]} />
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
    defaultHeaderFooter: {
        padding: 5
    },
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
    },
    dropLineTop: {
        top: 0,
    },
    dropLineBottom: {
        bottom: 0,
    },
    dropLineCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#0078FF",
        marginLeft: -5,
        marginTop: -4,
    },
    dropLine: {
        flex: 1,
        height: 3,
        backgroundColor: "#0078FF",
    },
});
