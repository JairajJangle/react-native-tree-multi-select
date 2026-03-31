import {
    MutableRefObject,
    RefObject,
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    Animated,
    PanResponder,
    type PanResponderInstance,
} from "react-native";
import type { FlashList } from "@shopify/flash-list";

import type { __FlattenedTreeNode__, TreeNode } from "../types/treeView.types";
import type { DragEndEvent, DropTarget } from "../types/dragDrop.types";
import { getTreeViewStore } from "../store/treeView.store";
import {
    collapseNodes,
    expandNodes,
    handleToggleExpand,
    initializeNodeMaps,
    recalculateCheckedStates
} from "../helpers";
import { moveTreeNode } from "../helpers/moveTreeNode.helper";

interface UseDragDropParams<ID> {
    storeId: string;
    flattenedNodes: __FlattenedTreeNode__<ID>[];
    flashListRef: RefObject<FlashList<__FlattenedTreeNode__<ID>> | null>;
    containerRef: RefObject<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void; } | null>;
    dragEnabled: boolean;
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    longPressDuration: number;
    autoScrollThreshold: number;
    autoScrollSpeed: number;
    internalDataRef: MutableRefObject<TreeNode<ID>[] | null>;
    measuredItemHeightRef: MutableRefObject<number>;
    dragOverlayOffset: number;
    autoExpandDelay: number;
    /** Pixels per nesting level, used for magnetic overlay shift. */
    indentationMultiplier: number;
}

