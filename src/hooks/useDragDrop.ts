import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    type PanResponderInstance,
} from "react-native";
import type { FlashList } from "@shopify/flash-list";

import type { __FlattenedTreeNode__, TreeNode } from "../types/treeView.types";
import type { DragEndEvent, DropTarget } from "../types/dragDrop.types";
import { getTreeViewStore } from "../store/treeView.store";
import { collapseNodes, expandNodes, handleToggleExpand, initializeNodeMaps, recalculateCheckedStates } from "../helpers";
import { moveTreeNode } from "../helpers/moveTreeNode.helper";

interface UseDragDropParams<ID> {
    storeId: string;
    flattenedNodes: __FlattenedTreeNode__<ID>[];
    flashListRef: React.RefObject<FlashList<__FlattenedTreeNode__<ID>> | null>;
    containerRef: React.RefObject<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>;
    dragEnabled: boolean;
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    longPressDuration: number;
    autoScrollThreshold: number;
    autoScrollSpeed: number;
    internalDataRef: React.MutableRefObject<TreeNode<ID>[] | null>;
    measuredItemHeightRef: React.MutableRefObject<number>;
    dragOverlayOffset: number;
    autoExpandDelay: number;
}

interface UseDragDropReturn<ID> {
    panResponder: PanResponderInstance;
    overlayY: Animated.Value;
    isDragging: boolean;
    draggedNode: __FlattenedTreeNode__<ID> | null;
    dropTarget: DropTarget<ID> | null;
    handleNodeTouchStart: (
        nodeId: ID,
        pageY: number,
        locationY: number,
        nodeIndex: number,
    ) => void;
    cancelLongPressTimer: () => void;
    scrollOffsetRef: React.MutableRefObject<number>;
    headerOffsetRef: React.MutableRefObject<number>;
}

