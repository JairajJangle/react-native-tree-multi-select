jest.mock("zustand");

jest.mock("fast-is-equal", () => ({
    fastIsEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
}));

import { renderHook, act } from "@testing-library/react-native";
import { scrollMovedNodeIntoView, useScrollToNode } from "../hooks/useScrollToNode";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps } from "../helpers";
import type { __FlattenedTreeNode__, TreeNode } from "../types/treeView.types";
import type { ScrollToNodeHandlerRef } from "../hooks/useScrollToNode";
import { createRef, type MutableRefObject } from "react";

const STORE_ID = "scroll-test-store";

const treeData: TreeNode<string>[] = [
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
    { id: "B", name: "B" },
];

function initStore() {
    const store = getTreeViewStore<string>(STORE_ID);
    store.getState().updateInitialTreeViewData(treeData);
    initializeNodeMaps(STORE_ID, treeData);
    return store;
}

/** Build flattened nodes for currently expanded state */
function buildFlatNodes(expandedIds: Set<string>): __FlattenedTreeNode__<string>[] {
    const flat: __FlattenedTreeNode__<string>[] = [];
    function walk(nodes: TreeNode<string>[], level: number) {
        for (const node of nodes) {
            flat.push({ ...node, level });
            if (node.children && expandedIds.has(node.id)) {
                walk(node.children, level + 1);
            }
        }
    }
    walk(treeData, 0);
    return flat;
}

function makeProps(overrides?: Partial<Parameters<typeof useScrollToNode<string>>[0]>) {
    const scrollToNodeHandlerRef = createRef<ScrollToNodeHandlerRef<string>>() as MutableRefObject<ScrollToNodeHandlerRef<string> | null>;
    const flashListRef: MutableRefObject<any> = { current: { scrollToIndex: jest.fn() } };
    const setInitialScrollIndex = jest.fn();
    const flattenedFilteredNodes = buildFlatNodes(new Set());

    return {
        storeId: STORE_ID,
        scrollToNodeHandlerRef,
        flashListRef,
        flattenedFilteredNodes,
        setInitialScrollIndex,
        initialScrollNodeID: undefined as string | undefined,
        ...overrides,
    };
}