interface UseDragDropReturn<ID> {
    panResponder: PanResponderInstance;
    overlayY: Animated.Value;
    overlayX: Animated.Value;
    isDragging: boolean;
    draggedNode: __FlattenedTreeNode__<ID> | null;
    dropTarget: DropTarget<ID> | null;
    effectiveDropLevel: number;
    handleNodeTouchStart: (
        nodeId: ID,
        pageY: number,
        locationY: number,
        nodeIndex: number,
    ) => void;
    handleNodeTouchEnd: () => void;
    cancelLongPressTimer: () => void;
    scrollOffsetRef: MutableRefObject<number>;
    headerOffsetRef: MutableRefObject<number>;
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
        indentationMultiplier,
    } = params;

    // --- Refs for mutable state (no stale closures in PanResponder) ---
    const isDraggingRef = useRef(false);
    const draggedNodeRef = useRef<__FlattenedTreeNode__<ID> | null>(null);
    const draggedNodeIdRef = useRef<ID | null>(null);
    const draggedNodeIndexRef = useRef(-1);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const containerPageXRef = useRef(0);
    const containerPageYRef = useRef(0);
    const containerHeightRef = useRef(0);
    const grabOffsetYRef = useRef(0);
    const scrollOffsetRef = useRef(0);
    const headerOffsetRef = useRef(0);
    const itemHeightRef = useRef(36);

    const overlayY = useRef(new Animated.Value(0)).current;
    const overlayX = useRef(new Animated.Value(0)).current;
    const prevEffectiveLevelRef = useRef<number | null>(null);

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

    // Tracks whether the PanResponder has captured the current gesture
    const panResponderActiveRef = useRef(false);

    // Previous drop target for hysteresis (prevents flicker between "below N" / "above N+1")
    const prevDropTargetRef = useRef<{ targetIndex: number; position: "above" | "below" | "inside"; } | null>(null);

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
    const [effectiveDropLevel, setEffectiveDropLevel] = useState(0);

    // Ref mirror of dropTarget - avoids nesting Zustand updates inside React state updaters
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

            container.measureInWindow((x, y, _w, h) => {
                containerPageXRef.current = x;
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

                // Reset magnetic overlay
                overlayX.setValue(0);
                prevEffectiveLevelRef.current = node.level ?? 0;

                // Set React state
                isDraggingRef.current = true;
                autoExpandedDuringDragRef.current.clear();
                setIsDragging(true);
                setDraggedNode(node);
                setEffectiveDropLevel(node.level ?? 0);
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
        (fingerPageY: number, fingerPageX: number) => {
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
            if (positionInItem < 0.15) {
                position = "above";
            } else if (positionInItem > 0.85) {
                position = "below";
            } else {
                position = "inside";
            }

            // --- Horizontal control at level cliffs ---
            // At the boundary between nodes at different depths, the user's
            // horizontal finger position decides the drop level:
            //   finger RIGHT of threshold → stay at deep level (inside parent)
            //   finger LEFT of threshold → switch to shallow level (outside parent)
            // The threshold uses a generous buffer so dragging slightly left is enough.
            const fingerLocalX = fingerPageX - containerPageXRef.current;
            // logicalTargetId/logicalPosition: when the visual indicator node differs
            // from the actual moveTreeNode target (e.g., ancestor at a shallower level).
            let logicalTargetId: ID | null = null;
            let logicalPosition: "above" | "below" | "inside" | null = null;
            let visualDropLevel: number | null = null;

            if (position === "below" || position === "inside") {
                const currentLevel = targetNode.level ?? 0;
                let isCliff = false;
                let shallowLevel = 0;

                if (clampedIndex < nodes.length - 1) {
                    const nextNode = nodes[clampedIndex + 1];
                    const nextLevel = nextNode?.level ?? 0;
                    if (nextNode && nextLevel < currentLevel) {
                        isCliff = true;
                        shallowLevel = nextLevel;
                    }
                } else if (currentLevel > 0) {
                    // Last item in the list - treat as cliff to root level
                    isCliff = true;
                    shallowLevel = 0;
                }

                if (isCliff) {
                    // Generous threshold: midpoint of the two levels + 2× indent buffer
                    const threshold =
                        ((currentLevel + shallowLevel) / 2) * indentationMultiplier
                        + indentationMultiplier * 2;

                    if (fingerLocalX < threshold) {
                        // User wants the shallow level
                        if (clampedIndex < nodes.length - 1) {
                            // Non-last item: switch to "above" on the next (shallower) node
                            const nextNode = nodes[clampedIndex + 1]!;
                            clampedIndex = clampedIndex + 1;
                            targetNode = nextNode;
                            position = "above";
                        } else {
                            // Last item: find ancestor at shallow level, target it with "below"
                            const { childToParentMap } = getTreeViewStore<ID>(storeId).getState();
                            let ancestorId = targetNode.id;
                            let walkLevel = currentLevel;
                            while (walkLevel > shallowLevel) {
                                const parentId = childToParentMap.get(ancestorId);
                                if (parentId === undefined) break;
                                ancestorId = parentId;
                                walkLevel--;
                            }
                            // Visual stays on the last item; logical goes to ancestor
                            logicalTargetId = ancestorId;
                            logicalPosition = "below";
                            visualDropLevel = shallowLevel;
                        }
                    }
                }
            }
            if (position === "above" && clampedIndex > 0) {
                const prevNode = nodes[clampedIndex - 1];
                const prevLevel = prevNode?.level ?? 0;
                const currentLevel = targetNode.level ?? 0;
                if (prevNode && prevLevel > currentLevel) {
                    // Level cliff above - same generous threshold
                    const threshold =
                        ((prevLevel + currentLevel) / 2) * indentationMultiplier
                        + indentationMultiplier * 2;

                    if (fingerLocalX >= threshold) {
                        clampedIndex = clampedIndex - 1;
                        targetNode = prevNode;
                        position = "below";
                    }
                }
            }

            // --- Suppress "below" when it's redundant or confusing ---
            // After horizontal control, any remaining "below" that isn't at a
            // cliff is redundant with "above" on the next node → show "inside".
            if (position === "below") {
                const expandedSet = getTreeViewStore<ID>(storeId).getState().expanded;

                // (a) Expanded parent: "below" visually sits at the parent/child junction
                // but semantically inserts as a sibling after the entire subtree.
                if (targetNode.children?.length && expandedSet.has(targetNode.id)) {
                    position = "inside";
                }
                // (b) No level cliff below: convert to "inside" so the highlight
                // covers the full bottom of the node.
                else if (clampedIndex < nodes.length - 1) {
                    const nextNode = nodes[clampedIndex + 1];
                    if (nextNode && (nextNode.level ?? 0) >= (targetNode.level ?? 0)) {
                        position = "inside";
                    }
                }
            }

            // --- Hysteresis: prevent flicker between "below N" and "above N+1" ---
            // Only applies to same-level boundaries. Level cliffs are handled
            // by horizontal control above, so they pass through without forced resolution.
            const prev = prevDropTargetRef.current;
            if (prev) {
                const sameGap =
                    (prev.position === "below" && position === "above" &&
                        prev.targetIndex === clampedIndex - 1) ||
                    (prev.position === "above" && position === "below" &&
                        clampedIndex === prev.targetIndex - 1);
                if (sameGap) {
                    const upperIdx = Math.min(prev.targetIndex, clampedIndex);
                    const lowerIdx = Math.max(prev.targetIndex, clampedIndex);
                    const upperLevel = nodes[upperIdx]?.level ?? 0;
                    const lowerLevel = nodes[lowerIdx]?.level ?? 0;

                    if (upperLevel === lowerLevel) {
                        // Same level - pure visual hysteresis, keep previous
                        return;
                    }
                    // Level cliff - horizontal control already resolved this,
                    // let the result pass through.
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
                    // New hover target - start timer
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
                // Not hovering inside a collapsed expandable node - cancel timer
                if (autoExpandTargetRef.current !== null) {
                    cancelAutoExpandTimer();
                }
            }

            // --- Magnetic overlay: update the effective level so the overlay
            //     renders its content at the correct indentation natively.
            //     A brief translateX spring provides a smooth transition. ---
            const draggedLevel = draggedNodeRef.current?.level ?? 0;
            // When a logical target overrides the visual (e.g. ancestor at last-item cliff),
            // the effective level comes from the visual drop level, not the target node.
            const effectiveLevel = isValid
                ? (visualDropLevel !== null
                    ? visualDropLevel  // "below" ancestor → sibling at that level
                    : position === "inside"
                        ? (targetNode.level ?? 0) + 1
                        : (targetNode.level ?? 0))
                : draggedLevel;
            if (effectiveLevel !== prevEffectiveLevelRef.current) {
                const prevLevel = prevEffectiveLevelRef.current ?? effectiveLevel;
                prevEffectiveLevelRef.current = effectiveLevel;
                setEffectiveDropLevel(effectiveLevel);

                // The level prop change snaps the content to the correct indent.
                // Counteract that visual jump with an initial translateX offset,
                // then spring to 0 for a smooth "magnetic snap" transition.
                if (prevLevel !== effectiveLevel) {
                    overlayX.setValue(
                        (prevLevel - effectiveLevel) * indentationMultiplier
                    );
                    Animated.spring(overlayX, {
                        toValue: 0,
                        useNativeDriver: true,
                        speed: 40,
                        bounciness: 4,
                    }).start();
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
                store.getState().updateDropTarget(targetNode.id, position, visualDropLevel);
            } else {
                store.getState().updateDropTarget(null, null);
            }

            // Keep ref in sync (used by handleDragEnd to avoid setState-during-render)
            // When a logical target exists (e.g. ancestor at a cliff), use it
            // for the actual move while the visual indicator stays on the current node.
            if (logicalTargetId !== null && logicalPosition !== null) {
                dropTargetRef.current = {
                    ...newTarget,
                    targetNodeId: logicalTargetId,
                    position: logicalPosition,
                };
            } else {
                dropTargetRef.current = newTarget;
            }

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
        [storeId, autoExpandDelay, cancelAutoExpandTimer, indentationMultiplier, overlayX]
    );

    // --- Handle drag end ---
    const handleDragEnd = useCallback(
        (fingerPageY?: number, fingerPageX?: number) => {
            stopAutoScroll();
            cancelLongPressTimer();
            cancelAutoExpandTimer();
            prevDropTargetRef.current = null;

            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;

            // Recalculate drop target at final position if we have coords
            if (fingerPageY !== undefined) {
                calculateDropTarget(fingerPageY, fingerPageX ?? 0);
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

                // Scroll to the dropped node after React processes the expansion,
                // but only if it's outside the visible viewport.  An animated
                // scroll would consume the user's next touch (RN stops the
                // animation on tap), so we skip when the node is already visible.
                setTimeout(() => {
                    const nodes = flattenedNodesRef.current;
                    const idx = nodes.findIndex(n => n.id === droppedNodeId);
                    if (idx < 0) return;

                    const itemH = itemHeightRef.current;
                    const scrollTop = scrollOffsetRef.current;
                    const containerH = containerHeightRef.current;
                    const estimatedTop = idx * itemH;
                    const estimatedBottom = estimatedTop + itemH;

                    // Already in view → no scroll needed
                    if (estimatedTop >= scrollTop && estimatedBottom <= scrollTop + containerH) {
                        return;
                    }

                    flashListRef.current?.scrollToIndex?.({
                        index: idx,
                        animated: true,
                        viewPosition: 0.5,
                    });
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
            overlayX.setValue(0);
            prevEffectiveLevelRef.current = null;
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

    // --- Handle node touch end ---
    // If the PanResponder never captured the gesture (no movement after long
    // press fired), end the drag here so the node doesn't stay "lifted".
    const handleNodeTouchEnd = useCallback(() => {
        cancelLongPressTimer();
        if (isDraggingRef.current && !panResponderActiveRef.current) {
            handleDragEnd();
        }
    }, [cancelLongPressTimer, handleDragEnd]);

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
                panResponderActiveRef.current = true;
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

                // Calculate drop target (horizontal position used at level cliffs)
                calculateDropTarget(fingerPageY, evt.nativeEvent.pageX);

                // Auto-scroll at edges - use delta-based position relative to container
                const fingerInContainer =
                    initialFingerContainerYRef.current +
                    (fingerPageY - initialFingerPageYRef.current);
                updateAutoScroll(fingerInContainer);
            },

            onPanResponderRelease: (evt) => {
                panResponderActiveRef.current = false;
                handleDragEnd(evt.nativeEvent.pageY, evt.nativeEvent.pageX);
            },

            onPanResponderTerminate: () => {
                panResponderActiveRef.current = false;
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
        overlayX,
        isDragging,
        draggedNode,
        dropTarget,
        effectiveDropLevel,
        handleNodeTouchStart,
        handleNodeTouchEnd,
        cancelLongPressTimer,
        scrollOffsetRef,
        headerOffsetRef,
    };
}
