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
    type NativeScrollEvent,
    type NativeSyntheticEvent,
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
} from "../helpers";
import {
    applyMoveToStore,
    findNodePosition,
    findNodePositionFromMaps,
    moveTreeNode,
} from "../helpers/moveTreeNode.helper";
import { scrollMovedNodeIntoView } from "./useScrollToNode";
import { defaultItemHeight } from "../constants/treeView.constants";

// Android reports touch `locationY` slightly differently from iOS, which makes the
// drag overlay sit ~2 item-heights closer to the finger. This empirical correction
// (in item-height units, added to dragOverlayOffset) compensates for that. Consumers
// can override it per-instance via DragAndDropOptions.overlayYCorrection.
/* istanbul ignore next -- Platform.OS is never "android" in jest */
const DEFAULT_OVERLAY_Y_CORRECTION = Platform.OS === "android" ? -2 : 0;

// Auto-scroll speed at the very edge in px/SECOND, before the proximity ramp
// and the consumer's `autoScrollSpeed` multiplier are applied. Time-based (not
// px/frame) so 60Hz and 120Hz displays scroll at the same real-world speed.
const MAX_AUTO_SCROLL_SPEED = 1200;
// During auto-scroll, recompute the drop target at most this often. Every scroll
// frame moves rows under the finger, but recomputing per frame costs store
// writes + node re-renders on the JS thread (stuttering the scroll itself), and
// ~10 indicator updates/sec reads calmer than 60 anyway.
const AUTO_SCROLL_RECALC_INTERVAL_MS = 100;
// How long (ms) a candidate drop level must hold before the overlay springs to
// its indentation. Prevents the indent from chasing every row the finger merely
// passes through while dragging vertically.
const LEVEL_SETTLE_MS = 120;
// How far (fraction of row height) the active zone's boundaries extend outward
// while the finger stays on the same row. Finger tremor at a zone edge would
// otherwise flip above/inside/below (and the overlay indent) every few frames.
const ZONE_STICKINESS = 0.08;

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
    /** onScroll handler for the host list. Owns the scroll-offset bookkeeping:
     *  real scroll events are ignored while a drag is active (the auto-scroll
     *  RAF loop is the sole writer of the offset then - lagging events would
     *  fight its accumulated value and make the offset oscillate), and any
     *  scroll cancels a pending long-press. */
    handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
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

    // Last known finger position, so the auto-scroll loop can recompute the drop
    // target for a stationary finger while rows scroll underneath it.
    const lastFingerPageYRef = useRef(0);
    const lastFingerPageXRef = useRef(0);
    // calculateDropTarget is defined below startAutoScrollLoop; the RAF loop reads
    // it through this ref to avoid a use-before-declaration in the dep array.
    const calculateDropTargetRef = useRef<(fingerPageY: number, fingerPageX: number) => void>(/* istanbul ignore next -- placeholder, overwritten each render */ () => { });

    // Caches the "every current row is measured" gate so calculateDropTarget
    // doesn't scan the full flattened list on every pan frame. Invalidated when
    // the flattened list identity or the measured-heights count changes.
    const allHeightsMeasuredRef = useRef<{
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
    // Flattened-list identity seen by the last calculateDropTarget call; when it
    // changes mid-drag the index-based hysteresis state above is invalidated.
    const lastCalcNodesRef = useRef<unknown>(null);

    // Depth of the dragged subtree (computed once at drag start, used for maxDepth check)
    const draggedSubtreeDepthRef = useRef(0);

    // Keep flattenedNodes ref current for PanResponder closures
    const flattenedNodesRef = useRef(flattenedNodes);
    flattenedNodesRef.current = flattenedNodes;

    // Keep dragEnabled current for the long-press timer: the armed setTimeout
    // captures initiateDrag at press time, so a closure read would see a stale
    // value and start a drag after the consumer disabled dragging mid-press.
    const dragEnabledRef = useRef(dragEnabled);
    dragEnabledRef.current = dragEnabled;

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

    // --- Overlay Y for a container-local finger Y (grab point + offsets) ---
    const computeOverlayLocalY = useCallback((fingerLocalY: number) =>
        fingerLocalY
        - grabOffsetYRef.current
        + (dragOverlayOffsetRef.current + overlayYCorrectionRef.current)
        * itemHeightRef.current,
        []
    );

    // --- Level-cliff horizontal control: is the finger left of the threshold
    //     that selects the shallower level? (30% into the visible content area
    //     of a row indented at `level`.) ---
    const fingerLeftOfLevelThreshold = useCallback(
        (level: number, fingerLocalX: number) => {
            const itemLeftEdge = level * indentationMultiplierRef.current;
            const threshold =
                itemLeftEdge + (containerWidthRef.current - itemLeftEdge) * 0.3;
            return fingerLocalX < threshold;
        },
        []
    );

    // --- Initiate drag ---
    const initiateDrag = useCallback(
        (nodeId: ID, pageY: number, locationY: number, nodeIndex: number) => {
            // Read through the ref: the long-press timer holds the initiateDrag
            // closure from press time, and dragging may have been disabled since.
            if (!dragEnabledRef.current) return;
            // Never start a second drag on top of one already running or pending
            // (e.g. a competing long-press from a second finger).
            /* istanbul ignore next -- handleNodeTouchStart cancels the pending
               long-press timer before arming a new one, so a second initiateDrag
               cannot fire while one is running; kept as defense in depth */
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

                lastFingerPageYRef.current = pageY;

                // Compute invalid targets (self + descendants)
                const descendants = getDescendantIds(nodeId);
                descendants.add(nodeId);

                // Update store (triggers one re-render of nodes to show greyed-out state)
                store.getState().updateDraggedNodeId(nodeId);
                store.getState().updateInvalidDragTargetIds(descendants);

                // Set overlay initial position (with configurable offset)
                overlayY.setValue(computeOverlayLocalY(fingerLocalY));

                // Reset magnetic overlay
                overlayX.setValue(0);
                prevEffectiveLevelRef.current = /* istanbul ignore next -- level is always set by flattenTree */ node.level ?? 0;
                cancelLevelSettleTimer();

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
        /* istanbul ignore next -- the loop starts once per drag and every drag-end
           path cancels it; re-entry with a live handle is defense in depth */
        if (autoScrollRAFRef.current !== null) {
            cancelAnimationFrame(autoScrollRAFRef.current);
            autoScrollRAFRef.current = null;
        }
        // Time-based stepping: RAF cadence varies with display refresh rate, so
        // distance is derived from elapsed time, not frame count.
        let lastTs: number | null = null;
        let lastRecalcTs = 0;
        const loop = (ts?: number) => {
            /* istanbul ignore next -- stopAutoScroll cancels the pending frame on
               every drag-end path before this could observe a finished drag */
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

            // Ease the proximity ramp (sqrt) so speed builds up fast even for a
            // shallow entry into the threshold zone - the screen edge often stops
            // the finger before it reaches the very edge of the list.
            if (fingerInContainer < threshold) {
                // Scroll up
                const ratio = 1 - Math.max(0, fingerInContainer) / threshold;
                autoScrollSpeedRef.current = -maxSpeed * Math.sqrt(ratio);
            } else if (fingerInContainer > containerH - threshold) {
                // Scroll down
                const ratio =
                    1 - Math.max(0, containerH - fingerInContainer) / threshold;
                autoScrollSpeedRef.current = maxSpeed * Math.sqrt(ratio);
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

    // --- Cancel the overlay-indent settle timer + its pending level ---
    const cancelLevelSettleTimer = useCallback(() => {
        if (levelSettleTimerRef.current) {
            clearTimeout(levelSettleTimerRef.current);
            levelSettleTimerRef.current = null;
        }
        pendingLevelRef.current = null;
    }, []);

    // --- Clear the store's drag fields (shared by drag end and unmount) ---
    const resetDragStoreState = useCallback(() => {
        const state = getTreeViewStore<ID>(storeId).getState();
        state.updateDraggedNodeId(null);
        state.updateInvalidDragTargetIds(new Set());
        state.updateDropTarget(null, null);
    }, [storeId]);

    // --- Calculate drop target ---
    const calculateDropTarget = useCallback(
        (fingerPageY: number, fingerPageX: number) => {
            const nodes = flattenedNodesRef.current;
            if (nodes.length === 0) return;

            // The flattened list changed mid-drag (e.g. auto-expand inserted the
            // hovered parent's children). Index-based hysteresis/stickiness state
            // refers to rows of the OLD list - drop it so it can't stick the zone
            // or gap decision to whatever row now happens to hold that index. The
            // measured-heights gate cache is keyed to the old list too.
            if (lastCalcNodesRef.current !== nodes) {
                lastCalcNodesRef.current = nodes;
                prevDropTargetRef.current = null;
                allHeightsMeasuredRef.current = null;
            }

            // Single store snapshot per frame (the store can't change within this
            // synchronous pass) - avoids re-reading getState() several times.
            const {
                childToParentMap,
                expanded,
                invalidDragTargetIds,
                draggedNodeId,
                nodeMap,
                updateDropTarget,
            } = getTreeViewStore<ID>(storeId).getState();

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
            // The full-list scan is cached per measured count (and invalidated on
            // list-identity change above) so it doesn't run on every pan frame.
            const cachedGate = allHeightsMeasuredRef.current;
            let allMeasured: boolean;
            if (cachedGate && cachedGate.size === heights.size) {
                allMeasured = cachedGate.value;
            } else {
                allMeasured = nodes.every((n) => heights.has(n.id));
                allHeightsMeasuredRef.current = { size: heights.size, value: allMeasured };
            }
            let clampedIndex: number;
            let itemTop: number;
            let itemHeight: number;
            if (allMeasured) {
                let top = 0;
                let idx = 0;
                while (idx < nodes.length - 1) {
                    /* istanbul ignore next -- gate guarantees every current row is measured */
                    const h = heights.get(nodes[idx]!.id) ?? iH;
                    if (adjustedContentY < top + h) break;
                    top += h;
                    idx++;
                }
                clampedIndex = idx;
                itemTop = top;
                /* istanbul ignore next -- gate guarantees every current row is measured */
                itemHeight = heights.get(nodes[idx]!.id) ?? iH;
            } else {
                const rawIndex = Math.floor(adjustedContentY / iH);
                clampedIndex = Math.max(0, Math.min(rawIndex, nodes.length - 1));
                itemTop = clampedIndex * iH;
                itemHeight = iH;
            }
            let targetNode = nodes[clampedIndex];
            /* istanbul ignore next -- clampedIndex is clamped into [0, length-1]
               and the empty list bails out above; noUncheckedIndexedAccess guard */
            if (!targetNode) return;

            // Determine zone within item. Sticky zones: while a zone is active for
            // this same row, its boundaries shift outward so natural finger tremor
            // at a zone edge can't flip the position (and with it the indicator
            // and the overlay's indent) back and forth every few frames.
            const positionInItem =
                (adjustedContentY - itemTop) / itemHeight;
            let aboveBound = 0.25;
            let belowBound = 0.75;
            const prevZone = prevDropTargetRef.current;
            if (prevZone && prevZone.targetIndex === clampedIndex) {
                if (prevZone.position === "above") {
                    aboveBound += ZONE_STICKINESS;
                } else if (prevZone.position === "below") {
                    belowBound -= ZONE_STICKINESS;
                } else {
                    aboveBound -= ZONE_STICKINESS;
                    belowBound += ZONE_STICKINESS;
                }
            }
            let position: DropPosition;
            if (positionInItem < aboveBound) {
                position = "above";
            } else if (positionInItem > belowBound) {
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
                    /* istanbul ignore next -- level is always set by flattenTree */
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
                /* istanbul ignore next -- level is always set by flattenTree */
                const currentLevel = targetNode.level ?? 0;
                let isCliff = false;
                let shallowLevel = 0;

                if (clampedIndex < nodes.length - 1) {
                    const nextNode = nodes[clampedIndex + 1];
                    /* istanbul ignore next -- level is always set by flattenTree */
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
                    if (fingerLeftOfLevelThreshold(currentLevel, fingerLocalX)) {
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
                                /* istanbul ignore next -- a node at level > 0 always
                                   has a parent in childToParentMap; corrupt-map guard */
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
                /* istanbul ignore next -- level is always set by flattenTree */
                const prevLevel = prevNode?.level ?? 0;
                /* istanbul ignore next -- level is always set by flattenTree */
                const currentLevel = targetNode.level ?? 0;
                if (prevNode && prevLevel > currentLevel) {
                    if (!fingerLeftOfLevelThreshold(prevLevel, fingerLocalX)) {
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
                    /* istanbul ignore next -- level is always set by flattenTree */
                    const upperLevel = nodes[upperIdx]?.level ?? 0;
                    /* istanbul ignore next -- level is always set by flattenTree */
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
            /* istanbul ignore next -- the logical ancestor came from
               childToParentMap, so nodeMap always resolves it */
            const effectiveTargetNode =
                logicalTargetId !== null
                    ? (nodeMap.get(effectiveTargetId) ?? targetNode)
                    : targetNode;

            // maxDepth check for above/below (sibling) positions
            let maxDepthValid = true;
            if (maxDepthRef.current !== undefined && (effectivePosition === "above" || effectivePosition === "below")) {
                // At a cliff the sibling lands at visualDropLevel; otherwise the
                // effective target's own level.
                const targetLevel = visualDropLevel ?? (/* istanbul ignore next -- level is always set by flattenTree */ effectiveTargetNode.level ?? 0);
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
            /* istanbul ignore next -- level is always set by flattenTree */
            const draggedLevel = draggedNodeRef.current?.level ?? 0;
            // When a logical target overrides the visual (e.g. ancestor at last-item cliff),
            // the effective level comes from the visual drop level, not the target node.
            /* istanbul ignore next -- level is always set by flattenTree */
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
                    (nextLevel - (/* istanbul ignore next -- level is always set by flattenTree */ draggedNodeRef.current?.level ?? 0)) *
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
                cancelLevelSettleTimer();
            } else if (effectiveLevel === prevEffectiveLevelRef.current) {
                // Back at the settled level - drop any pending level the finger
                // only transited through.
                cancelLevelSettleTimer();
            } else if (pendingLevelRef.current !== effectiveLevel) {
                // New candidate level - (re)start the settle timer.
                cancelLevelSettleTimer();
                pendingLevelRef.current = effectiveLevel;
                levelSettleTimerRef.current = setTimeout(() => {
                    levelSettleTimerRef.current = null;
                    const settled = pendingLevelRef.current;
                    pendingLevelRef.current = null;
                    /* istanbul ignore next -- every drag-end path clears this timer,
                       so it can only fire mid-drag with a pending level set */
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
            const nextDropLevel = isValid ? visualDropLevel : null;
            const lastStore = lastStoreDropTargetRef.current;
            if (
                !lastStore ||
                lastStore.nodeId !== nextDropNodeId ||
                lastStore.position !== nextDropPosition ||
                lastStore.level !== nextDropLevel
            ) {
                updateDropTarget(nextDropNodeId, nextDropPosition, nextDropLevel);
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
        [
            storeId,
            cancelAutoExpandTimer,
            cancelLevelSettleTimer,
            fingerLeftOfLevelThreshold,
            overlayX,
            itemHeightsRef,
        ]
    );
    calculateDropTargetRef.current = calculateDropTarget;

    // --- Handle drag end ---
    const handleDragEnd = useCallback(
        (fingerPageY?: number, fingerPageX?: number, cancel: boolean = false) => {
            stopAutoScroll();
            cancelLongPressTimer();
            cancelAutoExpandTimer();

            /* istanbul ignore next -- release/terminate only fire while the
               responder is captured (mid-drag); touch-end guards before calling */
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;

            // Recalculate drop target at final position if we have coords. Hysteresis
            // (prevDropTargetRef) is intentionally NOT cleared first, so this final
            // commit frame resolves to the same target the user last saw the indicator
            // on (clearing it here would let the release snap to the other side of an
            // ambiguous same-level boundary). It is reset in the ref-cleanup below.
            if (fingerPageY !== undefined) {
                calculateDropTarget(fingerPageY, /* istanbul ignore next -- gesture events always carry pageX */ fingerPageX ?? 0);
            }

            // Cancel any auto-expand timer that calculateDropTarget may have just started.
            // Without this, the timer fires after drag ends and toggles the target back to collapsed.
            cancelAutoExpandTimer();

            // Read the final drop target from the ref (the per-frame calculation
            // keeps it current; there is no React state to wait on).
            const currentTarget = dropTargetRef.current;
            /* istanbul ignore next -- draggedNodeRef is set for the whole drag */
            const droppedNodeId = draggedNodeRef.current?.id ?? null;

            const store = getTreeViewStore<ID>(storeId);
            const { initialTreeViewData: currentData, nodeMap, childToParentMap } =
                store.getState();
            // Capture the node's position before the move for the MoveResult delta
            // (the maps still describe the pre-move tree here).
            /* istanbul ignore next -- droppedNodeId is non-null on this path */
            const prevPosition = droppedNodeId !== null
                ? findNodePositionFromMaps(currentData, nodeMap, childToParentMap, droppedNodeId)
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
                // Commit the move to the store (preserves checked/expanded;
                // shared with the programmatic moveNode path).
                applyMoveToStore(
                    storeId, newData, droppedNodeId,
                    currentTarget.targetNodeId, currentTarget.position
                );

                // Notify the consumer with a lightweight move delta. The reordered
                // tree lives in the store; TreeView's wrapped onDragEnd captures it
                // for the reinit-skip, and consumers can read it via getTreeData().
                /* istanbul ignore next -- positions always resolve for a
                   just-committed move; ?? fallbacks are type-level guards */
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
                /* istanbul ignore next -- draggedNodeRef is set for the whole drag */
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
                        scrollMovedNodeIntoView(
                            scrollToNodeHandlerRef, droppedNodeId, scrollOpts
                        );
                    }
                }
            } else /* istanbul ignore next -- droppedNodeId is non-null whenever
                a drag was active; the guard mirrors the commit branch above */
                if (droppedNodeId !== null) {
                // Drag ended without a valid drop - a cancel must not mutate state,
                // so restore the expansion that drag start force-collapsed.
                if (wasDraggedNodeExpandedRef.current) {
                    expandNodes(storeId, [droppedNodeId]);
                }
                onDragCancelRef.current?.({ draggedNodeId: droppedNodeId });
                /* istanbul ignore next -- draggedNodeRef is set for the whole drag */
                AccessibilityInfo.announceForAccessibility?.(
                    `Cancelled moving ${draggedNodeRef.current?.name ?? "node"}`
                );
            }

            // Collapse auto-expanded nodes that aren't ancestors of the drop target
            if (autoExpandedDuringDragRef.current.size > 0) {
                // Re-read: the maps were rebuilt if a move committed above.
                const { childToParentMap: postMoveParentMap } = store.getState();

                // Collect ancestors of the drop target (keep these expanded).
                // On cancel, retain none so every auto-expanded node collapses back.
                const ancestorIds = new Set<ID>();
                if (!cancel && currentTarget?.isValid) {
                    let walkId: ID | undefined = currentTarget.targetNodeId;
                    while (walkId !== undefined) {
                        ancestorIds.add(walkId);
                        walkId = postMoveParentMap.get(walkId);
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
            resetDragStoreState();

            // Reset all refs
            overlayX.setValue(0);
            prevEffectiveLevelRef.current = null;
            cancelLevelSettleTimer();
            prevDropTargetRef.current = null;
            dropTargetRef.current = null;
            lastStoreDropTargetRef.current = null;
            draggedNodeRef.current = null;
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

    // --- onScroll for the host list (see UseDragDropReturn.handleScroll) ---
    const handleScroll = useCallback((
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        if (!isDraggingRef.current) {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }
        // Scrolling means this touch isn't a long-press
        cancelLongPressTimer();
    }, [cancelLongPressTimer]);

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
                overlayY.setValue(computeOverlayLocalY(fingerLocalY));

                // Calculate drop target (horizontal position used at level cliffs)
                calculateDropTarget(fingerPageY, evt.nativeEvent.pageX);

                // Auto-scroll at edges, from the finger's container-local position
                updateAutoScroll(fingerLocalY);
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
            cancelLevelSettleTimer();
            stopAutoScroll();
            pendingDragRef.current = false;
            lastStoreDropTargetRef.current = null;
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                resetDragStoreState();
            }
        };
    }, [
        cancelLongPressTimer,
        cancelAutoExpandTimer,
        cancelLevelSettleTimer,
        stopAutoScroll,
        resetDragStoreState,
    ]);

    return {
        panResponder,
        overlayY,
        overlayX,
        isDragging,
        draggedNode,
        handleNodeTouchStart,
        handleNodeTouchEnd,
        cancelLongPressTimer,
        handleScroll,
        scrollOffsetRef,
        headerOffsetRef,
        containerHeightRef,
    };
}