describe("useScrollToNode", () => {
    beforeEach(() => {
        initStore();
    });

    it("given an initialScrollNodeID, when first rendered with the node in the list, then setInitialScrollIndex is called once and subsequent re-renders are skipped", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        // Expand A so that A1 is visible at index 1
        act(() => {
            store.getState().updateExpanded(new Set(["A"]));
        });

        const flatNodes = buildFlatNodes(new Set(["A"]));
        const setInitialScrollIndex = jest.fn();
        const props = makeProps({
            flattenedFilteredNodes: flatNodes,
            setInitialScrollIndex,
            initialScrollNodeID: "A1",
        });

        const { rerender } = renderHook(
            (p) => useScrollToNode<string>(p),
            { initialProps: props }
        );

        // A1 should be at index 1 (A=0, A1=1)
        expect(setInitialScrollIndex).toHaveBeenCalledWith(1);

        setInitialScrollIndex.mockClear();

        // Re-render with a new flattenedNodes reference to trigger the useLayoutEffect again.
        // initialScrollDone is true, so setInitialScrollIndex should NOT be called again.
        act(() => {
            rerender({ ...props, flattenedFilteredNodes: [...flatNodes] });
        });

        expect(setInitialScrollIndex).not.toHaveBeenCalled();
    });

    it("given no initialScrollNodeID, when first rendered, then setInitialScrollIndex is called with -1", () => {
        const setInitialScrollIndex = jest.fn();

        renderHook(() => useScrollToNode<string>(makeProps({
            setInitialScrollIndex,
            initialScrollNodeID: undefined,
        })));

        expect(setInitialScrollIndex).toHaveBeenCalledWith(-1);
    });

    it("given a scrollToNodeHandlerRef, when scrollToNodeID is called, then expandNodes is triggered for the target", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        const props = makeProps();

        renderHook(() => useScrollToNode<string>(props));

        // Call scrollToNodeID to expand and scroll to A1a (which is inside A > A1)
        act(() => {
            props.scrollToNodeHandlerRef.current!.scrollToNodeID({
                nodeId: "A1a",
                expandScrolledNode: true,
            });
        });

        // The hook should trigger expandNodes for A1a. Since expandScrolledNode is true,
        // A1a itself gets expanded plus its ancestors (A, A1).
        const expanded = store.getState().expanded;
        // A and A1 should be expanded (A1a has no children, so expanding it is a no-op
        // but A and A1 must be expanded as ancestors)
        expect(expanded.has("A")).toBe(true);
        expect(expanded.has("A1")).toBe(true);
    });

    it("given a non-root node, when scrollToNodeID is called with expandScrolledNode=false, then parent is expanded and scroll completes", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        const flashListRef: MutableRefObject<any> = { current: { scrollToIndex: jest.fn() } };
        const props = makeProps({ flashListRef });

        const { rerender } = renderHook(
            (p) => useScrollToNode<string>(p),
            { initialProps: props }
        );

        // scrollToNodeID with expandScrolledNode=false: expand parent A, but not A1 itself
        act(() => {
            props.scrollToNodeHandlerRef.current!.scrollToNodeID({
                nodeId: "A1",
                expandScrolledNode: false,
            });
        });

        const expanded = store.getState().expanded;
        expect(expanded.has("A")).toBe(true);

        // Re-render with updated flat nodes to complete the RENDERED milestone
        const updatedFlatNodes = buildFlatNodes(expanded);
        act(() => {
            rerender({ ...props, flattenedFilteredNodes: updatedFlatNodes });
        });

        // childToParentMap.has("A1") is true (A1's parent is A), and A is expanded,
        // so the scroll should complete
        expect(flashListRef.current.scrollToIndex).toHaveBeenCalled();
    });

    it("given a node already in view, when scrollToNodeID is called, then flashListRef.scrollToIndex is called", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        // First expand A and A1 so A1a is visible
        act(() => {
            store.getState().updateExpanded(new Set(["A", "A1"]));
        });

        const flatNodes = buildFlatNodes(new Set(["A", "A1"]));
        const flashListRef: MutableRefObject<any> = { current: { scrollToIndex: jest.fn() } };
        const props = makeProps({ flattenedFilteredNodes: flatNodes, flashListRef });

        const { rerender } = renderHook(
            (p) => useScrollToNode<string>(p),
            { initialProps: props }
        );

        // Call scrollToNodeID for A1a (which is already visible)
        act(() => {
            props.scrollToNodeHandlerRef.current!.scrollToNodeID({
                nodeId: "A1a",
                expandScrolledNode: true,
                animated: true,
            });
        });

        // After expansion, re-render with updated flat nodes to simulate list re-render
        const updatedExpanded = store.getState().expanded;
        const updatedFlatNodes = buildFlatNodes(updatedExpanded);

        act(() => {
            rerender({ ...props, flattenedFilteredNodes: updatedFlatNodes });
        });

        // The flashListRef.scrollToIndex should eventually be called
        expect(flashListRef.current.scrollToIndex).toHaveBeenCalled();
        const callArgs = flashListRef.current.scrollToIndex.mock.calls[0][0];
        expect(callArgs.animated).toBe(true);
    });


    it("given an unmounted list ref, when scrollToNodeID resolves, then it is a safe no-op", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        act(() => {
            store.getState().updateExpanded(new Set(["A", "A1"]));
        });
        const flatNodes = buildFlatNodes(new Set(["A", "A1"]));
        const props = makeProps({
            flattenedFilteredNodes: flatNodes,
            flashListRef: { current: null },
        });

        renderHook(() => useScrollToNode<string>(props));

        expect(() => {
            act(() => {
                props.scrollToNodeHandlerRef.current!.scrollToNodeID({ nodeId: "A1a" });
            });
        }).not.toThrow();
    });

    it("given a nonexistent node, when scrollToNodeID is called, then no crash occurs", () => {
        const props = makeProps();

        renderHook(() => useScrollToNode<string>(props));

        // This should not throw
        expect(() => {
            act(() => {
                props.scrollToNodeHandlerRef.current!.scrollToNodeID({
                    nodeId: "NONEXISTENT",
                    expandScrolledNode: true,
                });
            });
        }).not.toThrow();
    });
});

describe("scrollMovedNodeIntoView", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function makeHandlerRef() {
        const scrollToNodeID = jest.fn();
        const ref: MutableRefObject<ScrollToNodeHandlerRef<string> | null> = {
            current: { scrollToNodeID },
        };
        return { ref, scrollToNodeID };
    }

    it("given no options, when invoked, then scrolls after a tick with animated centered defaults", () => {
        const { ref, scrollToNodeID } = makeHandlerRef();

        scrollMovedNodeIntoView(ref, "A1a", undefined);

        // Deferred a tick so the post-move expand/render settles first
        expect(scrollToNodeID).not.toHaveBeenCalled();
        jest.runAllTimers();

        expect(scrollToNodeID).toHaveBeenCalledWith({
            nodeId: "A1a",
            animated: true,
            viewPosition: 0.5,
            viewOffset: undefined,
        });
    });

    it("given boolean options, when invoked, then falls back to the same defaults", () => {
        const { ref, scrollToNodeID } = makeHandlerRef();

        scrollMovedNodeIntoView(ref, "B", true);
        jest.runAllTimers();

        expect(scrollToNodeID).toHaveBeenCalledWith({
            nodeId: "B",
            animated: true,
            viewPosition: 0.5,
            viewOffset: undefined,
        });
    });

    it("given custom scroll options, when invoked, then forwards them over the defaults", () => {
        const { ref, scrollToNodeID } = makeHandlerRef();

        scrollMovedNodeIntoView(ref, "A2", {
            animated: false,
            viewPosition: 0,
            viewOffset: 12,
        });
        jest.runAllTimers();

        expect(scrollToNodeID).toHaveBeenCalledWith({
            nodeId: "A2",
            animated: false,
            viewPosition: 0,
            viewOffset: 12,
        });
    });

    it("given an unmounted handler ref, when the deferred scroll fires, then it is a safe no-op", () => {
        const ref: MutableRefObject<ScrollToNodeHandlerRef<string> | null> = {
            current: null,
        };

        scrollMovedNodeIntoView(ref, "A", undefined);

        expect(() => jest.runAllTimers()).not.toThrow();
    });
});
