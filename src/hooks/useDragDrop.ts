import {
    MutableRefObject,
    RefObject,
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    AccessibilityInfo,
    Animated,
    PanResponder,
    Platform,
    type PanResponderInstance,
} from "react-native";
import type { FlashList } from "@shopify/flash-list";

import type { __FlattenedTreeNode__, TreeNode, DropAutoScrollOptions } from "../types/treeView.types";
import type { ScrollToNodeHandlerRef } from "./useScrollToNode";
import type { DragCancelEvent, DragEndEvent, DragStartEvent, DropPosition, DropTarget } from "../types/dragDrop.types";
import { getTreeViewStore } from "../store/treeView.store";
import {
    collapseNodes,
    expandNodes,
    getSubtreeDepthFromMap,
    handleToggleExpand,
    initializeNodeMaps,
    recalculateCheckedStates
} from "../helpers";
import { findNodePosition, moveTreeNode } from "../helpers/moveTreeNode.helper";
import { defaultItemHeight, listHeaderFooterPadding } from "../constants/treeView.constants";

// Android reports touch `locationY` slightly differently from iOS, which makes the
// drag overlay sit ~2 item-heights closer to the finger. This empirical correction
// (in item-height units, added to dragOverlayOffset) compensates for that. Consumers
// can override it per-instance via DragAndDropOptions.overlayYCorrection.
const DEFAULT_OVERLAY_Y_CORRECTION = Platform.OS === "android" ? -2 : 0;

// Auto-scroll speed at the very edge in px/SECOND, before the proximity ramp
// and the consumer's `autoScrollSpeed` multiplier are applied. Time-based (not
// px/frame) so 60Hz and 120Hz displays scroll at the same real-world speed.
const MAX_AUTO_SCROLL_SPEED = 1200;
// Exponent on the edge-proximity ramp (0..1). Below 1 the speed climbs quickly
// even for a shallow entry into the threshold zone, so scrolling stays fast when
// the screen edge stops the finger before it reaches the very edge of the list.
const AUTO_SCROLL_RAMP_EXPONENT = 0.5;
// During auto-scroll, recompute the drop target at most this often. Every scroll
// frame moves rows under the finger, but recomputing per frame costs store
// writes + node re-renders on the JS thread (stuttering the scroll itself), and
// ~10 indicator updates/sec reads calmer than 60 anyway.
const AUTO_SCROLL_RECALC_INTERVAL_MS = 100;
// How long (ms) a candidate drop level must hold before the overlay springs to
// its indentation. Prevents the indent from chasing every row the finger merely
// passes through while dragging vertically.
const LEVEL_SETTLE_MS = 120;

interface UseDragDropParams<ID> {
    storeId: string;
    flattenedNodes: __FlattenedTreeNode__<ID>[];
    flashListRef: RefObject<FlashList<__FlattenedTreeNode__<ID>> | null>;
    containerRef: RefObject<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void; } | null>;
    dragEnabled: boolean;
    onDragStart?: (event: DragStartEvent<ID>) => void;
    onDragEnd?: (event: DragEndEvent<ID>) => void;
    onDragCancel?: (event: DragCancelEvent<ID>) => void;
    longPressDuration: number;
    autoScrollThreshold: number;
    autoScrollSpeed: number;
    measuredItemHeightRef: MutableRefObject<number>;
    /** Live total content height of the list (from FlashList onContentSizeChange),
     *  used to clamp auto-scroll so the offset never runs past the end of the list. */
    contentHeightRef: MutableRefObject<number>;
    /** Measured row heights keyed by stable node id. Enables accurate drop
     *  targeting for variable-height rows when the whole list is rendered. */
    itemHeightsRef: MutableRefObject<Map<ID, number>>;
    dragOverlayOffset: number;
    /** Optional override (item-height units) for the platform overlay-Y correction. */
    overlayYCorrection?: number;
    autoExpandDelay: number;
    /** Whether hovering "inside" a collapsed node auto-expands it. Default: true. */
    autoExpand?: boolean;
    /** Whether the overlay springs ("magnetic snap") when the drop level changes. Default: true. */
    magneticSnap?: boolean;
    /** Pixels per nesting level, used for magnetic overlay shift. */
    indentationMultiplier: number;
    /** Callback to determine if a drop is allowed on a specific target. */
    canDrop?: (draggedNode: TreeNode<ID>, targetNode: TreeNode<ID>, position: DropPosition) => boolean;
    /** Maximum nesting depth allowed. */
    maxDepth?: number;
    /** Callback to determine if a node can accept children. */
    canNodeHaveChildren?: (node: TreeNode<ID>) => boolean;
    /** Ref for scrolling to a node after drop. */
    scrollToNodeHandlerRef: RefObject<ScrollToNodeHandlerRef<ID> | null>;
    /** Auto-scroll configuration for after drop. */
    autoScrollToDroppedNode?: boolean | DropAutoScrollOptions;
    /** Callback to determine if a node can be dragged. */
    canDrag?: (node: TreeNode<ID>) => boolean;
}

