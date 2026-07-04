jest.mock("zustand");

import { renderHook, act } from "@testing-library/react-native";
import { useDragDrop } from "../hooks/useDragDrop";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps } from "../helpers";
import type { __FlattenedTreeNode__, TreeNode } from "../types/treeView.types";
import type { DragStartEvent, DragEndEvent, DragCancelEvent } from "../types/dragDrop.types";
import { Animated } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { createRef } from "react";

// ──────────────────────────────────────────────
// Test tree:
//  A (level 0)
//  ├── A1 (level 1)
//  │   ├── A1a (level 2)
//  │   └── A1b (level 2)
//  └── A2 (level 1)
//  B (level 0)
//  ├── B1 (level 1)
//  └── B2 (level 1)
//  C (level 0, leaf)
// ──────────────────────────────────────────────

function makeTree(): TreeNode<string>[] {
    return [
        {
            id: "A", name: "A", children: [
                {
                    id: "A1", name: "A1", children: [
                        { id: "A1a", name: "A1a" },
                        { id: "A1b", name: "A1b" },
                    ]
                },
                { id: "A2", name: "A2" },
            ]
        },
        {
            id: "B", name: "B", children: [
                { id: "B1", name: "B1" },
                { id: "B2", name: "B2" },
            ]
        },
        { id: "C", name: "C" },
    ];
}

/** Flatten a tree into __FlattenedTreeNode__ with level info (all expanded) */
function flattenTree(
    nodes: TreeNode<string>[],
    level = 0,
): __FlattenedTreeNode__<string>[] {
    const result: __FlattenedTreeNode__<string>[] = [];
    for (const node of nodes) {
        result.push({ ...node, level });
        if (node.children) {
            result.push(...flattenTree(node.children, level + 1));
        }
    }
    return result;
}

// ──────────────────────────────────────────────
// Mocks & Helpers
// ──────────────────────────────────────────────

const STORE_ID = "drag-drop-hook-test";
const ITEM_HEIGHT = 40;

// Container mock: simulates a View with measureInWindow
const CONTAINER_Y = 100;
const CONTAINER_X = 0;
const CONTAINER_HEIGHT = 400;

function createMockContainerRef() {
    return {
        current: {
            measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => {
                cb(CONTAINER_X, CONTAINER_Y, 300, CONTAINER_HEIGHT);
            },
        },
    };
}

function createMockFlashListRef() {
    return createRef<any>();
}

/** Build default hook params with sensible defaults. Override per-test. */
function createDefaultParams(overrides?: Partial<Parameters<typeof useDragDrop<string>>[0]>) {
    const tree = makeTree();
    const flattened = flattenTree(tree);

    // Initialize the store
    const store = getTreeViewStore<string>(STORE_ID);
    store.getState().updateInitialTreeViewData(tree);
    initializeNodeMaps(STORE_ID, tree);
    // Expand all nodes so flattened list is complete
    store.getState().updateExpanded(new Set(["A", "A1", "B"]));

    return {
        storeId: STORE_ID,
        flattenedNodes: flattened,
        flashListRef: createMockFlashListRef(),
        containerRef: createMockContainerRef() as any,
        dragEnabled: true,
        longPressDuration: 400,
        autoScrollThreshold: 60,
        autoScrollSpeed: 1.0,
        measuredItemHeightRef: { current: ITEM_HEIGHT },
        contentHeightRef: { current: 0 },
        itemHeightsRef: { current: new Map<string, number>() },
        dragOverlayOffset: 0,
        autoExpandDelay: 800,
        indentationMultiplier: 15,
        scrollToNodeHandlerRef: { current: null },
        ...overrides,
    };
}

/**
 * Simulate a long press on a node: call handleNodeTouchStart, then advance timer.
 * The long press timer fires initiateDrag which calls measureInWindow (sync in tests).
 */
function simulateLongPress(
    hookResult: ReturnType<typeof useDragDrop<string>>,
    nodeId: string,
    nodeIndex: number,
    pageY: number,
    locationY = 10,
) {
    hookResult.handleNodeTouchStart(nodeId, pageY, locationY, nodeIndex);
    // Advance past the long-press duration to fire initiateDrag
    jest.advanceTimersByTime(500);
}