export function useDragDrop<ID>(
    params: UseDragDropParams<ID>
): UseDragDropReturn<ID> {
    const {
        storeId,
        flattenedNodes,
        flashListRef,
        containerRef,
        dragEnabled,
        onDragEnd,
        longPressDuration,
        autoScrollThreshold,
        autoScrollSpeed,
        internalDataRef,
        measuredItemHeightRef,
        dragOverlayOffset,
        autoExpandDelay,
    } = params;

    // --- Refs for mutable state (no stale closures in PanResponder) ---
    const isDraggingRef = useRef(false);
    const draggedNodeRef = useRef<__FlattenedTreeNode__<ID> | null>(null);
    const draggedNodeIdRef = useRef<ID | null>(null);
    const draggedNodeIndexRef = useRef(-1);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const containerPageYRef = useRef(0);
    const containerHeightRef = useRef(0);
    const grabOffsetYRef = useRef(0);
    const scrollOffsetRef = useRef(0);
    const headerOffsetRef = useRef(0);
    const itemHeightRef = useRef(36);

    const overlayY = useRef(new Animated.Value(0)).current;

    const autoScrollRAFRef = useRef<number | null>(null);
    const autoScrollSpeedRef = useRef(0);

    // Delta-based auto-scroll: avoids unreliable containerPageY
    const initialFingerPageYRef = useRef(0);
    const initialFingerContainerYRef = useRef(0);

    // Auto-expand timer for hovering over collapsed nodes
    const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoExpandTargetRef = useRef<ID | null>(null);
    // Track which nodes were auto-expanded during this drag (to collapse on drag end)
    const autoExpandedDuringDragRef = useRef<Set<ID>>(new Set());

    // Previous drop target for hysteresis (prevents flicker between "below N" / "above N+1")
    const prevDropTargetRef = useRef<{ targetIndex: number; position: "above" | "below" | "inside" } | null>(null);

    // Keep flattenedNodes ref current for PanResponder closures
    const flattenedNodesRef = useRef(flattenedNodes);
    flattenedNodesRef.current = flattenedNodes;

    // Keep callbacks current
    const onDragEndRef = useRef(onDragEnd);
    onDragEndRef.current = onDragEnd;

    // --- React state (triggers re-renders only at drag start/end + indicator changes) ---
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNode, setDraggedNode] = useState<__FlattenedTreeNode__<ID> | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget<ID> | null>(null);

    // Ref mirror of dropTarget — avoids nesting Zustand updates inside React state updaters
    const dropTargetRef = useRef<DropTarget<ID> | null>(null);

    // --- Long press timer ---
    const cancelLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // --- Get all descendant IDs of a node ---
    const getDescendantIds = useCallback(
        (nodeId: ID): Set<ID> => {
            const store = getTreeViewStore<ID>(storeId);
            const { nodeMap } = store.getState();
            const descendants = new Set<ID>();
            const stack: ID[] = [nodeId];

            while (stack.length > 0) {
                const currentId = stack.pop()!;
                const node = nodeMap.get(currentId);
                if (node?.children) {
                    for (const child of node.children) {
                        descendants.add(child.id);
                        stack.push(child.id);
                    }
                }
            }
            return descendants;
        },
        [storeId]
    );

    // --- Initiate drag ---
    const initiateDrag = useCallback(
        (nodeId: ID, pageY: number, locationY: number, nodeIndex: number) => {
            if (!dragEnabled) return;

            const container = containerRef.current;
            if (!container) return;

            container.measureInWindow((_x, y, _w, h) => {
                containerPageYRef.current = y;
                containerHeightRef.current = h;

                // Find the node in flattened list
                const nodes = flattenedNodesRef.current;
                const node = nodes[nodeIndex];
                if (!node) return;

                // Collapse node if expanded
                const store = getTreeViewStore<ID>(storeId);
                const { expanded } = store.getState();
                if (expanded.has(nodeId) && node.children?.length) {
                    handleToggleExpand(storeId, nodeId);
                }

                // Store grab metadata
                grabOffsetYRef.current = locationY;
                draggedNodeRef.current = node;
                draggedNodeIdRef.current = nodeId;
                draggedNodeIndexRef.current = nodeIndex;

                // Use measured item height if available, fall back to estimatedItemSize
                const measured = measuredItemHeightRef.current;
                const estimatedSize =
                    (flashListRef.current as any)?.props?.estimatedItemSize ?? 36;
                itemHeightRef.current = measured > 0 ? measured : estimatedSize;

                // Calculate headerOffset dynamically:
                // fingerLocalY = pageY - containerPageY
                // fingerLocalY = headerOffset + nodeIndex * itemHeight - scrollOffset + grabOffsetY
                // So: headerOffset = fingerLocalY + scrollOffset - grabOffsetY - nodeIndex * itemHeight
                const fingerLocalY = pageY - containerPageYRef.current;
                headerOffsetRef.current =
                    fingerLocalY +
                    scrollOffsetRef.current -
                    locationY -
                    nodeIndex * itemHeightRef.current;

                // Delta-based auto-scroll: compute finger's position in the container
                // from the node's known index (avoids unreliable containerPageY).
                // The FlashList header (padding:5 → ~10px) + nodeIndex * itemHeight - scroll + locationY
                const iH = itemHeightRef.current;
                const listHeaderHeight = 10; // HeaderFooterView has padding: 5 → 10px total
                initialFingerPageYRef.current = pageY;
                initialFingerContainerYRef.current =
                    listHeaderHeight + nodeIndex * iH - scrollOffsetRef.current + locationY;

                // Compute invalid targets (self + descendants)
                const descendants = getDescendantIds(nodeId);
                descendants.add(nodeId);

                // Update store (triggers one re-render of nodes to show greyed-out state)
                store.getState().updateDraggedNodeId(nodeId);
                store.getState().updateInvalidDragTargetIds(descendants);

                // Set overlay initial position (with configurable offset)
                const overlayLocalY = fingerLocalY - locationY + dragOverlayOffset * itemHeightRef.current;
                overlayY.setValue(overlayLocalY);

                // Set React state
                isDraggingRef.current = true;
                autoExpandedDuringDragRef.current.clear();
                setIsDragging(true);
                setDraggedNode(node);
                setDropTarget(null);

                // Start auto-scroll loop
                startAutoScrollLoop();
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            dragEnabled,
            storeId,
            containerRef,
            flashListRef,
            getDescendantIds,
            overlayY,
        ]
    );

    // --- Handle node touch start (long press detection) ---
    const handleNodeTouchStart = useCallback(
        (nodeId: ID, pageY: number, locationY: number, nodeIndex: number) => {
            if (!dragEnabled) return;

            // Cancel any existing timer
            cancelLongPressTimer();

            // Start new timer
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                initiateDrag(nodeId, pageY, locationY, nodeIndex);
            }, longPressDuration);
        },
        [dragEnabled, longPressDuration, cancelLongPressTimer, initiateDrag]
    );

    // --- Auto-scroll ---
    const startAutoScrollLoop = useCallback(() => {
        const loop = () => {
            if (!isDraggingRef.current) return;

            if (autoScrollSpeedRef.current !== 0) {
                const newOffset = Math.max(
                    0,
                    scrollOffsetRef.current + autoScrollSpeedRef.current
                );
                scrollOffsetRef.current = newOffset;
                (flashListRef.current as any)?.scrollToOffset?.({
                    offset: newOffset,
                    animated: false,
                });
            }

            autoScrollRAFRef.current = requestAnimationFrame(loop);
        };
        autoScrollRAFRef.current = requestAnimationFrame(loop);
    }, [flashListRef]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRAFRef.current !== null) {
            cancelAnimationFrame(autoScrollRAFRef.current);
            autoScrollRAFRef.current = null;
        }
        autoScrollSpeedRef.current = 0;
    }, []);

    const updateAutoScroll = useCallback(
        (fingerInContainer: number) => {
            const threshold = autoScrollThreshold;
            const maxSpeed = 8 * autoScrollSpeed;
            const containerH = containerHeightRef.current;

            if (fingerInContainer < threshold) {
                // Scroll up
                const ratio = 1 - Math.max(0, fingerInContainer) / threshold;
                autoScrollSpeedRef.current = -maxSpeed * ratio;
            } else if (fingerInContainer > containerH - threshold) {
                // Scroll down
                const ratio =
                    1 - Math.max(0, containerH - fingerInContainer) / threshold;
                autoScrollSpeedRef.current = maxSpeed * ratio;
            } else {
                autoScrollSpeedRef.current = 0;
            }
        },
        [autoScrollThreshold, autoScrollSpeed]
    );

    // --- Cancel auto-expand timer ---
    const cancelAutoExpandTimer = useCallback(() => {
        if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
        }
        autoExpandTargetRef.current = null;
    }, []);

    // --- Calculate drop target ---
    const calculateDropTarget = useCallback(
        (fingerPageY: number) => {
            const nodes = flattenedNodesRef.current;
            if (nodes.length === 0) return;

            const fingerLocalY =
                fingerPageY - containerPageYRef.current;
            const fingerContentY =
                fingerLocalY + scrollOffsetRef.current;
            const adjustedContentY =
                fingerContentY - headerOffsetRef.current;
            const iH = itemHeightRef.current;

            const rawIndex = Math.floor(adjustedContentY / iH);
            let clampedIndex = Math.max(
                0,
                Math.min(rawIndex, nodes.length - 1)
            );
            let targetNode = nodes[clampedIndex];
            if (!targetNode) return;

            // Determine zone within item
            const positionInItem =
                (adjustedContentY - clampedIndex * iH) / iH;
            let position: "above" | "below" | "inside";
            if (positionInItem < 0.3) {
                position = "above";
            } else if (positionInItem > 0.7) {
                position = "below";
            } else {
                position = "inside";
            }

            // --- Hysteresis: prevent flicker between "below N" and "above N+1" ---
            // These two positions represent the same visual gap between nodes.
            // Keep the previous one to avoid the indicator jumping between nodes.
            const prev = prevDropTargetRef.current;
            if (prev) {
                const sameGap =
                    (prev.position === "below" && position === "above" &&
                        prev.targetIndex === clampedIndex - 1) ||
                    (prev.position === "above" && position === "below" &&
                        clampedIndex === prev.targetIndex - 1);
                if (sameGap) {
                    // Keep previous target — they're at the same visual gap
                    return;
                }
            }
            prevDropTargetRef.current = { targetIndex: clampedIndex, position };

            const indicatorTop = fingerLocalY - grabOffsetYRef.current;

            // Validity check
            const store = getTreeViewStore<ID>(storeId);
            const { invalidDragTargetIds, draggedNodeId, expanded } =
                store.getState();
            const isValid =
                targetNode.id !== draggedNodeId &&
                !invalidDragTargetIds.has(targetNode.id);

            // --- Auto-expand: if hovering "inside" a collapsed expandable node ---
            if (isValid && position === "inside" && targetNode.children?.length && !expanded.has(targetNode.id)) {
                if (autoExpandTargetRef.current !== targetNode.id) {
                    // New hover target — start timer
                    cancelAutoExpandTimer();
                    autoExpandTargetRef.current = targetNode.id;
                    autoExpandTimerRef.current = setTimeout(() => {
                        autoExpandTimerRef.current = null;
                        // Expand the node and track it
                        handleToggleExpand(storeId, targetNode.id);
                        autoExpandedDuringDragRef.current.add(targetNode.id);
                    }, autoExpandDelay);
                }
            } else {
                // Not hovering inside a collapsed expandable node — cancel timer
                if (autoExpandTargetRef.current !== null) {
                    cancelAutoExpandTimer();
                }
            }

            const newTarget: DropTarget<ID> = {
                targetNodeId: targetNode.id,
                targetIndex: clampedIndex,
                position,
                isValid,
                targetLevel: targetNode.level ?? 0,
                indicatorTop,
            };

            // Update the store so each Node can render its own indicator
            if (isValid) {
                store.getState().updateDropTarget(targetNode.id, position);
            } else {
                store.getState().updateDropTarget(null, null);
            }

            // Keep ref in sync (used by handleDragEnd to avoid setState-during-render)
            dropTargetRef.current = newTarget;

            setDropTarget((prevTarget) => {
                if (
                    prevTarget?.targetNodeId === newTarget.targetNodeId &&
                    prevTarget?.position === newTarget.position &&
                    prevTarget?.isValid === newTarget.isValid &&
                    prevTarget?.indicatorTop === newTarget.indicatorTop
                ) {
                    return prevTarget;
                }
                return newTarget;
            });
        },
        [storeId, autoExpandDelay, cancelAutoExpandTimer]
    );

    // --- Handle drag end ---
    const handleDragEnd = useCallback(
        (fingerPageY?: number) => {
            stopAutoScroll();
            cancelLongPressTimer();
            cancelAutoExpandTimer();
            prevDropTargetRef.current = null;

            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;

            // Recalculate drop target at final position if we have a pageY
            if (fingerPageY !== undefined) {
                calculateDropTarget(fingerPageY);
            }

            // Cancel any auto-expand timer that calculateDropTarget may have just started.
            // Without this, the timer fires after drag ends and toggles the target back to collapsed.
            cancelAutoExpandTimer();

            // Read current drop target from ref via a small delay to ensure
            // the last setDropTarget has been processed
            // We use the current dropTarget state via a callback
            // Read drop target from ref (avoids nesting Zustand updates inside React state updaters)
            const currentTarget = dropTargetRef.current;
            const droppedNodeId = draggedNodeIdRef.current;

            if (
                currentTarget?.isValid &&
                droppedNodeId !== null
            ) {
                const store = getTreeViewStore<ID>(storeId);
                const currentData =
                    store.getState().initialTreeViewData;
                const newData = moveTreeNode(
                    currentData,
                    droppedNodeId,
                    currentTarget.targetNodeId,
                    currentTarget.position
                );

                // Update store directly (preserves checked/expanded)
                store
                    .getState()
                    .updateInitialTreeViewData(newData);
                initializeNodeMaps(storeId, newData);

                // Recalculate checked/indeterminate states for all parents
                // since the tree structure changed
                recalculateCheckedStates<ID>(storeId);

                // If dropped "inside" a node, expand it so the dropped node is visible
                if (currentTarget.position === "inside") {
                    expandNodes(storeId, [currentTarget.targetNodeId]);
                }

                // Expand ancestors of the dropped node so it's visible
                expandNodes(storeId, [droppedNodeId], true);

                // Set internal data ref to prevent useDeepCompareEffect
                // from reinitializing
                internalDataRef.current = newData;

                // Notify consumer
                onDragEndRef.current?.({
                    draggedNodeId: droppedNodeId,
                    targetNodeId: currentTarget.targetNodeId,
                    position: currentTarget.position,
                    newTreeData: newData,
                });

                // Scroll to the dropped node after React processes the expansion
                setTimeout(() => {
                    const nodes = flattenedNodesRef.current;
                    const idx = nodes.findIndex(n => n.id === droppedNodeId);
                    if (idx >= 0) {
                        flashListRef.current?.scrollToIndex?.({
                            index: idx,
                            animated: true,
                            viewPosition: 0.5,
                        });
                    }
                }, 100);
            }

            // Collapse auto-expanded nodes that aren't ancestors of the drop target
            if (autoExpandedDuringDragRef.current.size > 0) {
                const store3 = getTreeViewStore<ID>(storeId);
                const { childToParentMap } = store3.getState();

                // Collect ancestors of the drop target (keep these expanded)
                const ancestorIds = new Set<ID>();
                if (currentTarget?.isValid) {
                    let walkId: ID | undefined = currentTarget.targetNodeId;
                    while (walkId !== undefined) {
                        ancestorIds.add(walkId);
                        walkId = childToParentMap.get(walkId);
                    }
                }

                // Collapse auto-expanded nodes that aren't in the ancestor chain
                const toCollapse: ID[] = [];
                for (const nodeId of autoExpandedDuringDragRef.current) {
                    if (!ancestorIds.has(nodeId)) {
                        toCollapse.push(nodeId);
                    }
                }
                if (toCollapse.length > 0) {
                    collapseNodes(storeId, toCollapse);
                }
                autoExpandedDuringDragRef.current.clear();
            }

            // Clear drag state
            const store2 = getTreeViewStore<ID>(storeId);
            store2.getState().updateDraggedNodeId(null);
            store2.getState().updateInvalidDragTargetIds(new Set());
            store2.getState().updateDropTarget(null, null);

            // Reset all refs
            dropTargetRef.current = null;
            draggedNodeRef.current = null;
            draggedNodeIdRef.current = null;
            draggedNodeIndexRef.current = -1;

            setDropTarget(null);
            setIsDragging(false);
            setDraggedNode(null);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            storeId,
            stopAutoScroll,
            cancelLongPressTimer,
            cancelAutoExpandTimer,
            calculateDropTarget,
            internalDataRef,
        ]
    );

    // --- PanResponder ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () =>
                isDraggingRef.current,
            onMoveShouldSetPanResponder: () => isDraggingRef.current,
            onMoveShouldSetPanResponderCapture: () =>
                isDraggingRef.current,

            onPanResponderGrant: () => {
                // Touch captured successfully
            },

            onPanResponderMove: (evt) => {
                if (!isDraggingRef.current) return;

                const fingerPageY = evt.nativeEvent.pageY;
                const fingerLocalY =
                    fingerPageY - containerPageYRef.current;

                // Update overlay position (with configurable offset)
                const overlayLocalY =
                    fingerLocalY - grabOffsetYRef.current + dragOverlayOffset * itemHeightRef.current;
                overlayY.setValue(overlayLocalY);

                // Calculate drop target
                calculateDropTarget(fingerPageY);

                // Auto-scroll at edges — use delta-based position relative to container
                const fingerInContainer =
                    initialFingerContainerYRef.current +
                    (fingerPageY - initialFingerPageYRef.current);
                updateAutoScroll(fingerInContainer);
            },

            onPanResponderRelease: (evt) => {
                handleDragEnd(evt.nativeEvent.pageY);
            },

            onPanResponderTerminate: () => {
                handleDragEnd();
            },
        })
    ).current;

    // --- Cleanup on unmount ---
    useEffect(() => {
        return () => {
            cancelLongPressTimer();
            cancelAutoExpandTimer();
            stopAutoScroll();
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                const store = getTreeViewStore<ID>(storeId);
                store.getState().updateDraggedNodeId(null);
                store.getState().updateInvalidDragTargetIds(new Set());
                store.getState().updateDropTarget(null, null);
            }
        };
    }, [storeId, cancelLongPressTimer, cancelAutoExpandTimer, stopAutoScroll]);

    return {
        panResponder,
        overlayY,
        isDragging,
        draggedNode,
        dropTarget,
        handleNodeTouchStart,
        cancelLongPressTimer,
        scrollOffsetRef,
        headerOffsetRef,
    };
}