interface UseDragDropReturn<ID> {
    panResponder: PanResponderInstance;
    overlayY: Animated.Value;
    overlayX: Animated.Value;
    isDragging: boolean;
    draggedNode: __FlattenedTreeNode__<ID> | null;
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
    /** Live container height; kept fresh via the container's onLayout so the
     *  auto-scroll edge/clamp math survives a mid-session resize. */
    containerHeightRef: MutableRefObject<number>;
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
        autoExpand = true,
        magneticSnap = true,
        indentationMultiplier,
        canDrop: canDropCallback,
        maxDepth,
        canNodeHaveChildren,
        canDrag,
        scrollToNodeHandlerRef,
        autoScrollToDroppedNode,
    } = params;

    // --- Refs for mutable state (no stale closures in PanResponder) ---
    const isDraggingRef = useRef(false);
    const draggedNodeRef = useRef<__FlattenedTreeNode__<ID> | null>(null);
    const draggedNodeIdRef = useRef<ID | null>(null);
    // Whether the dragged node was expanded before drag start force-collapsed it,
    // so a cancelled drag can restore the expansion (a cancel must not mutate state).
    const wasDraggedNodeExpandedRef = useRef(false);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const containerPageXRef = useRef(0);
    const containerPageYRef = useRef(0);
    const containerWidthRef = useRef(0);
    const containerHeightRef = useRef(0);
    const grabOffsetYRef = useRef(0);
    const scrollOffsetRef = useRef(0);
    const headerOffsetRef = useRef(0);
    const itemHeightRef = useRef(defaultItemHeight);

    const overlayY = useRef(new Animated.Value(0)).current;
    const overlayX = useRef(new Animated.Value(0)).current;
    const prevEffectiveLevelRef = useRef<number | null>(null);
    // Settle-debounce for the overlay indent: candidate level + the timer that
    // springs the overlay to it once it has held for LEVEL_SETTLE_MS.
    const pendingLevelRef = useRef<number | null>(null);
    const levelSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const autoScrollRAFRef = useRef<number | null>(null);
    const autoScrollSpeedRef = useRef(0);

    // Delta-based auto-scroll: avoids unreliable containerPageY
    const initialFingerPageYRef = useRef(0);
    const initialFingerContainerYRef = useRef(0);

    // Last known finger position, so the auto-scroll loop can recompute the drop
    // target for a stationary finger while rows scroll underneath it.
    const lastFingerPageYRef = useRef(0);
    const lastFingerPageXRef = useRef(0);
    // calculateDropTarget is defined below startAutoScrollLoop; the RAF loop reads
    // it through this ref to avoid a use-before-declaration in the dep array.
    const calculateDropTargetRef = useRef<(fingerPageY: number, fingerPageX: number) => void>(() => { });

    // Caches the "every current row is measured" gate so calculateDropTarget
    // doesn't scan the full flattened list on every pan frame. Invalidated when
    // the flattened list identity or the measured-heights count changes.
    const allHeightsMeasuredRef = useRef<{
        nodes: unknown;
        size: number;
        value: boolean;
    } | null>(null);

    // Auto-expand timer for hovering over collapsed nodes
    const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoExpandTargetRef = useRef<ID | null>(null);
    // Track which nodes were auto-expanded during this drag (to collapse on drag end)
    const autoExpandedDuringDragRef = useRef<Set<ID>>(new Set());

    // Tracks whether the PanResponder has captured the current gesture
    const panResponderActiveRef = useRef(false);

    // True between the long-press firing and the async measureInWindow callback
    // resolving. Lets a finger-lift in that window abort the pending drag so the
    // node is never left "lifted" with no finger down.
    const pendingDragRef = useRef(false);

    // Previous drop target for hysteresis (prevents flicker between "below N" / "above N+1")
    const prevDropTargetRef = useRef<{ targetIndex: number; position: DropPosition; } | null>(null);

    // Depth of the dragged subtree (computed once at drag start, used for maxDepth check)
    const draggedSubtreeDepthRef = useRef(0);

    // Keep flattenedNodes ref current for PanResponder closures
    const flattenedNodesRef = useRef(flattenedNodes);
    flattenedNodesRef.current = flattenedNodes;

    // Keep callbacks current
    const onDragStartRef = useRef(onDragStart);
    onDragStartRef.current = onDragStart;
    const onDragEndRef = useRef(onDragEnd);
    onDragEndRef.current = onDragEnd;
    const onDragCancelRef = useRef(onDragCancel);
    onDragCancelRef.current = onDragCancel;
    const canDropRef = useRef(canDropCallback);
    canDropRef.current = canDropCallback;
    const canNodeHaveChildrenRef = useRef(canNodeHaveChildren);
    canNodeHaveChildrenRef.current = canNodeHaveChildren;
    const canDragRef = useRef(canDrag);
    canDragRef.current = canDrag;

    // Keep config values current for PanResponder closures
    const dragOverlayOffsetRef = useRef(dragOverlayOffset);
    dragOverlayOffsetRef.current = dragOverlayOffset;
    const overlayYCorrectionRef = useRef(overlayYCorrection ?? DEFAULT_OVERLAY_Y_CORRECTION);
    overlayYCorrectionRef.current = overlayYCorrection ?? DEFAULT_OVERLAY_Y_CORRECTION;
    const autoScrollThresholdRef = useRef(autoScrollThreshold);
    autoScrollThresholdRef.current = autoScrollThreshold;
    const autoScrollSpeedParamRef = useRef(autoScrollSpeed);
    autoScrollSpeedParamRef.current = autoScrollSpeed;
    const autoExpandDelayRef = useRef(autoExpandDelay);
    autoExpandDelayRef.current = autoExpandDelay;
    const autoExpandRef = useRef(autoExpand);
    autoExpandRef.current = autoExpand;
    const magneticSnapRef = useRef(magneticSnap);
    magneticSnapRef.current = magneticSnap;
    const indentationMultiplierRef = useRef(indentationMultiplier);
    indentationMultiplierRef.current = indentationMultiplier;
    const maxDepthRef = useRef(maxDepth);
    maxDepthRef.current = maxDepth;

    // --- React state (triggers re-renders only at drag start/end + level changes) ---
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNode, setDraggedNode] = useState<__FlattenedTreeNode__<ID> | null>(null);

    // The current drop target lives only in a ref (read by handleDragEnd at commit
    // time). It is deliberately NOT React state: calculateDropTarget runs every pan
    // frame, so a per-frame setState would re-render the whole list for nothing -
    // the per-node drop indicator is driven by the store fields (dropTargetNodeId /
    // dropPosition / dropLevel), which are throttled via lastStoreDropTargetRef.
    const dropTargetRef = useRef<DropTarget<ID> | null>(null);

    // Last value written to the store's drop target. Guards the per-frame Zustand
    // write so updateDropTarget only fires when the indicator actually changes
    // (otherwise every mounted Node's selector would re-run on every pan frame).
    const lastStoreDropTargetRef = useRef<{
        nodeId: ID | null;
        position: DropPosition | null;
        level: number | null;
    } | null>(null);

    // --- Long press timer ---
    const cancelLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // Also abort a drag still awaiting its async measureInWindow callback. This
        // makes scrolling (which cancels the long-press) during that window abort the
        // drag cleanly, instead of letting it start later with stale finger coords.
        pendingDragRef.current = false;
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

    // --- Get the maximum depth of a subtree (0 for leaf nodes) ---
    const getSubtreeDepth = useCallback(
        (nodeId: ID): number => {
            const { nodeMap } = getTreeViewStore<ID>(storeId).getState();
            return getSubtreeDepthFromMap(nodeMap, nodeId);
        },
        [storeId]
    );

    // --- Initiate drag ---
    const initiateDrag = useCallback(
        (nodeId: ID, pageY: number, locationY: number, nodeIndex: number) => {
            if (!dragEnabled) return;
            // Never start a second drag on top of one already running or pending
            // (e.g. a competing long-press from a second finger).
            if (isDraggingRef.current || pendingDragRef.current) return;

            const container = containerRef.current;
            if (!container) return;

            pendingDragRef.current = true;
            container.measureInWindow((x, y, w, h) => {
                // Finger lifted (or drag cancelled) before the measurement resolved -
                // abort so we don't strand a drag with no finger down.
                if (!pendingDragRef.current) return;
                pendingDragRef.current = false;

                containerPageXRef.current = x;
                containerPageYRef.current = y;
                containerWidthRef.current = w;
                containerHeightRef.current = h;

                // Find the node in flattened list
                const nodes = flattenedNodesRef.current;
                const node = nodes[nodeIndex];
                if (!node) return;

                // Collapse node if expanded (restored if the drag is cancelled)
                const store = getTreeViewStore<ID>(storeId);
                const { expanded } = store.getState();
                wasDraggedNodeExpandedRef.current = false;
                if (expanded.has(nodeId) && node.children?.length) {
                    handleToggleExpand(storeId, nodeId);
                    wasDraggedNodeExpandedRef.current = true;
                }

                // Store grab metadata
                grabOffsetYRef.current = locationY;
                draggedNodeRef.current = node;
                draggedNodeIdRef.current = nodeId;
                draggedSubtreeDepthRef.current = getSubtreeDepth(nodeId);

                // Use measured item height if available, fall back to default
                const measured = measuredItemHeightRef.current;
                itemHeightRef.current = measured > 0 ? measured : defaultItemHeight;

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
                const iH = itemHeightRef.current;
                const listHeaderHeight = listHeaderFooterPadding * 2;
                initialFingerPageYRef.current = pageY;
                lastFingerPageYRef.current = pageY;
                initialFingerContainerYRef.current =
                    listHeaderHeight + nodeIndex * iH - scrollOffsetRef.current + locationY;

                // Compute invalid targets (self + descendants)
                const descendants = getDescendantIds(nodeId);
                descendants.add(nodeId);

                // Update store (triggers one re-render of nodes to show greyed-out state)
                store.getState().updateDraggedNodeId(nodeId);
                store.getState().updateInvalidDragTargetIds(descendants);

                // Set overlay initial position (with configurable offset)
                const overlayLocalY = fingerLocalY - locationY + (dragOverlayOffsetRef.current + overlayYCorrectionRef.current) * itemHeightRef.current;
                overlayY.setValue(overlayLocalY);

                // Reset magnetic overlay
                overlayX.setValue(0);
                prevEffectiveLevelRef.current = node.level ?? 0;
                pendingLevelRef.current = null;
                if (levelSettleTimerRef.current) {
                    clearTimeout(levelSettleTimerRef.current);
                    levelSettleTimerRef.current = null;
                }

                // Set React state
                isDraggingRef.current = true;
                autoExpandedDuringDragRef.current.clear();
                setIsDragging(true);
                setDraggedNode(node);

                // Notify consumer that drag has started
                onDragStartRef.current?.({ draggedNodeId: nodeId });

                // Announce for screen readers (no-op when no assistive tech is active).
                AccessibilityInfo.announceForAccessibility?.(`Picked up ${node.name}`);

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
            getSubtreeDepth,
            overlayY,
        ]
    );

    // --- Handle node touch start (long press detection) ---
    const handleNodeTouchStart = useCallback(
        (nodeId: ID, pageY: number, locationY: number, nodeIndex: number) => {
            if (!dragEnabled) return;
            // Ignore touches that land while a drag is already running or pending.
            // Without this, a second finger on another row could arm a competing
            // long-press that overwrites the in-flight drag's state.
            if (isDraggingRef.current || pendingDragRef.current) return;

            // Drag is disabled while a search filter is active: drop targets are
            // computed against the filtered list but the move applies to the full
            // tree, so a drop could land next to siblings hidden by the filter.
            if (getTreeViewStore<ID>(storeId).getState().searchText) return;

            // Check if this node can be dragged
            if (canDragRef.current) {
                const node = flattenedNodesRef.current[nodeIndex];
                if (node && !canDragRef.current(node)) return;
            }

            // Cancel any existing timer
            cancelLongPressTimer();

            // Start new timer
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                initiateDrag(nodeId, pageY, locationY, nodeIndex);
            }, longPressDuration);
        },
        [dragEnabled, storeId, longPressDuration, cancelLongPressTimer, initiateDrag]
    );

    // --- Auto-scroll ---
    const startAutoScrollLoop = useCallback(() => {
        // Idempotent: cancel any loop already in flight so a re-entry can never
        // orphan a RAF handle (which would run a second, untracked scroll loop).
        if (autoScrollRAFRef.current !== null) {
            cancelAnimationFrame(autoScrollRAFRef.current);
            autoScrollRAFRef.current = null;
        }
        // Time-based stepping: RAF cadence varies with display refresh rate, so
        // distance is derived from elapsed time, not frame count.
        let lastTs: number | null = null;
        let lastRecalcTs = 0;
        const loop = (ts?: number) => {
            if (!isDraggingRef.current) return;

            // Jest's RAF mock invokes the callback without a timestamp.
            const now = typeof ts === "number" ? ts : Date.now();
            // First frame establishes the baseline; cap dt so a long hiccup
            // (background frame drop) can't produce one huge scroll jump.
            const dtMs = lastTs === null ? 0 : Math.min(now - lastTs, 64);
            lastTs = now;

            if (autoScrollSpeedRef.current !== 0 && dtMs > 0) {
                // Clamp to the scrollable range so dragging at the bottom edge can't
                // grow the offset past the end (which would corrupt drop-index math).
                // Leave the upper bound open until the content height is measured.
                const contentH = contentHeightRef.current;
                const maxOffset = contentH > 0
                    ? Math.max(0, contentH - containerHeightRef.current)
                    : Number.POSITIVE_INFINITY;
                const newOffset = Math.min(
                    maxOffset,
                    Math.max(0, scrollOffsetRef.current
                        + (autoScrollSpeedRef.current * dtMs) / 1000)
                );

                // Pinned at a boundary: nothing moved, so skip the scroll command
                // and the drop-target recompute entirely.
                if (newOffset !== scrollOffsetRef.current) {
                    // The RAF loop is the sole writer of scrollOffsetRef during a
                    // drag (NodeList's onScroll stands down) - the accumulated value
                    // is the commanded position and the native list converges to it.
                    scrollOffsetRef.current = newOffset;
                    flashListRef.current?.scrollToOffset?.({
                        offset: newOffset,
                        animated: false,
                    });

                    // Rows are moving under a (possibly stationary) finger; recompute
                    // the drop target so the indicator tracks the auto-scroll instead
                    // of staying frozen on the last row the finger moved over.
                    // Time-throttled - see AUTO_SCROLL_RECALC_INTERVAL_MS.
                    if (now - lastRecalcTs >= AUTO_SCROLL_RECALC_INTERVAL_MS) {
                        lastRecalcTs = now;
                        calculateDropTargetRef.current(
                            lastFingerPageYRef.current,
                            lastFingerPageXRef.current
                        );
                    }
                }
            }

            autoScrollRAFRef.current = requestAnimationFrame(loop);
        };
        autoScrollRAFRef.current = requestAnimationFrame(loop);
    }, [flashListRef, contentHeightRef]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRAFRef.current !== null) {
            cancelAnimationFrame(autoScrollRAFRef.current);
            autoScrollRAFRef.current = null;
        }
        autoScrollSpeedRef.current = 0;
    }, []);

    const updateAutoScroll = useCallback(
        (fingerInContainer: number) => {
            const threshold = autoScrollThresholdRef.current;
            // px/second; the RAF loop converts to distance via elapsed time.
            const maxSpeed = MAX_AUTO_SCROLL_SPEED * autoScrollSpeedParamRef.current;
            const containerH = containerHeightRef.current;

            // Ease the proximity ramp so speed builds up fast as the finger nears
            // the edge, rather than climbing purely linearly.
            if (fingerInContainer < threshold) {
                // Scroll up
                const ratio = 1 - Math.max(0, fingerInContainer) / threshold;
                autoScrollSpeedRef.current = -maxSpeed * Math.pow(ratio, AUTO_SCROLL_RAMP_EXPONENT);
            } else if (fingerInContainer > containerH - threshold) {
                // Scroll down
                const ratio =
                    1 - Math.max(0, containerH - fingerInContainer) / threshold;
                autoScrollSpeedRef.current = maxSpeed * Math.pow(ratio, AUTO_SCROLL_RAMP_EXPONENT);
            } else {
                autoScrollSpeedRef.current = 0;
            }
        },
        []
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

            // Single store snapshot per frame (the store can't change within this
            // synchronous pass) - avoids re-reading getState() several times.
            const store = getTreeViewStore<ID>(storeId);
            const {
                childToParentMap,
                expanded,
                invalidDragTargetIds,
                draggedNodeId,
                nodeMap,
            } = store.getState();

            const fingerLocalY =
                fingerPageY - containerPageYRef.current;
            const fingerContentY =
                fingerLocalY + scrollOffsetRef.current;
            const adjustedContentY =
                fingerContentY - headerOffsetRef.current;
            const iH = itemHeightRef.current;

            // Resolve which row the finger is over. Uniform math (O(1)) is used
            // unless every CURRENT row has been measured (small, fully-rendered
            // lists), in which case a cumulative walk supports variable row heights.
            // The gate checks per-node-id coverage (not map size) so stale heights
            // left by a previous, longer list can never satisfy it. FlashList
            // virtualization can't measure off-screen rows, so large lists fall back
            // to the uniform estimate.
            const heights = itemHeightsRef.current;
            // The full-list scan is cached per (flattened list identity, measured
            // count) so it doesn't run on every pan frame.
            const cachedGate = allHeightsMeasuredRef.current;
            let allMeasured: boolean;
            if (cachedGate && cachedGate.nodes === nodes && cachedGate.size === heights.size) {
                allMeasured = cachedGate.value;
            } else {
                allMeasured = nodes.every((n) => heights.has(n.id));
                allHeightsMeasuredRef.current = { nodes, size: heights.size, value: allMeasured };
            }
            let clampedIndex: number;
            let itemTop: number;
            let itemHeight: number;
            if (allMeasured) {
                let top = 0;
                let idx = 0;
                while (idx < nodes.length - 1) {
                    const h = heights.get(nodes[idx]!.id) ?? iH;
                    if (adjustedContentY < top + h) break;
                    top += h;
                    idx++;
                }
                clampedIndex = idx;
                itemTop = top;
                itemHeight = heights.get(nodes[idx]!.id) ?? iH;
            } else {
                const rawIndex = Math.floor(adjustedContentY / iH);
                clampedIndex = Math.max(0, Math.min(rawIndex, nodes.length - 1));
                itemTop = clampedIndex * iH;
                itemHeight = iH;
            }
            let targetNode = nodes[clampedIndex];
            if (!targetNode) return;

            // Determine zone within item
            const positionInItem =
                (adjustedContentY - itemTop) / itemHeight;
            let position: DropPosition;
            if (positionInItem < 0.25) {
                position = "above";
            } else if (positionInItem > 0.75) {
                position = "below";
            } else {
                position = "inside";
            }

            // --- Determine if "inside" drop is allowed for this target ---
            const canDropInsideTarget = (() => {
                // canNodeHaveChildren: structural constraint
                if (canNodeHaveChildrenRef.current && !canNodeHaveChildrenRef.current(targetNode)) {
                    return false;
                }
                // maxDepth: the dragged subtree at (targetLevel + 1) must not exceed maxDepth
                if (maxDepthRef.current !== undefined) {
                    const targetLevel = targetNode.level ?? 0;
                    const deepest = targetLevel + 1 + draggedSubtreeDepthRef.current;
                    if (deepest > maxDepthRef.current) return false;
                }
                return true;
            })();

            // If "inside" is not allowed, convert to nearest zone
            if (position === "inside" && !canDropInsideTarget) {
                position = positionInItem < 0.5 ? "above" : "below";
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
            let logicalPosition: DropPosition | null = null;
            let visualDropLevel: number | null = null;

            if (position === "below") {
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
                    // Midpoint of the item's visible content area
                    const itemLeftEdge = currentLevel * indentationMultiplierRef.current;
                    const threshold = itemLeftEdge + (containerWidthRef.current - itemLeftEdge) * 0.3;

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
                    const itemLeftEdge = prevLevel * indentationMultiplierRef.current;
                    const threshold = itemLeftEdge + (containerWidthRef.current - itemLeftEdge) * 0.3;

                    if (fingerLocalX >= threshold) {
                        clampedIndex = clampedIndex - 1;
                        targetNode = prevNode;
                        position = "below";
                    }
                }
            }

            // --- Suppress "below" when it's semantically confusing ---
            // For expanded parents, "below" visually sits at the parent/child
            // junction but semantically inserts as a sibling after the entire
            // subtree. Convert to "inside" which is clearer.
            if (position === "below" && canDropInsideTarget) {
                if (targetNode.children?.length && expanded.has(targetNode.id)) {
                    position = "inside";
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

            // Validity check (store snapshot taken once at the top of this frame).
            // The actual move uses the LOGICAL target when a cliff override is active
            // (the visual indicator stays on targetNode). Validate canDrop / maxDepth /
            // invalid-target against this effective target so consumer rules can't be
            // bypassed by the visual/logical split at level cliffs.
            const effectiveTargetId = logicalTargetId ?? targetNode.id;
            const effectivePosition = logicalPosition ?? position;
            const effectiveTargetNode =
                logicalTargetId !== null
                    ? (nodeMap.get(effectiveTargetId) ?? targetNode)
                    : targetNode;

            // maxDepth check for above/below (sibling) positions
            let maxDepthValid = true;
            if (maxDepthRef.current !== undefined && (effectivePosition === "above" || effectivePosition === "below")) {
                // At a cliff the sibling lands at visualDropLevel; otherwise the
                // effective target's own level.
                const targetLevel = visualDropLevel ?? (effectiveTargetNode.level ?? 0);
                const deepest = targetLevel + draggedSubtreeDepthRef.current;
                if (deepest > maxDepthRef.current) maxDepthValid = false;
            }

            const isValid =
                effectiveTargetId !== draggedNodeId &&
                !invalidDragTargetIds.has(effectiveTargetId) &&
                maxDepthValid &&
                (!canDropRef.current || canDropRef.current(
                    draggedNodeRef.current!,
                    effectiveTargetNode,
                    effectivePosition
                ));

            // --- Auto-expand: if hovering "inside" a collapsed expandable node ---
            if (autoExpandRef.current && isValid && position === "inside" && targetNode.children?.length && !expanded.has(targetNode.id)) {
                if (autoExpandTargetRef.current !== targetNode.id) {
                    // New hover target - start timer
                    cancelAutoExpandTimer();
                    autoExpandTargetRef.current = targetNode.id;
                    autoExpandTimerRef.current = setTimeout(() => {
                        autoExpandTimerRef.current = null;
                        // Expand the node and track it
                        expandNodes(storeId, [targetNode.id]);
                        autoExpandedDuringDragRef.current.add(targetNode.id);
                    }, autoExpandDelayRef.current);
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
            // The overlay's content keeps the dragged node's original indentation
            // for the whole drag (no re-render); the indent shift is expressed
            // purely as a translateX toward the effective level. Springs retarget
            // mid-flight, so rapid level changes glide instead of jumping - the
            // old scheme (re-render padding + counteracting spring-to-0) split the
            // move across React and the native driver and flickered when the two
            // landed on different frames.
            // A new level must additionally hold for LEVEL_SETTLE_MS before the
            // overlay moves, so the indent doesn't chase every row the finger
            // merely passes through.
            const applyLevel = (nextLevel: number) => {
                prevEffectiveLevelRef.current = nextLevel;
                const targetX =
                    (nextLevel - (draggedNodeRef.current?.level ?? 0)) *
                    indentationMultiplierRef.current;
                if (magneticSnapRef.current) {
                    Animated.spring(overlayX, {
                        toValue: targetX,
                        useNativeDriver: true,
                        speed: 40,
                        bounciness: 4,
                    }).start();
                } else {
                    overlayX.setValue(targetX);
                }
            };

            if (autoScrollSpeedRef.current !== 0) {
                // Auto-scroll is streaming rows of arbitrary depth under a
                // stationary finger; chasing their levels would dart the overlay
                // sideways and back. Hold the current indent (and drop any pending
                // shift) until the scroll settles - the drop indicator itself
                // keeps tracking via the store.
                if (levelSettleTimerRef.current) {
                    clearTimeout(levelSettleTimerRef.current);
                    levelSettleTimerRef.current = null;
                }
                pendingLevelRef.current = null;
            } else if (effectiveLevel === prevEffectiveLevelRef.current) {
                // Back at the settled level - drop any pending level the finger
                // only transited through.
                if (levelSettleTimerRef.current) {
                    clearTimeout(levelSettleTimerRef.current);
                    levelSettleTimerRef.current = null;
                }
                pendingLevelRef.current = null;
            } else if (pendingLevelRef.current !== effectiveLevel) {
                // New candidate level - (re)start the settle timer.
                pendingLevelRef.current = effectiveLevel;
                if (levelSettleTimerRef.current) clearTimeout(levelSettleTimerRef.current);
                levelSettleTimerRef.current = setTimeout(() => {
                    levelSettleTimerRef.current = null;
                    const settled = pendingLevelRef.current;
                    pendingLevelRef.current = null;
                    if (settled !== null && isDraggingRef.current) applyLevel(settled);
                }, LEVEL_SETTLE_MS);
            }

            const newTarget: DropTarget<ID> = {
                targetNodeId: targetNode.id,
                targetIndex: clampedIndex,
                position,
                isValid,
            };

            // Update the store so each Node can render its own indicator.
            // The indicator always tracks the VISUAL target/position (what the user
            // sees), even when the actual move target is a logical ancestor.
            // Guard the write so it only fires when the indicator actually changes -
            // calculateDropTarget runs every pan frame and each store write re-runs
            // every mounted Node's selector.
            const nextDropNodeId = isValid ? targetNode.id : null;
            const nextDropPosition = isValid ? position : null;
            const nextDropLevel = isValid ? (visualDropLevel ?? null) : null;
            const lastStore = lastStoreDropTargetRef.current;
            if (
                !lastStore ||
                lastStore.nodeId !== nextDropNodeId ||
                lastStore.position !== nextDropPosition ||
                lastStore.level !== nextDropLevel
            ) {
                store.getState().updateDropTarget(nextDropNodeId, nextDropPosition, nextDropLevel);
                lastStoreDropTargetRef.current = {
                    nodeId: nextDropNodeId,
                    position: nextDropPosition,
                    level: nextDropLevel,
                };
            }

            // Keep the commit ref in sync (read by handleDragEnd).
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
        },
        [storeId, cancelAutoExpandTimer, overlayX, itemHeightsRef]
    );
    calculateDropTargetRef.current = calculateDropTarget;

    // --- Handle drag end ---
    const handleDragEnd = useCallback(
        (fingerPageY?: number, fingerPageX?: number, cancel: boolean = false) => {
            stopAutoScroll();
            cancelLongPressTimer();
            cancelAutoExpandTimer();

            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;

            // Recalculate drop target at final position if we have coords. Hysteresis
            // (prevDropTargetRef) is intentionally NOT cleared first, so this final
            // commit frame resolves to the same target the user last saw the indicator
            // on (clearing it here would let the release snap to the other side of an
            // ambiguous same-level boundary). It is reset in the ref-cleanup below.
            if (fingerPageY !== undefined) {
                calculateDropTarget(fingerPageY, fingerPageX ?? 0);
            }

            // Cancel any auto-expand timer that calculateDropTarget may have just started.
            // Without this, the timer fires after drag ends and toggles the target back to collapsed.
            cancelAutoExpandTimer();

            // Read the final drop target from the ref (the per-frame calculation
            // keeps it current; there is no React state to wait on).
            const currentTarget = dropTargetRef.current;
            const droppedNodeId = draggedNodeIdRef.current;

            const store = getTreeViewStore<ID>(storeId);
            const currentData = store.getState().initialTreeViewData;
            // Capture the node's position before the move for the MoveResult delta.
            const prevPosition = droppedNodeId !== null
                ? findNodePosition(currentData, droppedNodeId)
                : null;
            // Compute the move up front so an invalid move (moveTreeNode returns the
            // same reference) or a positional no-op (node re-dropped where it already
            // sits) is treated as a cancel rather than a spurious onDragEnd.
            const newData = (!cancel && currentTarget?.isValid && droppedNodeId !== null)
                ? moveTreeNode(currentData, droppedNodeId, currentTarget.targetNodeId, currentTarget.position)
                : currentData;
            const newPosition = (newData !== currentData && droppedNodeId !== null)
                ? findNodePosition(newData, droppedNodeId)
                : null;
            const isNoOpMove =
                newPosition !== null &&
                prevPosition !== null &&
                newPosition.parentId === prevPosition.parentId &&
                newPosition.index === prevPosition.index;

            if (
                !cancel &&
                currentTarget?.isValid &&
                droppedNodeId !== null &&
                newData !== currentData &&
                !isNoOpMove
            ) {
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

                // Notify the consumer with a lightweight move delta. The reordered
                // tree lives in the store; TreeView's wrapped onDragEnd captures it
                // for the reinit-skip, and consumers can read it via getTreeData().
                onDragEndRef.current?.({
                    draggedNodeId: droppedNodeId,
                    targetNodeId: currentTarget.targetNodeId,
                    position: currentTarget.position,
                    previousParentId: prevPosition?.parentId ?? null,
                    previousIndex: prevPosition?.index ?? -1,
                    newParentId: newPosition?.parentId ?? null,
                    newIndex: newPosition?.index ?? -1,
                });

                // Announce the result for screen readers (no-op without assistive tech).
                AccessibilityInfo.announceForAccessibility?.(
                    `Moved ${draggedNodeRef.current?.name ?? "node"}`
                );

                // Auto-scroll to the dropped node unless disabled by the user.
                const scrollOpts = autoScrollToDroppedNode;
                const scrollEnabled = scrollOpts === undefined || scrollOpts === true
                    || (typeof scrollOpts === "object" && scrollOpts.enabled !== false);

                if (scrollEnabled) {
                    // The drop lands under the finger, so the node is almost always
                    // already on-screen; scrolling anyway would yank the list (worst
                    // when dropping near the very bottom, where centering the node
                    // scrolls the list back up). Estimate where the dropped row ends
                    // up in the post-move flattened list and only scroll when it
                    // actually sits outside the viewport.
                    const preMoveNodes = flattenedNodesRef.current;
                    const draggedIdx = preMoveNodes.findIndex(
                        (n) => n.id === droppedNodeId
                    );
                    const iH = itemHeightRef.current;
                    let finalIndex = currentTarget.targetIndex;
                    // "below"/"inside" both land the node right after the target row.
                    if (currentTarget.position !== "above") finalIndex += 1;
                    // Removing the dragged row from above the target shifts rows up one.
                    if (draggedIdx !== -1 && draggedIdx < currentTarget.targetIndex) {
                        finalIndex -= 1;
                    }
                    const rowTop =
                        headerOffsetRef.current + finalIndex * iH - scrollOffsetRef.current;
                    const isOnScreen =
                        rowTop >= 0 && rowTop + iH <= containerHeightRef.current;

                    if (!isOnScreen) {
                        const custom = typeof scrollOpts === "object" ? scrollOpts : {};
                        setTimeout(() => {
                            scrollToNodeHandlerRef.current?.scrollToNodeID({
                                nodeId: droppedNodeId,
                                animated: custom.animated ?? true,
                                viewPosition: custom.viewPosition ?? 0.5,
                                viewOffset: custom.viewOffset,
                            });
                        }, 0);
                    }
                }
            } else if (droppedNodeId !== null) {
                // Drag ended without a valid drop - a cancel must not mutate state,
                // so restore the expansion that drag start force-collapsed.
                if (wasDraggedNodeExpandedRef.current) {
                    expandNodes(storeId, [droppedNodeId]);
                }
                onDragCancelRef.current?.({ draggedNodeId: droppedNodeId });
                AccessibilityInfo.announceForAccessibility?.(
                    `Cancelled moving ${draggedNodeRef.current?.name ?? "node"}`
                );
            }

            // Collapse auto-expanded nodes that aren't ancestors of the drop target
            if (autoExpandedDuringDragRef.current.size > 0) {
                const store3 = getTreeViewStore<ID>(storeId);
                const { childToParentMap } = store3.getState();

                // Collect ancestors of the drop target (keep these expanded).
                // On cancel, retain none so every auto-expanded node collapses back.
                const ancestorIds = new Set<ID>();
                if (!cancel && currentTarget?.isValid) {
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
            pendingLevelRef.current = null;
            if (levelSettleTimerRef.current) {
                clearTimeout(levelSettleTimerRef.current);
                levelSettleTimerRef.current = null;
            }
            prevDropTargetRef.current = null;
            dropTargetRef.current = null;
            lastStoreDropTargetRef.current = null;
            draggedNodeRef.current = null;
            draggedNodeIdRef.current = null;
            wasDraggedNodeExpandedRef.current = false;

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
        ]
    );

    // --- Handle node touch end ---
    // If the PanResponder never captured the gesture (no movement after long
    // press fired), end the drag here so the node doesn't stay "lifted".
    const handleNodeTouchEnd = useCallback(() => {
        // cancelLongPressTimer also aborts any drag still awaiting its
        // measureInWindow callback (clears pendingDragRef).
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

            // While a drag is active, refuse to hand the gesture to an ancestor
            // responder (e.g. a parent ScrollView or swipe navigator) so a slight
            // horizontal drift can't terminate the drag mid-flight.
            onPanResponderTerminationRequest: () => !isDraggingRef.current,

            onPanResponderMove: (evt) => {
                if (!isDraggingRef.current) return;

                const fingerPageY = evt.nativeEvent.pageY;
                lastFingerPageYRef.current = fingerPageY;
                lastFingerPageXRef.current = evt.nativeEvent.pageX;
                const fingerLocalY =
                    fingerPageY - containerPageYRef.current;

                // Update overlay position (with configurable offset)
                const overlayLocalY =
                    fingerLocalY - grabOffsetYRef.current + (dragOverlayOffsetRef.current + overlayYCorrectionRef.current) * itemHeightRef.current;
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
                // A terminate (parent scroll steals the gesture, app backgrounds, etc.)
                // cancels the drop rather than committing at the last hovered target.
                handleDragEnd(undefined, undefined, true);
            },
        })
    ).current;

    // --- Cleanup on unmount ---
    useEffect(() => {
        return () => {
            cancelLongPressTimer();
            cancelAutoExpandTimer();
            stopAutoScroll();
            if (levelSettleTimerRef.current) {
                clearTimeout(levelSettleTimerRef.current);
                levelSettleTimerRef.current = null;
            }
            pendingDragRef.current = false;
            lastStoreDropTargetRef.current = null;
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
        handleNodeTouchStart,
        handleNodeTouchEnd,
        cancelLongPressTimer,
        scrollOffsetRef,
        headerOffsetRef,
        containerHeightRef,
    };
}