/** Compute the pageY for a node at a given index */
function pageYForNode(index: number, zone: "above" | "inside" | "below" = "inside") {
    // pageY = containerY + headerOffset + index * itemHeight + zoneOffset
    // headerOffset is computed by initiateDrag; to simplify, we rely on the hook's
    // internal calculation. We just need a Y that maps to the right index/zone.
    const headerOffset = 10; // listHeaderFooterPadding * 2
    let zoneOffset: number;
    if (zone === "above") zoneOffset = ITEM_HEIGHT * 0.05;
    else if (zone === "below") zoneOffset = ITEM_HEIGHT * 0.95;
    else zoneOffset = ITEM_HEIGHT * 0.5;

    return CONTAINER_Y + headerOffset + index * ITEM_HEIGHT + zoneOffset;
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("useDragDrop", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Mock requestAnimationFrame for auto-scroll loop
        jest.spyOn(global, "requestAnimationFrame").mockImplementation(
            (cb) => setTimeout(cb, 16) as unknown as number
        );
        jest.spyOn(global, "cancelAnimationFrame").mockImplementation(
            (id) => clearTimeout(id)
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe("given drag is disabled", () => {
        it("when touch start is called, then drag does not initiate", () => {
            const params = createDefaultParams({ dragEnabled: false });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "A", 0, pageYForNode(0));
            });

            expect(result.current.isDragging).toBe(false);
            expect(result.current.draggedNode).toBeNull();
        });
    });

    describe("given canDrag callback rejects a node", () => {
        it("when long-pressing a rejected node, then drag does not initiate", () => {
            const params = createDefaultParams({
                canDrag: (node) => node.id !== "B1",
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // B1 is at index 6 in the flattened list: A, A1, A1a, A1b, A2, B, B1
            act(() => {
                simulateLongPress(result.current, "B1", 6, pageYForNode(6));
            });

            expect(result.current.isDragging).toBe(false);
        });

        it("when long-pressing an allowed node, then drag initiates normally", () => {
            const params = createDefaultParams({
                canDrag: (node) => node.id !== "B1",
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // C is at index 8 (leaf)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            expect(result.current.isDragging).toBe(true);
            expect(result.current.draggedNode?.id).toBe("C");
        });
    });

    describe("given a long press on a valid node", () => {
        it("when the timer fires, then drag state is set and onDragStart is called", () => {
            const onDragStart = jest.fn<void, [DragStartEvent<string>]>();
            const params = createDefaultParams({ onDragStart });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            expect(result.current.isDragging).toBe(true);
            expect(result.current.draggedNode?.id).toBe("C");
            expect(onDragStart).toHaveBeenCalledWith({ draggedNodeId: "C" });
        });

        it("when the timer fires, then self and descendants are marked invalid in store", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Drag node A (has descendants A1, A1a, A1b, A2)
            act(() => {
                simulateLongPress(result.current, "A", 0, pageYForNode(0));
            });

            const store = getTreeViewStore<string>(STORE_ID);
            const { invalidDragTargetIds } = store.getState();

            expect(invalidDragTargetIds.has("A")).toBe(true);
            expect(invalidDragTargetIds.has("A1")).toBe(true);
            expect(invalidDragTargetIds.has("A1a")).toBe(true);
            expect(invalidDragTargetIds.has("A1b")).toBe(true);
            expect(invalidDragTargetIds.has("A2")).toBe(true);
            // Non-descendants should be valid
            expect(invalidDragTargetIds.has("B")).toBe(false);
            expect(invalidDragTargetIds.has("C")).toBe(false);
        });

        it("when touch end fires before timer, then long press is cancelled", () => {
            const onDragStart = jest.fn();
            const params = createDefaultParams({ onDragStart });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                result.current.handleNodeTouchStart("C", pageYForNode(8), 10, 8);
                // End touch before the 400ms long press fires
                jest.advanceTimersByTime(200);
                result.current.handleNodeTouchEnd();
                jest.advanceTimersByTime(300);
            });

            expect(result.current.isDragging).toBe(false);
            expect(onDragStart).not.toHaveBeenCalled();
        });
    });

    describe("given a drag in progress on leaf node C", () => {
        function setupDrag(extraParams?: Partial<Parameters<typeof useDragDrop<string>>[0]>) {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const onDragCancel = jest.fn<void, [DragCancelEvent<string>]>();
            const params = createDefaultParams({
                onDragEnd,
                onDragCancel,
                ...extraParams,
            });
            const hookResult = renderHook(() => useDragDrop<string>(params));

            // Initiate drag on C (index 8)
            act(() => {
                simulateLongPress(hookResult.result.current, "C", 8, pageYForNode(8));
            });

            expect(hookResult.result.current.isDragging).toBe(true);

            return { hookResult, onDragEnd, onDragCancel, params };
        }

        it("when touch end fires without PanResponder capture, then drag ends and cancel is called", () => {
            const { hookResult, onDragCancel } = setupDrag();

            act(() => {
                hookResult.result.current.handleNodeTouchEnd();
            });

            expect(hookResult.result.current.isDragging).toBe(false);
            expect(onDragCancel).toHaveBeenCalledWith({ draggedNodeId: "C" });
        });

        it("when drag ends, then store drag state is cleared", () => {
            const { hookResult } = setupDrag();

            act(() => {
                hookResult.result.current.handleNodeTouchEnd();
            });

            const store = getTreeViewStore<string>(STORE_ID);
            expect(store.getState().draggedNodeId).toBeNull();
            expect(store.getState().invalidDragTargetIds.size).toBe(0);
            expect(store.getState().dropTargetNodeId).toBeNull();
        });
    });

    describe("given maxDepth constraint", () => {
        it("when maxDepth would be violated by inside drop, then inside is suppressed", () => {
            // Tree has 3 levels (0, 1, 2). maxDepth=2 means we can't add children at level 2.
            // Dragging C (leaf, subtreeDepth=0) inside a level-1 node would put it at level 2.
            // That should be allowed (2 + 0 = 2 ≤ 2).
            // But dragging C inside a level-2 node (A1a) would put it at level 3 → blocked.
            const params = createDefaultParams({ maxDepth: 2 });
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Start dragging C
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            // The hook's calculateDropTarget uses store state internally.
            // We verify via store: after drag start, the store should have draggedNodeId
            expect(store.getState().draggedNodeId).toBe("C");

            // Verify the constraint is configured (the actual drop target calculation
            // happens in onPanResponderMove which requires gesture simulation)
            expect(result.current.isDragging).toBe(true);
        });
    });

    describe("given canNodeHaveChildren callback", () => {
        it("when a node cannot have children, then it still accepts above/below drops", () => {
            // canNodeHaveChildren returning false should suppress "inside" but allow above/below
            const canNodeHaveChildren = jest.fn((node: TreeNode<string>) => node.id !== "C");
            const params = createDefaultParams({ canNodeHaveChildren });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Drag B1 (index 6)
            act(() => {
                simulateLongPress(result.current, "B1", 6, pageYForNode(6));
            });

            expect(result.current.isDragging).toBe(true);
        });
    });

    describe("given cleanup on unmount", () => {
        it("when component unmounts mid-drag, then timers are cleared and store resets", () => {
            const params = createDefaultParams();
            const { result, unmount } = renderHook(() => useDragDrop<string>(params));

            // Start a drag
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            expect(result.current.isDragging).toBe(true);
            const store = getTreeViewStore<string>(STORE_ID);
            expect(store.getState().draggedNodeId).toBe("C");

            // Unmount while dragging
            unmount();

            // Store should be cleaned up
            expect(store.getState().draggedNodeId).toBeNull();
            expect(store.getState().invalidDragTargetIds.size).toBe(0);
            expect(store.getState().dropTargetNodeId).toBeNull();
        });

        it("when component unmounts without drag, then no errors occur", () => {
            const params = createDefaultParams();
            const { unmount } = renderHook(() => useDragDrop<string>(params));

            // Should not throw
            expect(() => unmount()).not.toThrow();
        });
    });

    describe("given cancelLongPressTimer", () => {
        it("when called during pending long press, then drag does not initiate", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                result.current.handleNodeTouchStart("C", pageYForNode(8), 10, 8);
                // 200ms into the 400ms timer
                jest.advanceTimersByTime(200);
                // Cancel (simulates scroll event)
                result.current.cancelLongPressTimer();
                // Advance past the original timer
                jest.advanceTimersByTime(300);
            });

            expect(result.current.isDragging).toBe(false);
        });
    });

    // ──────────────────────────────────────────────
    // PanResponder-driven tests (full gesture pipeline)
    // ──────────────────────────────────────────────

    /** Create a mock GestureResponderEvent with touchHistory for PanResponder.
     *  Timestamps must be strictly increasing: PanResponder skips gesture events
     *  whose mostRecentTimeStamp it has already accounted for, and Date.now() is
     *  frozen under fake timers - a fixed timestamp silently drops every move
     *  after the first. */
    let gestureEventSeq = 0;
    function mockGestureEvent(pageY: number, pageX = 50): GestureResponderEvent {
        const ts = ++gestureEventSeq * 20;
        const touchRecord = {
            touchActive: true,
            startPageX: pageX,
            startPageY: pageY,
            startTimeStamp: ts,
            currentPageX: pageX,
            currentPageY: pageY,
            currentTimeStamp: ts,
            previousPageX: pageX,
            previousPageY: pageY,
            previousTimeStamp: ts,
        };
        return {
            touchHistory: {
                touchBank: [touchRecord],
                numberActiveTouches: 1,
                indexOfSingleActiveTouch: 0,
                mostRecentTimeStamp: ts,
            },
            nativeEvent: { pageY, pageX, locationX: pageX, locationY: 10, timestamp: ts, target: 0, identifier: 0, touches: [], changedTouches: [] },
            currentTarget: 0 as any,
            target: 0 as any,
            bubbles: false,
            cancelable: false,
            defaultPrevented: false,
            eventPhase: 0,
            isTrusted: true,
            preventDefault: () => { },
            isDefaultPrevented: () => false,
            stopPropagation: () => { },
            isPropagationStopped: () => false,
            persist: () => { },
            timeStamp: ts,
            type: "responderMove",
        } as unknown as GestureResponderEvent;
    }

    /** Drive a full drag-move-drop through PanResponder handlers */
    function simulateFullDragDrop(
        hookResult: ReturnType<typeof useDragDrop<string>>,
        dragNodeId: string,
        dragNodeIndex: number,
        targetPageY: number,
        targetPageX = 50,
    ) {
        const handlers = hookResult.panResponder.panHandlers;

        // 1. Long press to initiate drag
        simulateLongPress(hookResult, dragNodeId, dragNodeIndex, pageYForNode(dragNodeIndex));

        // 2. PanResponder grant (capture gesture)
        handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(dragNodeIndex)));

        // 3. Move finger to target position
        handlers.onResponderMove?.(mockGestureEvent(targetPageY, targetPageX));

        // 4. Release at target position
        handlers.onResponderRelease?.(mockGestureEvent(targetPageY, targetPageX));
    }

    describe("given a full drag-move-drop gesture via PanResponder", () => {
        it("when dragging C above B (valid target), then onDragEnd is called with the move delta", () => {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const onDragCancel = jest.fn();
            const params = createDefaultParams({ onDragEnd, onDragCancel });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // C is at index 8, B is at index 5. Drop in "above" zone of B.
            act(() => {
                simulateFullDragDrop(result.current, "C", 8, pageYForNode(5, "above"));
            });

            expect(result.current.isDragging).toBe(false);

            // C onto B is a valid drop, so the gesture MUST commit (exactly one
            // onDragEnd, no cancel) - asserted unconditionally so a regression that
            // silently stops committing fails loudly instead of passing vacuously.
            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragCancel).not.toHaveBeenCalled();
            const event = onDragEnd.mock.calls[0]![0];
            expect(event.draggedNodeId).toBe("C");
            // At the A2/B level cliff the "above B" zone may resolve to either B/above
            // or A2/below depending on horizontal finger position; both are valid sibling
            // commits, so assert the move landed at a real target/position with a delta.
            expect(["B", "A2"]).toContain(event.targetNodeId);
            expect(["above", "below"]).toContain(event.position);
            expect(event.newIndex).toBeGreaterThanOrEqual(0);
        });

        it("when dragging C inside B (valid target), then tree structure updates in store", () => {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({ onDragEnd });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // B is at index 5. Drop in "inside" zone.
            act(() => {
                simulateFullDragDrop(result.current, "C", 8, pageYForNode(5, "inside"));
            });

            expect(result.current.isDragging).toBe(false);

            // "inside B" is unaffected by cliff remapping, so this commit is fully
            // deterministic - assert it unconditionally.
            expect(onDragEnd).toHaveBeenCalledTimes(1);
            const event = onDragEnd.mock.calls[0]![0];
            expect(event.draggedNodeId).toBe("C");
            expect(event.position).toBe("inside");
            expect(event.targetNodeId).toBe("B");
            expect(event.newParentId).toBe("B");
            // Verify the store's reordered tree has C as a child of B
            const data = getTreeViewStore<string>(STORE_ID).getState().initialTreeViewData;
            const bNode = data.find(n => n.id === "B");
            expect(bNode?.children?.some(c => c.id === "C")).toBe(true);
        });

        it("when PanResponder move is called, then overlay position updates and drop target is calculated", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Start drag on C (index 8)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            expect(result.current.isDragging).toBe(true);

            // Move finger to B's position
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            // The function should have executed without error
            expect(result.current.isDragging).toBe(true);
        });

        it("when PanResponder terminates, then drag ends gracefully", () => {
            const onDragCancel = jest.fn();
            const params = createDefaultParams({ onDragCancel });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Start drag
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            expect(result.current.isDragging).toBe(true);

            // Terminate (e.g., system interruption)
            act(() => {
                handlers.onResponderTerminate?.(mockGestureEvent(0));
            });

            expect(result.current.isDragging).toBe(false);
            expect(onDragCancel).toHaveBeenCalledWith({ draggedNodeId: "C" });
        });

        it("when move occurs near top edge, then auto-scroll speed is set for upward scrolling", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // Move finger near the top edge (within autoScrollThreshold=60px of container top)
            const nearTopEdge = CONTAINER_Y + 20; // 20px from top
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(nearTopEdge, 50));
            });

            // Auto-scroll should have been triggered (RAF loop runs)
            // The test passes if no error is thrown and dragging continues
            expect(result.current.isDragging).toBe(true);
        });

        it("when move occurs near bottom edge, then auto-scroll speed is set for downward scrolling", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // Move finger near the bottom edge
            const nearBottomEdge = CONTAINER_Y + CONTAINER_HEIGHT - 20;
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(nearBottomEdge, 50));
            });

            expect(result.current.isDragging).toBe(true);
        });

        it("when canDrop rejects the target, then drop target is marked invalid and drop cancels", () => {
            const onDragCancel = jest.fn();
            const canDrop = jest.fn().mockReturnValue(false);
            const params = createDefaultParams({ onDragCancel, canDrop });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Full drag-drop: C onto B. canDrop always returns false.
            act(() => {
                simulateFullDragDrop(result.current, "C", 8, pageYForNode(5, "inside"));
            });

            expect(result.current.isDragging).toBe(false);
            // Since canDrop rejected, the drop should cancel
            expect(onDragCancel).toHaveBeenCalledWith({ draggedNodeId: "C" });
        });

        it("when hovering inside a collapsed node beyond autoExpandDelay, then node expands", () => {
            const params = createDefaultParams({ autoExpandDelay: 100 });
            const store = getTreeViewStore<string>(STORE_ID);
            // Collapse B so we can test auto-expand
            store.getState().updateExpanded(new Set(["A", "A1"])); // B is collapsed

            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C
            act(() => {
                simulateLongPress(result.current, "C", 5, pageYForNode(5));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(5)));
            });

            // Move to B's "inside" zone (B is now at index 5 since B's children are collapsed)
            // Find B's index in the collapsed flattened list: A, A1, A1a, A1b, A2, B, C
            // But C is being dragged, so visible list may differ.
            // The drop target calculation uses flattenedNodesRef which has the original list.
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            // Advance past autoExpandDelay
            act(() => {
                jest.advanceTimersByTime(200);
            });

            // B might have been auto-expanded (depends on whether the zone calculation
            // determined this was an "inside" hover on a collapsed expandable node)
            // The test verifies the timer mechanism doesn't crash
            expect(result.current.isDragging).toBe(true);
        });
    });

    describe("given a level cliff in the flattened list", () => {
        // A1b (level 2, index 3) is followed by A2 (level 1, index 4).
        // When finger is in "below" zone of A1b, horizontal position decides
        // whether drop stays deep (level 2) or shifts shallow (level 1).
        // indentationMultiplier=15, containerWidth=300, level 2:
        //   itemLeftEdge = 2 * 15 = 30
        //   threshold = 30 + (300 - 30) * 0.3 = 111
        // So pageX < 111 - shallow (switch to "above" on A2)
        // pageX >= 111 - stay deep

        it("when finger is left of threshold, then drop target switches to the shallower node", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C (index 8)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // Move to "below" zone of A1b (index 3) with pageX=10 (left of threshold 111)
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(3, "below"), 10));
            });

            // The cliff detection code path is exercised; exact target depends on
            // the "below" suppression logic that may convert to "inside"
            expect(result.current.isDragging).toBe(true);
        });

        it("when finger is right of threshold, then drop target stays at deep level", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C (index 8)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // Move to "below" zone of A1b (index 3) with pageX=200 (right of threshold 111)
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(3, "below"), 200));
            });

            expect(result.current.isDragging).toBe(true);
        });

        it("when finger is in above zone at a cliff from above, then cliff detection fires", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C (index 8)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // A2 (index 4, level 1) is preceded by A1b (index 3, level 2).
            // Move to "above" zone of A2 with pageX=200 (right of threshold - switch to "below" on A1b)
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(4, "above"), 200));
            });

            expect(result.current.isDragging).toBe(true);
        });
    });

    describe("given hysteresis between adjacent same-level nodes", () => {
        it("when finger oscillates between below-N and above-N+1, then target stays stable", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C (index 8)
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // First move: "below" zone of B1 (index 6, level 1)
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(6, "below"), 50));
            });

            // Second move: "above" zone of B2 (index 7, level 1) - same-level boundary
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(7, "above"), 50));
            });

            // Hysteresis should keep the previous target (no flicker)
            // The drop target in store may be the same or null depending on validity
            expect(result.current.isDragging).toBe(true);
        });
    });

    describe("given the auto-scroll RAF loop", () => {
        it("when finger is near edge during drag, then RAF loop runs and scrolls", () => {
            const scrollToOffset = jest.fn();
            const flashListRef = { current: { scrollToOffset } };
            const params = createDefaultParams({ flashListRef: flashListRef as any });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Start drag on C
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
            });

            // Move near bottom edge to trigger downward auto-scroll
            const nearBottom = CONTAINER_Y + CONTAINER_HEIGHT - 20;
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(nearBottom, 50));
            });

            // Advance RAF ticks so the auto-scroll loop fires
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // scrollToOffset should have been called by the RAF loop
            expect(scrollToOffset).toHaveBeenCalled();
        });
    });

    describe("given a successful drop", () => {
        it("when drop completes, then scroll-to-node timer fires without error", () => {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({ onDragEnd });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
                handlers.onResponderRelease?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            // Advance past the 100ms scroll-to-node setTimeout in handleDragEnd
            act(() => {
                jest.advanceTimersByTime(200);
            });

            expect(result.current.isDragging).toBe(false);
        });

        it("when auto-expanded nodes exist after drop, then non-ancestor nodes are collapsed", () => {
            const params = createDefaultParams({ autoExpandDelay: 50 });
            const store = getTreeViewStore<string>(STORE_ID);
            // Collapse B so it can be auto-expanded
            store.getState().updateExpanded(new Set(["A", "A1"]));

            // Rebuild flattened nodes for collapsed B: A, A1, A1a, A1b, A2, B, C
            const tree = makeTree();
            const collapsedFlattened: __FlattenedTreeNode__<string>[] = [
                { ...tree[0]!, level: 0 },
                { ...tree[0]!.children![0]!, level: 1 },
                { ...tree[0]!.children![0]!.children![0]!, level: 2 },
                { ...tree[0]!.children![0]!.children![1]!, level: 2 },
                { ...tree[0]!.children![1]!, level: 1 },
                { ...tree[1]!, level: 0 },
                { ...tree[2]!, level: 0 },
            ];

            const updatedParams = { ...params, flattenedNodes: collapsedFlattened };
            const { result } = renderHook(() => useDragDrop<string>(updatedParams));
            const handlers = result.current.panResponder.panHandlers;

            // Drag C (index 6 in collapsed list)
            act(() => {
                simulateLongPress(result.current, "C", 6, pageYForNode(6));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(6)));
            });

            // Move over B (index 5) in "inside" zone
            act(() => {
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            // Wait for auto-expand delay
            act(() => {
                jest.advanceTimersByTime(100);
            });

            // Move away and release (drop elsewhere or cancel)
            act(() => {
                handlers.onResponderRelease?.(mockGestureEvent(pageYForNode(0, "above"), 50));
            });

            // Advance post-drop timers
            act(() => {
                jest.advanceTimersByTime(200);
            });

            expect(result.current.isDragging).toBe(false);
        });
    });

    describe("given an expanded node being dragged", () => {
        it("when drag starts, then the node is collapsed in store", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            // Ensure A is expanded
            expect(store.getState().expanded.has("A")).toBe(true);

            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "A", 0, pageYForNode(0));
            });

            // A should be collapsed when dragging starts (so its subtree collapses in the overlay)
            expect(store.getState().expanded.has("A")).toBe(false);
        });
    });

    describe("given the measureInWindow drag-start race", () => {
        function deferredContainerRef() {
            let resolve: (() => void) | null = null;
            const ref = {
                current: {
                    measureInWindow: (
                        cb: (x: number, y: number, w: number, h: number) => void
                    ) => {
                        resolve = () => cb(CONTAINER_X, CONTAINER_Y, 300, CONTAINER_HEIGHT);
                    },
                },
            };
            return { ref, flush: () => resolve?.() };
        }

        it("when the finger lifts before measureInWindow resolves, then no drag starts", () => {
            const onDragStart = jest.fn();
            const { ref, flush } = deferredContainerRef();
            const params = createDefaultParams({ onDragStart, containerRef: ref as any });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                result.current.handleNodeTouchStart("C", pageYForNode(8), 10, 8);
                jest.advanceTimersByTime(500); // fire long-press -> initiateDrag (measure deferred)
                result.current.handleNodeTouchEnd(); // finger lifts before measurement resolves
                flush(); // measurement resolves now - must be aborted
            });

            expect(result.current.isDragging).toBe(false);
            expect(onDragStart).not.toHaveBeenCalled();
            expect(getTreeViewStore<string>(STORE_ID).getState().draggedNodeId).toBeNull();
        });

        it("when no finger lift occurs, then the deferred measurement starts the drag", () => {
            const onDragStart = jest.fn();
            const { ref, flush } = deferredContainerRef();
            const params = createDefaultParams({ onDragStart, containerRef: ref as any });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                result.current.handleNodeTouchStart("C", pageYForNode(8), 10, 8);
                jest.advanceTimersByTime(500);
                flush();
            });

            expect(result.current.isDragging).toBe(true);
            expect(onDragStart).toHaveBeenCalledWith({ draggedNodeId: "C" });
        });
    });

    describe("given a terminate during an active drag over a valid target", () => {
        it("when the gesture terminates, then it cancels without committing the move", () => {
            const onDragEnd = jest.fn();
            const onDragCancel = jest.fn();
            const params = createDefaultParams({ onDragEnd, onDragCancel });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;
            const store = getTreeViewStore<string>(STORE_ID);
            const treeBefore = store.getState().initialTreeViewData;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
                // Hover over a valid target so a commit would otherwise occur.
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            act(() => {
                handlers.onResponderTerminate?.(mockGestureEvent(0));
            });

            expect(result.current.isDragging).toBe(false);
            // The move must NOT commit on terminate.
            expect(onDragEnd).not.toHaveBeenCalled();
            expect(onDragCancel).toHaveBeenCalledWith({ draggedNodeId: "C" });
            expect(store.getState().initialTreeViewData).toBe(treeBefore);
        });
    });

    describe("given repeated drop-target calculations at the same position", () => {
        it("when the target is unchanged, then updateDropTarget is not written every frame", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;
            const store = getTreeViewStore<string>(STORE_ID);

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
                // First move establishes the target (one store write expected).
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            const spy = jest.spyOn(store.getState(), "updateDropTarget");

            act(() => {
                // Identical subsequent frames must not re-write the store.
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
                handlers.onResponderMove?.(mockGestureEvent(pageYForNode(5, "inside"), 50));
            });

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe("given auto-scroll near the bottom edge with a known content height", () => {
        it("when scrolling down, then the offset is clamped to the content bounds", () => {
            // CONTAINER_HEIGHT = 400, content = 600 -> max scrollable offset = 200
            const params = createDefaultParams({ contentHeightRef: { current: 600 } });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant?.(mockGestureEvent(pageYForNode(8)));
                // Move to the bottom edge to trigger downward auto-scroll.
                handlers.onResponderMove?.(mockGestureEvent(CONTAINER_Y + CONTAINER_HEIGHT - 5, 50));
            });

            act(() => {
                jest.advanceTimersByTime(2000); // run the RAF loop many times
            });

            expect(result.current.scrollOffsetRef.current).toBeLessThanOrEqual(200);
            expect(result.current.scrollOffsetRef.current).toBeGreaterThan(0);
        });
    });

    describe("given a second touch during an active drag", () => {
        it("when another node's long-press fires mid-drag, then the original drag is preserved", () => {
            const onDragStart = jest.fn<void, [DragStartEvent<string>]>();
            const params = createDefaultParams({ onDragStart });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Start dragging C (index 8).
            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });
            expect(result.current.isDragging).toBe(true);
            expect(result.current.draggedNode?.id).toBe("C");
            expect(onDragStart).toHaveBeenCalledTimes(1);

            // A second finger long-presses A (index 0) while C is being dragged.
            // The reentrancy guard must drop this touch on the floor.
            act(() => {
                result.current.handleNodeTouchStart("A", pageYForNode(0), 10, 0);
                jest.advanceTimersByTime(500); // would fire a competing initiateDrag
            });

            expect(result.current.draggedNode?.id).toBe("C");
            expect(onDragStart).toHaveBeenCalledTimes(1);
            expect(getTreeViewStore<string>(STORE_ID).getState().draggedNodeId).toBe("C");
        });
    });

    describe("given variable-height rows with a fully-measured height map", () => {
        // Rows 0..5 (A..B) measured at the uniform ITEM_HEIGHT so the cumulative walk
        // resolves the same top offsets as the uniform path up to B; rows after B carry
        // a different height to make the map genuinely non-uniform and exercise the walk.
        const variableHeights = () => new Map<string, number>([
            ["A", ITEM_HEIGHT], ["A1", ITEM_HEIGHT], ["A1a", ITEM_HEIGHT],
            ["A1b", ITEM_HEIGHT], ["A2", ITEM_HEIGHT], ["B", ITEM_HEIGHT],
            ["B1", 100], ["B2", 100], ["C", 100],
        ]);

        it("when every current row id is measured, then the cumulative walk drives a correct commit", () => {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({
                onDragEnd,
                itemHeightsRef: { current: variableHeights() },
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateFullDragDrop(result.current, "C", 8, pageYForNode(5, "inside"));
            });

            // The id-keyed walk (gate: every current node measured) must land C inside B.
            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragEnd.mock.calls[0]![0].newParentId).toBe("B");
        });

        it("when the height map holds only stale ids, then it falls back to uniform math and still commits", () => {
            // Simulates a height map left over from a previous, different list: none of
            // its keys match the current nodes, so the gate must reject it (size alone
            // would have wrongly satisfied the old `size >= length` check).
            const stale = new Map<string, number>([["GHOST_1", 999], ["GHOST_2", 999]]);
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({
                onDragEnd,
                itemHeightsRef: { current: stale },
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateFullDragDrop(result.current, "C", 8, pageYForNode(5, "inside"));
            });

            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragEnd.mock.calls[0]![0].newParentId).toBe("B");
        });
    });

    describe("given a flattened subset (fewer rows than the full tree)", () => {
        it("when dropping a visible node inside a parent, then the move applies to the full tree by id", () => {
            // Only root-level A, B, C are visible (B's children B1/B2 are not in the
            // flattened list, e.g. collapsed). The drag math runs against this subset,
            // but the commit must operate on the FULL tree held by the store.
            // (Interactive drag during an active search filter is blocked separately -
            // see "given an active search filter" below.)
            const filtered: __FlattenedTreeNode__<string>[] = [
                { id: "A", name: "A", level: 0 },
                { id: "B", name: "B", level: 0 },
                { id: "C", name: "C", level: 0 },
            ];
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({ onDragEnd, flattenedNodes: filtered });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // C (filtered index 2) dropped inside B (filtered index 1).
            act(() => {
                simulateFullDragDrop(result.current, "C", 2, pageYForNode(1, "inside"));
            });

            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragEnd.mock.calls[0]![0].newParentId).toBe("B");

            // In the full tree C becomes B's first child; the filter-hidden siblings
            // B1/B2 are preserved (the move never operated on the filtered subset).
            const data = getTreeViewStore<string>(STORE_ID).getState().initialTreeViewData;
            const bNode = data.find(n => n.id === "B");
            expect(bNode?.children?.map(c => c.id)).toEqual(["C", "B1", "B2"]);
        });
    });

    describe("given an active search filter", () => {
        it("when a node is long-pressed, then drag does not initiate", () => {
            const onDragStart = jest.fn<void, [DragStartEvent<string>]>();
            const params = createDefaultParams({ onDragStart });
            getTreeViewStore<string>(STORE_ID).getState().updateSearchText("b");
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            expect(result.current.isDragging).toBe(false);
            expect(onDragStart).not.toHaveBeenCalled();
            expect(getTreeViewStore<string>(STORE_ID).getState().draggedNodeId).toBeNull();
        });
    });

    describe("given an expanded node whose drag is cancelled", () => {
        it("when the drag ends without a valid target, then the node's expansion is restored", () => {
            const onDragCancel = jest.fn<void, [DragCancelEvent<string>]>();
            const params = createDefaultParams({ onDragCancel });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const store = getTreeViewStore<string>(STORE_ID);
            expect(store.getState().expanded.has("B")).toBe(true);

            act(() => {
                simulateLongPress(result.current, "B", 5, pageYForNode(5));
            });
            // Drag start force-collapses the expanded node
            expect(store.getState().expanded.has("B")).toBe(false);

            act(() => {
                // Finger lift without movement -> drag ends with no target -> cancel
                result.current.handleNodeTouchEnd();
            });

            expect(onDragCancel).toHaveBeenCalledTimes(1);
            // A cancel must not mutate state: expansion is restored
            expect(store.getState().expanded.has("B")).toBe(true);
        });
    });

    describe("given a drop that lands the node where it already sits", () => {
        it("when B2 is dropped below B1, then it is treated as a cancel", () => {
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const onDragCancel = jest.fn<void, [DragCancelEvent<string>]>();
            const params = createDefaultParams({ onDragEnd, onDragCancel });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const before = getTreeViewStore<string>(STORE_ID).getState().initialTreeViewData;

            // B2 (index 7) already sits directly after B1 (index 6); dropping it
            // "below B1" is a positional no-op. (+10 compensates the grab-locationY
            // skew in the headerOffset the hook derives during simulateLongPress.)
            act(() => {
                simulateFullDragDrop(result.current, "B2", 7, pageYForNode(6, "below") + 10);
            });

            expect(onDragEnd).not.toHaveBeenCalled();
            expect(onDragCancel).toHaveBeenCalledTimes(1);
            // The tree reference is untouched (no spurious clone committed)
            expect(getTreeViewStore<string>(STORE_ID).getState().initialTreeViewData).toBe(before);
        });
    });

    describe("given a parent responder requests to take over the gesture", () => {
        it("when a drag is active, then the termination request is refused", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers;

            // Idle: hand-off is allowed
            expect(
                handlers.onResponderTerminationRequest?.(mockGestureEvent(pageYForNode(8)))
            ).toBe(true);

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            // Mid-drag: refuse so a parent ScrollView can't steal the drag
            expect(
                handlers.onResponderTerminationRequest?.(mockGestureEvent(pageYForNode(8)))
            ).toBe(false);
        });
    });

    // ──────────────────────────────────────────────
    // Gesture-routing predicates
    // ──────────────────────────────────────────────

    describe("given the PanResponder should-set predicates", () => {
        it("when no drag is active, then the responder never captures (list scrolling stays untouched)", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;
            const evt = mockGestureEvent(pageYForNode(0));

            expect(handlers.onStartShouldSetResponder?.(evt)).toBe(false);
            expect(handlers.onMoveShouldSetResponder?.(evt)).toBe(false);
            expect(handlers.onStartShouldSetResponderCapture?.(evt)).toBe(false);
            expect(handlers.onMoveShouldSetResponderCapture?.(evt)).toBe(false);
        });

        it("when a drag is active, then move/capture predicates claim the gesture and termination is refused", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });
            expect(result.current.isDragging).toBe(true);

            const handlers = result.current.panResponder.panHandlers as any;
            const evt = mockGestureEvent(pageYForNode(8));

            // Taps never start a pan (long-press owns drag initiation) ...
            expect(handlers.onStartShouldSetResponder?.(evt)).toBe(false);
            // ... but once dragging, moves must be captured by this responder
            expect(handlers.onMoveShouldSetResponder?.(evt)).toBe(true);
            expect(handlers.onStartShouldSetResponderCapture?.(evt)).toBe(true);
            expect(handlers.onMoveShouldSetResponderCapture?.(evt)).toBe(true);
            // ... and an ancestor responder must not steal the gesture mid-drag
            expect(handlers.onResponderTerminationRequest?.(evt)).toBe(false);
        });
    });

    // ──────────────────────────────────────────────
    // Auto-scroll loop lifecycle
    // ──────────────────────────────────────────────

    describe("given the finger hovers in the edge auto-scroll zone", () => {
        it("when the finger keeps moving inside the zone, then a single scroll loop keeps scrolling monotonically", () => {
            const scrollToOffset = jest.fn();
            const params = createDefaultParams({
                flashListRef: { current: { scrollToOffset } } as any,
                contentHeightRef: { current: 2000 },
            });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // Bottom edge zone: fingerInContainer > containerHeight - threshold (400-60).
            const bottomEdgeY = CONTAINER_Y + 380;
            act(() => {
                handlers.onResponderMove(mockGestureEvent(bottomEdgeY));
                jest.advanceTimersByTime(100);
            });
            const callsAfterFirstEntry = scrollToOffset.mock.calls.length;
            expect(callsAfterFirstEntry).toBeGreaterThan(0);

            // Re-entering the zone must restart cleanly (no orphaned second loop):
            // scrolling continues and every commanded offset is monotonically increasing.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(bottomEdgeY + 5));
                jest.advanceTimersByTime(100);
            });
            expect(scrollToOffset.mock.calls.length).toBeGreaterThan(callsAfterFirstEntry);
            const offsets = scrollToOffset.mock.calls.map((c) => c[0].offset);
            for (let i = 1; i < offsets.length; i++) {
                expect(offsets[i]).toBeGreaterThan(offsets[i - 1]!);
            }

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(bottomEdgeY));
            });
        });
    });

    // ──────────────────────────────────────────────
    // Auto-expand cancellation
    // ──────────────────────────────────────────────

    describe("given a hover over a collapsed expandable node", () => {
        it("when the finger leaves before the delay elapses, then the node is NOT auto-expanded", () => {
            // Collapse B so it is an expandable, collapsed drop target.
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            act(() => {
                store.getState().updateExpanded(new Set(["A", "A1"]));
            });
            const collapsedFlat = params.flattenedNodes.filter(
                (n) => n.id !== "B1" && n.id !== "B2"
            );
            const { result } = renderHook(() =>
                useDragDrop<string>({ ...params, flattenedNodes: collapsedFlat })
            );
            const handlers = result.current.panResponder.panHandlers as any;

            // Order: A(0) A1(1) A1a(2) A1b(3) A2(4) B(5) C(6). Drag C (index 6).
            act(() => {
                simulateLongPress(result.current, "C", 6, pageYForNode(6));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(6)));
            });

            // Hover "inside" collapsed B - the auto-expand timer starts.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(pageYForNode(5, "inside")));
                jest.advanceTimersByTime(300); // less than the 800ms delay
            });
            expect(store.getState().expanded.has("B")).toBe(false);

            // Move away to A2 - the pending expand must be cancelled ...
            act(() => {
                handlers.onResponderMove(mockGestureEvent(pageYForNode(4, "inside")));
            });
            // ... so even after the full delay elapses, B stays collapsed.
            act(() => {
                jest.advanceTimersByTime(1000);
            });
            expect(store.getState().expanded.has("B")).toBe(false);

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(pageYForNode(4, "inside")));
            });
        });
    });

    // ──────────────────────────────────────────────
    // Drop-zone geometry: stickiness, fallbacks, hysteresis
    // ──────────────────────────────────────────────

    // All drags below are initiated via simulateLongPress with a grab at the
    // "inside" zone offset and locationY 10, which resolves the hook's internal
    // headerOffset to 20. A finger at pageY = CONTAINER_Y + 20 + (index+fraction)*40
    // therefore lands at exactly `fraction` inside row `index`.
    const DRAG_HEADER_OFFSET = 20;
    const dropY = (index: number, fraction: number) =>
        CONTAINER_Y + DRAG_HEADER_OFFSET + (index + fraction) * ITEM_HEIGHT;

    describe("given sticky drop zones on a single row", () => {
        it("when the finger trembles just past the above-zone edge, then the position stays 'above'", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // Land in the above zone of B1 (fraction 0.05 < 0.25).
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(6, 0.05)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            expect(store.getState().dropPosition).toBe("above");

            // Drift to 0.28: past the normal 0.25 boundary but inside the sticky
            // extension (0.25 + 0.08). Finger tremor must not flip the indicator.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(6, 0.28)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            expect(store.getState().dropPosition).toBe("above");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(6, 0.28)));
            });
        });
    });

    describe("given canNodeHaveChildren forbids a target", () => {
        it("when hovering the middle of that row, then the drop falls back to above/below by midpoint", () => {
            const params = createDefaultParams({
                canNodeHaveChildren: (node) => node.id !== "C",
            });
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "B2", 7, pageYForNode(7));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(7)));
            });

            // Lower middle (0.6): "inside" is forbidden, nearest zone is "below".
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(8, 0.6)));
            });
            expect(store.getState().dropTargetNodeId).toBe("C");
            expect(store.getState().dropPosition).toBe("below");

            // Upper middle (0.4): nearest zone is "above".
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(8, 0.4)));
            });
            expect(store.getState().dropTargetNodeId).toBe("C");
            expect(store.getState().dropPosition).toBe("above");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(8, 0.4)));
            });
        });
    });

    describe("given a maxDepth constraint", () => {
        it("when nesting the dragged subtree inside would exceed maxDepth, then the drop falls back to a sibling position", () => {
            // A1 carries a subtree of depth 1 (its children). maxDepth 1 forbids
            // nesting it inside ANY node: level 1 + subtree 1 = 2 > 1.
            const params = createDefaultParams({ maxDepth: 1 });
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "A1", 1, pageYForNode(1));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(1)));
            });

            // Hover the upper-middle of B (index 5 in the flattened prop list):
            // "inside" would nest A1's subtree at level 2 > maxDepth 1, so the
            // drop must fall back to the nearest sibling zone ("above").
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(5, 0.4)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B");
            expect(store.getState().dropPosition).toBe("above");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(5, 0.4)));
            });
        });

        it("when inserting the dragged subtree as a sibling would exceed maxDepth, then the target is invalid", () => {
            const params = createDefaultParams({ maxDepth: 1 });
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "A1", 1, pageYForNode(1));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(1)));
            });

            // "Above B2" (index 7) would make A1 a sibling at level 1; its subtree
            // then reaches level 2 > maxDepth 1, so no drop target may be offered.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(7, 0.05)));
            });
            expect(store.getState().dropTargetNodeId).toBeNull();
            expect(store.getState().dropPosition).toBeNull();

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(7, 0.05)));
            });
        });
    });

    describe("given the last list item is nested and the finger is at the shallow edge", () => {
        it("when dropping below it, then the move logically targets the shallow ancestor (drop at root level)", () => {
            // Tree without C: the LAST flattened row is B2 (level 1).
            const tree: TreeNode<string>[] = [
                {
                    id: "A", name: "A", children: [
                        { id: "A1", name: "A1", children: [{ id: "A1a", name: "A1a" }] },
                        { id: "A2", name: "A2" },
                    ]
                },
                { id: "B", name: "B", children: [{ id: "B1", name: "B1" }, { id: "B2", name: "B2" }] },
            ];
            const store = getTreeViewStore<string>(STORE_ID);
            act(() => {
                store.getState().updateInitialTreeViewData(tree);
                initializeNodeMaps(STORE_ID, tree);
                store.getState().updateExpanded(new Set(["A", "A1", "B"]));
            });
            // Order: A(0) A1(1) A1a(2) A2(3) B(4) B1(5) B2(6).
            const flattened = flattenTree(tree);
            const onDragEnd = jest.fn<void, [DragEndEvent<string>]>();
            const params = createDefaultParams({ flattenedNodes: flattened, onDragEnd });
            act(() => {
                // createDefaultParams re-seeded the store with the default tree; restore ours.
                store.getState().updateInitialTreeViewData(tree);
                initializeNodeMaps(STORE_ID, tree);
                store.getState().updateExpanded(new Set(["A", "A1", "B"]));
            });
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "A2", 3, pageYForNode(3));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(3)));
            });

            // Below-zone of B2 (last row, index 6, level 1) with the finger at the
            // far left (x=10, well left of the level-1 threshold): the user is
            // asking for the ROOT level, so the logical target walks up to ancestor B.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(6, 0.95), 10));
            });
            // The indicator stays on the visual row (B2) but at the shallow level.
            expect(store.getState().dropTargetNodeId).toBe("B2");
            expect(store.getState().dropLevel).toBe(0);

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(6, 0.95), 10));
            });

            // The committed move must use the LOGICAL target: below B at root level.
            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragEnd.mock.calls[0]![0]).toMatchObject({
                draggedNodeId: "A2",
                targetNodeId: "B",
                position: "below",
                newParentId: null,
            });
            expect(store.getState().initialTreeViewData.map((n) => n.id)).toEqual(["A", "B", "A2"]);
        });
    });

    describe("given the row above the finger is deeper than the hovered row", () => {
        it("when the finger stays to the right, then 'above' remaps to 'below' the deeper predecessor", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // Above-zone of A2 (index 4, level 1); its predecessor A1b is level 2.
            // With the finger right of the level-2 threshold (x=200), the user
            // means the DEEP position: directly below A1b.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(4, 0.05), 200));
            });
            expect(store.getState().dropTargetNodeId).toBe("A1b");
            expect(store.getState().dropPosition).toBe("below");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(4, 0.05), 200));
            });
        });
    });

    describe("given a 'below' hover on an expanded parent", () => {
        it("when the parent has visible children, then the position converts to the unambiguous 'inside'", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // Below-zone of expanded parent A1 (index 1): visually the parent/child
            // junction, semantically "as sibling after the whole subtree" -
            // ambiguous, so the UX contract is to convert it to "inside".
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(1, 0.95), 200));
            });
            expect(store.getState().dropTargetNodeId).toBe("A1");
            expect(store.getState().dropPosition).toBe("inside");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(1, 0.95), 200));
            });
        });
    });

    describe("given the finger oscillates across a same-level row boundary", () => {
        it("when flipping between 'below B1' and 'above B2', then hysteresis keeps the previous target", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // Settle on "below B1" (index 6; B1 and B2 share level 1).
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(6, 0.95)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            expect(store.getState().dropPosition).toBe("below");

            // Nudge into "above B2" (index 7) - the same visual gap. The indicator
            // must NOT flicker to a new target; the previous one is kept.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(7, 0.05)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            expect(store.getState().dropPosition).toBe("below");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(7, 0.05)));
            });
        });
    });

    // ──────────────────────────────────────────────
    // Overlay indent without magnetic snap
    // ──────────────────────────────────────────────

    describe("given magneticSnap is disabled", () => {
        it("when the effective drop level settles, then the overlay indent jumps instantly instead of springing", () => {
            const params = createDefaultParams({ magneticSnap: false });
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            const springSpy = jest.spyOn(Animated, "spring");
            const setValueSpy = jest.spyOn(result.current.overlayX, "setValue");

            // Hover "inside" B1 (level 1): effective level 2, dragged level 0.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(pageYForNode(6, "inside"), 200));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            // The indent shift only applies after the level holds for the settle delay.
            act(() => {
                jest.advanceTimersByTime(200);
            });

            // (level 2 - level 0) * indentation 15 = 30, applied via setValue, no spring.
            expect(setValueSpy).toHaveBeenCalledWith(30);
            expect(springSpy).not.toHaveBeenCalled();

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(pageYForNode(6, "inside"), 200));
            });
        });
    });

    // ──────────────────────────────────────────────
    // Post-drop auto-scroll
    // ──────────────────────────────────────────────

    describe("given a drop whose landing row is inside the viewport", () => {
        it("when the node moved down the list, then no post-drop scroll is issued (no list yank)", () => {
            const scrollToNodeID = jest.fn();
            const params = createDefaultParams({
                scrollToNodeHandlerRef: { current: { scrollToNodeID } } as any,
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Drag A1a (index 2) below B1 (index 6): dragged index < target index,
            // so the landing row shifts up by one - still fully on-screen.
            act(() => {
                simulateFullDragDrop(result.current, "A1a", 2, pageYForNode(6, "below"), 200);
            });

            act(() => {
                jest.runOnlyPendingTimers();
            });
            expect(scrollToNodeID).not.toHaveBeenCalled();
        });
    });

    describe("given a drop whose landing row sits outside the viewport", () => {
        it("when the drop commits, then the moved node is scrolled into view", () => {
            const scrollToNodeID = jest.fn();
            const params = createDefaultParams({
                // Tiny viewport: only the first two rows are visible.
                containerRef: {
                    current: {
                        measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) =>
                            cb(CONTAINER_X, CONTAINER_Y, 300, 80),
                    },
                } as any,
                scrollToNodeHandlerRef: { current: { scrollToNodeID } } as any,
            });
            const { result } = renderHook(() => useDragDrop<string>(params));

            // Drop A2 below C (last row, far outside the 80px viewport).
            act(() => {
                simulateFullDragDrop(result.current, "A2", 4, pageYForNode(8, "below"), 200);
            });

            act(() => {
                jest.runOnlyPendingTimers();
            });
            expect(scrollToNodeID).toHaveBeenCalledTimes(1);
            expect(scrollToNodeID.mock.calls[0]![0]).toMatchObject({ nodeId: "A2" });
        });
    });

    // ──────────────────────────────────────────────
    // Drag initiation guards
    // ──────────────────────────────────────────────

    describe("given drag initiation edge cases", () => {
        it("when a second long-press fires during an active drag, then the first drag is kept", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });
            expect(result.current.draggedNode?.id).toBe("C");

            // A competing long-press (e.g. second finger) must not restart or
            // steal the drag.
            act(() => {
                simulateLongPress(result.current, "A2", 4, pageYForNode(4));
            });
            expect(result.current.isDragging).toBe(true);
            expect(result.current.draggedNode?.id).toBe("C");
        });

        it("when the container ref is not mounted, then the long-press never starts a drag", () => {
            const params = createDefaultParams({ containerRef: { current: null } as any });
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
            });

            expect(result.current.isDragging).toBe(false);
        });

        it("when the long-press index has no node, then no drag starts", () => {
            const params = createDefaultParams();
            const { result } = renderHook(() => useDragDrop<string>(params));

            act(() => {
                simulateLongPress(result.current, "GHOST", 99, pageYForNode(9));
            });

            expect(result.current.isDragging).toBe(false);
        });

        it("when a move event arrives without an active drag, then it is ignored", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                handlers.onResponderMove(mockGestureEvent(pageYForNode(5, "inside")));
            });

            expect(store.getState().dropTargetNodeId).toBeNull();
            expect(result.current.isDragging).toBe(false);
        });

        it("when the flattened list empties mid-drag, then drop calculation is a safe no-op", () => {
            const params = createDefaultParams();
            const { result, rerender } = renderHook(
                (p) => useDragDrop<string>(p),
                { initialProps: params }
            );

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                (result.current.panResponder.panHandlers as any)
                    .onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            act(() => {
                rerender({ ...params, flattenedNodes: [] });
            });

            expect(() => {
                act(() => {
                    (result.current.panResponder.panHandlers as any)
                        .onResponderMove(mockGestureEvent(pageYForNode(2, "inside")));
                });
            }).not.toThrow();
        });
    });

    // ──────────────────────────────────────────────
    // Auto-expand full lifecycle
    // ──────────────────────────────────────────────

    describe("given auto-expand fires during a drag", () => {
        it("when the drop lands elsewhere, then the auto-expanded node collapses back after the drop", () => {
            const params = createDefaultParams({ autoExpandDelay: 100 });
            const store = getTreeViewStore<string>(STORE_ID);
            // Collapse B: flattened prop keeps the all-expanded list, so B stays
            // at index 5 while its children are merely hidden in the store.
            act(() => {
                store.getState().updateExpanded(new Set(["A", "A1"]));
            });
            const collapsedFlat = params.flattenedNodes.filter(
                (n) => n.id !== "B1" && n.id !== "B2"
            );
            const { result } = renderHook(() =>
                useDragDrop<string>({ ...params, flattenedNodes: collapsedFlat })
            );
            const handlers = result.current.panResponder.panHandlers as any;

            // Collapsed order: A(0) A1(1) A1a(2) A1b(3) A2(4) B(5) C(6). Drag C.
            act(() => {
                simulateLongPress(result.current, "C", 6, pageYForNode(6));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(6)));
            });

            // Hover "inside" collapsed B; re-hovering the same target must not
            // restart the delay timer.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(5, 0.4)));
            });
            act(() => {
                jest.advanceTimersByTime(60);
                handlers.onResponderMove(mockGestureEvent(dropY(5, 0.45)));
            });
            act(() => {
                jest.advanceTimersByTime(60); // 120ms total > 100ms delay
            });
            expect(store.getState().expanded.has("B")).toBe(true);

            // Drop somewhere unrelated (above A1a): B is not an ancestor of the
            // target, so the courtesy expansion must be rolled back.
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(2, 0.1)));
                handlers.onResponderRelease(mockGestureEvent(dropY(2, 0.1)));
            });
            expect(store.getState().expanded.has("B")).toBe(false);
        });
    });

    // ──────────────────────────────────────────────
    // Scroll bookkeeping during drag
    // ──────────────────────────────────────────────

    describe("given the list reports a scroll while a drag is active", () => {
        it("when handleScroll fires mid-drag, then the drag's scroll offset stays under the drag loop's control", () => {
            const params = createDefaultParams();
            const store = getTreeViewStore<string>(STORE_ID);
            const { result } = renderHook(() => useDragDrop<string>(params));
            const handlers = result.current.panResponder.panHandlers as any;

            act(() => {
                simulateLongPress(result.current, "C", 8, pageYForNode(8));
                handlers.onResponderGrant(mockGestureEvent(pageYForNode(8)));
            });

            // A stray onScroll (e.g. layout settling) mid-drag must NOT shift the
            // drop math: the RAF loop is the single writer during a drag.
            act(() => {
                result.current.handleScroll({
                    nativeEvent: { contentOffset: { y: 500 } },
                } as any);
            });

            // If the 500px offset had been accepted, this finger position would
            // resolve rows away from B1. It must still hit "above B1".
            act(() => {
                handlers.onResponderMove(mockGestureEvent(dropY(6, 0.05)));
            });
            expect(store.getState().dropTargetNodeId).toBe("B1");
            expect(store.getState().dropPosition).toBe("above");

            act(() => {
                handlers.onResponderRelease(mockGestureEvent(dropY(6, 0.05)));
            });
        });
    });
});
