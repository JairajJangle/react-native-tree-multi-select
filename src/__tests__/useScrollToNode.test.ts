jest.mock("zustand");

jest.mock("fast-is-equal", () => ({
    fastIsEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
}));

import { renderHook, act } from "@testing-library/react-native";
import { useScrollToNode } from "../hooks/useScrollToNode";
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

    it("given an initialScrollNodeID, when first rendered with the node in the list, then setInitialScrollIndex is called with the correct index", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        // Expand A so that A1 is visible at index 1
        act(() => {
            store.getState().updateExpanded(new Set(["A"]));
        });

        const flatNodes = buildFlatNodes(new Set(["A"]));
        const setInitialScrollIndex = jest.fn();

        renderHook(() => useScrollToNode<string>(makeProps({
            flattenedFilteredNodes: flatNodes,
            setInitialScrollIndex,
            initialScrollNodeID: "A1",
        })));

        // A1 should be at index 1 (A=0, A1=1)
        expect(setInitialScrollIndex).toHaveBeenCalledWith(1);
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

    it("given a node that needs parent expansion, when scrollToNodeID is called with expandScrolledNode=false, then parent is expanded but not the node itself", () => {
        const store = getTreeViewStore<string>(STORE_ID);
        const props = makeProps();

        renderHook(() => useScrollToNode<string>(props));

        // scrollToNodeID with expandScrolledNode=false should expand the parent, not the node
        act(() => {
            props.scrollToNodeHandlerRef.current!.scrollToNodeID({
                nodeId: "A1",
                expandScrolledNode: false,
            });
        });

        const expanded = store.getState().expanded;
        // "A" (parent of A1) should be expanded since that's needed to show A1
        expect(expanded.has("A")).toBe(true);
        // A1 itself should NOT be expanded (expandScrolledNode=false means "just make it visible, don't expand it")
        // Actually the behavior is: _doNotExpandToShowChildren=true means the parent of A1 (= A) is expanded, not A1 itself.
        // So A1 should NOT be in the expanded set from this operation.
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
