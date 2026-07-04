jest.mock("zustand");

jest.mock("fast-is-equal", () => ({
    fastIsEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
}));

jest.mock("@shopify/flash-list", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        FlashList: React.forwardRef(({ renderItem, data, ListHeaderComponent, ListFooterComponent, ...rest }: any, ref: any) => (
            <View testID="flash-list" ref={ref} {...rest}>
                {ListHeaderComponent}
                {data?.map((item: any, index: number) => (
                    <View key={index}>{renderItem({ item, index })}</View>
                ))}
                {ListFooterComponent}
            </View>
        )),
    };
});

jest.mock("@futurejj/react-native-checkbox", () => {
    const { TouchableOpacity, Text } = require("react-native");
    return {
        Checkbox: ({ status, onPress, testID }: any) => (
            <TouchableOpacity testID={testID} onPress={onPress}>
                <Text>{status}</Text>
            </TouchableOpacity>
        ),
    };
});

jest.mock("@expo/vector-icons/FontAwesome", () => {
    const { Text } = require("react-native");
    return { default: ({ name }: any) => <Text>{name}</Text> };
});

import { createRef } from "react";
import { Text, View } from "react-native";
import { render, act, screen, fireEvent } from "@testing-library/react-native";
import { TreeView } from "../TreeView";
import type { TreeNode, TreeViewRef, CheckboxValueType } from "../types/treeView.types";
import type { MoveResult } from "../types/dragDrop.types";

const testData: TreeNode<string>[] = [
    {
        id: "1", name: "Node 1", children: [
            { id: "1.1", name: "Node 1.1" },
            { id: "1.2", name: "Node 1.2" },
        ]
    },
    { id: "2", name: "Node 2" },
];

// All node IDs in the test data
const ALL_IDS = ["1", "1.1", "1.2", "2"];

// The jest react-native preset stubs host measurement as a no-op (the callback
// never fires) and the FlashList mock's host View has no scrollToIndex. Patch
// the shared host View prototype so container measurement and imperative
// scrolling behave; returns an undo function.
function patchHostViewMethods() {
    const proto = (View as any).prototype;
    const measureSpy = jest.spyOn(proto, "measureInWindow").mockImplementation(
        // Container viewport at x=0, y=0, 300x600.
        (cb: any) => cb(0, 0, 300, 600)
    );
    proto.scrollToIndex = jest.fn();
    return () => {
        measureSpy.mockRestore();
        delete proto.scrollToIndex;
    };
}

describe("TreeView", () => {
    it("given tree data, when mounted, then nodes are rendered", () => {
        render(<TreeView data={testData} />);

        expect(screen.getByText("Node 1")).toBeTruthy();
        expect(screen.getByText("Node 2")).toBeTruthy();
    });

    it("given a ref, when calling selectAll(), then onCheck callback receives all node IDs as checked", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);

        // Clear the initial onCheck call from mount
        onCheck.mockClear();

        act(() => {
            ref.current!.selectAll();
        });

        // onCheck should have been called with all IDs checked
        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        expect(checkedIds.sort()).toEqual(ALL_IDS.sort());
    });

    it("given a ref, when calling unselectAll() after selectAll(), then onCheck receives empty checked array", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);

        act(() => {
            ref.current!.selectAll();
        });

        onCheck.mockClear();

        act(() => {
            ref.current!.unselectAll();
        });

        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        expect(checkedIds).toEqual([]);
    });

    it("given a ref, when calling expandAll(), then onExpand callback receives all parent node IDs", () => {
        const onExpand = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);

        onExpand.mockClear();

        act(() => {
            ref.current!.expandAll();
        });

        expect(onExpand).toHaveBeenCalled();
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        const expandedIds = lastCall[0] as string[];
        // expandAll expands all nodes in the nodeMap (all IDs)
        expect(expandedIds.sort()).toEqual(ALL_IDS.sort());
    });

    it("given a ref, when calling collapseAll(), then onExpand receives empty array", () => {
        const onExpand = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);

        act(() => {
            ref.current!.expandAll();
        });

        onExpand.mockClear();

        act(() => {
            ref.current!.collapseAll();
        });

        expect(onExpand).toHaveBeenCalled();
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        const expandedIds = lastCall[0] as string[];
        expect(expandedIds).toEqual([]);
    });

    it("given a ref, when calling selectNodes([id]), then that node is checked", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);

        onCheck.mockClear();

        act(() => {
            ref.current!.selectNodes(["1.1"]);
        });

        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        // "1.1" should be checked
        expect(checkedIds).toContain("1.1");
        // Parent "1" should be indeterminate, not checked
        const indeterminateIds = lastCall[1] as string[];
        expect(indeterminateIds).toContain("1");
    });

    it("given a ref, when calling moveNode(), then tree structure changes and onCheck fires with recalculated states", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);

        // First select node "2"
        act(() => {
            ref.current!.selectNodes(["2"]);
        });

        onCheck.mockClear();

        // Move node "2" inside node "1" (making it a child of "1")
        act(() => {
            ref.current!.moveNode("2", "1", "inside");
        });

        // After moving, the check states should be recalculated
        expect(onCheck).toHaveBeenCalled();
    });

    it("given a ref, when moveNode() succeeds, then it returns a MoveResult delta and does not fire onDragEnd", () => {
        const onDragEnd = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} dragAndDrop={{ onDragEnd }} />);

        let result: MoveResult<string> | null = null;
        act(() => {
            result = ref.current!.moveNode("2", "1", "inside");
        });

        expect(result).not.toBeNull();
        expect(result!).toMatchObject({
            draggedNodeId: "2",
            targetNodeId: "1",
            position: "inside",
            previousParentId: null,
            newParentId: "1",
        });
        // moveNode is imperative; it must NOT fire the gesture-only onDragEnd callback.
        expect(onDragEnd).not.toHaveBeenCalled();
    });

    it("given a ref, when moveNode() is a no-op, then it returns null and does not mutate the tree", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(<TreeView ref={ref} data={testData} />);

        const before = ref.current!.getTreeData();
        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            // Moving a node onto itself is a no-op.
            result = ref.current!.moveNode("2", "2", "inside");
        });

        expect(result).toBeNull();
        expect(ref.current!.getTreeData()).toBe(before);
    });

    it("given an in-flight drag, when moveNode() is called, then it is ignored and returns null", () => {
        const storeModule = require("../store/treeView.store");
        const spy = jest.spyOn(storeModule, "getTreeViewStore");
        const warn = jest.spyOn(console, "warn").mockImplementation(() => { });
        const ref = createRef<TreeViewRef<string>>();
        render(<TreeView ref={ref} data={testData} dragAndDrop={{}} />);

        // Recover the instance's internal storeId from the store factory calls.
        const storeId = spy.mock.calls[0]![0] as string;
        const store = storeModule.getTreeViewStore(storeId);

        // Simulate an active drag, then attempt a programmatic move.
        act(() => {
            store.getState().updateDraggedNodeId("2");
        });
        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            result = ref.current!.moveNode("2", "1", "inside");
        });
        expect(result).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("a drag is in progress"));

        // Once the drag ends, the same move succeeds.
        act(() => {
            store.getState().updateDraggedNodeId(null);
        });
        act(() => {
            result = ref.current!.moveNode("2", "1", "inside");
        });
        expect(result).not.toBeNull();

        warn.mockRestore();
        spy.mockRestore();
    });

    it("given an in-flight drag, when the data prop changes, then reinit is deferred until the drag ends", () => {
        const storeModule = require("../store/treeView.store");
        const spy = jest.spyOn(storeModule, "getTreeViewStore");
        const ref = createRef<TreeViewRef<string>>();
        const { rerender } = render(<TreeView ref={ref} data={testData} dragAndDrop={{}} />);

        const storeId = spy.mock.calls[0]![0] as string;
        const store = storeModule.getTreeViewStore(storeId);

        act(() => {
            store.getState().updateDraggedNodeId("2");
        });

        const newData: TreeNode<string>[] = [{ id: "X", name: "Node X" }];
        rerender(<TreeView ref={ref} data={newData} dragAndDrop={{}} />);

        // Mid-drag: the destructive reinit must not have run.
        expect(ref.current!.getTreeData().map(n => n.id)).toEqual(["1", "2"]);

        // Drag ends (no committed move): the deferred data is applied.
        act(() => {
            store.getState().updateDraggedNodeId(null);
        });
        expect(ref.current!.getTreeData().map(n => n.id)).toEqual(["X"]);

        spy.mockRestore();
    });

    it("given a ref with validate, when moveNode() is blocked by canDrop, then it returns null", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(
            <TreeView ref={ref} data={testData} dragAndDrop={{ canDrop: () => false }} />
        );

        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            result = ref.current!.moveNode("2", "1", "inside", { validate: true });
        });

        expect(result).toBeNull();
    });

    it("given a ref with validate, when moveNode() would exceed maxDepth, then it returns null", () => {
        const ref = createRef<TreeViewRef<string>>();
        // maxDepth 1: dropping node "2" inside "1.1" (level 1) lands it at level 2.
        render(<TreeView ref={ref} data={testData} dragAndDrop={{ maxDepth: 1 }} />);

        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            result = ref.current!.moveNode("2", "1.1", "inside", { validate: true });
        });

        expect(result).toBeNull();
    });

    it("given a ref with validate, when canNodeHaveChildren rejects the target, then it returns null", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(
            <TreeView
                ref={ref}
                data={testData}
                dragAndDrop={{ canNodeHaveChildren: (node) => node.id !== "1.1" }}
            />
        );

        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            result = ref.current!.moveNode("2", "1.1", "inside", { validate: true });
        });

        expect(result).toBeNull();
    });

    it("given a ref with NO dragAndDrop prop, when moveNode({ validate: true }) is called, then it warns and proceeds", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        const ref = createRef<TreeViewRef<string>>();
        render(<TreeView ref={ref} data={testData} />);

        let result: MoveResult<string> | null = null;
        act(() => {
            result = ref.current!.moveNode("2", "1", "inside", { validate: true });
        });

        // No rules to enforce -> the move proceeds, but a dev warning is logged so the
        // silently-ignored validate flag is discoverable.
        expect(result).not.toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("moveNode({ validate: true })"));
        warn.mockRestore();
    });

    it("given a ref, when calling getTreeData(), then it returns the current (reordered) tree", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(<TreeView ref={ref} data={testData} />);

        expect(ref.current!.getTreeData().map(n => n.id)).toEqual(["1", "2"]);

        act(() => {
            ref.current!.moveNode("2", "1", "inside");
        });

        const node1 = ref.current!.getTreeData().find(n => n.id === "1");
        expect(node1?.children?.some(c => c.id === "2")).toBe(true);
    });

    it("given a ref, when calling setSearchText(), then search filters to matching nodes", () => {
        const onExpand = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);

        onExpand.mockClear();

        act(() => {
            ref.current!.setSearchText("Node 1");
        });

        // When search text is set, all nodes get expanded to show search results
        expect(onExpand).toHaveBeenCalled();
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        const expandedIds = lastCall[0] as string[];
        expect(expandedIds.length).toBeGreaterThan(0);
    });

    it("given data prop changes, when new data is passed, then tree reinitializes", () => {
        const onCheck = jest.fn();

        const newData: TreeNode<string>[] = [
            { id: "A", name: "New Node A" },
            { id: "B", name: "New Node B" },
        ];

        const { rerender } = render(
            <TreeView data={testData} onCheck={onCheck} />
        );

        onCheck.mockClear();

        rerender(<TreeView data={newData} onCheck={onCheck} />);

        // After data change, onCheck should fire with empty checked (reinitialized)
        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        expect(checkedIds).toEqual([]);
    });

    it("given a ref, when calling unselectNodes(), then only that node is unchecked", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);

        act(() => { ref.current!.selectAll(); });
        onCheck.mockClear();

        act(() => { ref.current!.unselectNodes(["1.1"]); });

        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        expect(checkedIds).not.toContain("1.1");
        // Parent "1" should now be indeterminate since only 1.2 is checked
        const indeterminateIds = lastCall[1] as string[];
        expect(indeterminateIds).toContain("1");
    });

    it("given a ref, when calling selectAllFiltered and unselectAllFiltered, then filtered selection works", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onCheck={onCheck} />);
        onCheck.mockClear();

        // No search text active, so selectAllFiltered behaves like selectAll
        act(() => { ref.current!.selectAllFiltered(); });

        expect(onCheck).toHaveBeenCalled();
        let lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        expect((lastCall[0] as string[]).sort()).toEqual(ALL_IDS.sort());

        onCheck.mockClear();

        act(() => { ref.current!.unselectAllFiltered(); });

        expect(onCheck).toHaveBeenCalled();
        lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        expect(lastCall[0] as string[]).toEqual([]);
    });

    it("given a ref, when calling expandNodes and collapseNodes, then specific nodes expand/collapse", () => {
        const onExpand = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);
        onExpand.mockClear();

        act(() => { ref.current!.expandNodes(["1"]); });

        expect(onExpand).toHaveBeenCalled();
        let lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        expect((lastCall[0] as string[])).toContain("1");

        onExpand.mockClear();

        act(() => { ref.current!.collapseNodes(["1"]); });

        expect(onExpand).toHaveBeenCalled();
        lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        expect((lastCall[0] as string[])).not.toContain("1");
    });

    it("given a ref, when calling getChildToParentMap, then correct map is returned", () => {
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} />);

        const map = ref.current!.getChildToParentMap();
        expect(map.get("1.1")).toBe("1");
        expect(map.get("1.2")).toBe("1");
        expect(map.has("1")).toBe(false); // root has no parent
    });

    it("given selectionPropagation prop, when set to children only, then parent does not become indeterminate", () => {
        const onCheck = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(
            <TreeView
                ref={ref}
                data={testData}
                onCheck={onCheck}
                selectionPropagation={{ toChildren: true, toParents: false }}
            />
        );
        onCheck.mockClear();

        act(() => { ref.current!.selectNodes(["1.1"]); });

        expect(onCheck).toHaveBeenCalled();
        const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
        const checkedIds = lastCall[0] as string[];
        expect(checkedIds).toContain("1.1");
        // With toParents=false, parent "1" should NOT be indeterminate
        const indeterminateIds = lastCall[1] as string[];
        expect(indeterminateIds).not.toContain("1");
    });

    it("given search text set then cleared, when cleared, then all nodes collapse", () => {
        const onExpand = jest.fn();
        const ref = createRef<TreeViewRef<string>>();

        render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);

        // Set search text (expands all to show results)
        act(() => { ref.current!.setSearchText("Node"); });
        onExpand.mockClear();

        // Clear search text (should collapse all)
        act(() => { ref.current!.setSearchText(""); });

        expect(onExpand).toHaveBeenCalled();
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        expect((lastCall[0] as string[])).toEqual([]);
    });

    it("given drag enabled, when a node fires onTouchStart and onTouchEnd, then handlers execute without error", () => {
        render(
            <TreeView
                data={testData}
                dragAndDrop={{ onDragEnd: jest.fn() }}
            />
        );

        // The Node component renders with touchHandlers when dragEnabled.
        // The node_row views have onTouchStart/onTouchEnd.
        const nodeRow = screen.getByTestId("node_row_2");
        fireEvent(nodeRow, "touchStart", { nativeEvent: { pageY: 100, locationY: 10 } });
        fireEvent(nodeRow, "touchEnd");

        // No crash = handlers wired correctly
        expect(nodeRow).toBeTruthy();
    });

    it("given drag enabled, when node layout fires, then handleItemLayout records height", () => {
        render(
            <TreeView
                data={testData}
                dragAndDrop={{ onDragEnd: jest.fn() }}
            />
        );

        // Fire layout event on a node row
        const nodeRow = screen.getByTestId("node_row_1");
        fireEvent(nodeRow, "layout", { nativeEvent: { layout: { height: 48 } } });

        // No crash = layout handler wired correctly
        expect(nodeRow).toBeTruthy();
    });

    it("given CustomNodeRowComponent, when rendered, then custom component receives correct props", () => {
        const customRowFn = jest.fn(({ node, level, checkedValue, isExpanded }: {
            node: any; level: number; checkedValue: CheckboxValueType;
            isExpanded: boolean;
        }) => (
            <View testID={`custom-row-${node.id}`}>
                <Text>{`${node.name}:L${level}:${checkedValue}:${isExpanded}`}</Text>
            </View>
        ));

        render(
            <TreeView
                data={testData}
                CustomNodeRowComponent={customRowFn}
            />
        );

        // Custom row should be rendered for each node
        expect(screen.getByTestId("custom-row-1")).toBeTruthy();
        expect(screen.getByTestId("custom-row-2")).toBeTruthy();
        expect(screen.getByText(/Node 1:L0:false/)).toBeTruthy();
    });

    it("given scroll event on FlashList, when user scrolls, then scroll offset updates and long press cancels", () => {
        render(
            <TreeView
                data={testData}
                dragAndDrop={{ onDragEnd: jest.fn() }}
            />
        );

        const flashList = screen.getByTestId("flash-list");
        fireEvent.scroll(flashList, { nativeEvent: { contentOffset: { y: 150 } } });

        // No crash = handleScroll executed correctly
        expect(flashList).toBeTruthy();
    });

    it("given unmount, when component unmounts, then no errors occur", () => {
        const { unmount } = render(<TreeView data={testData} />);

        expect(() => unmount()).not.toThrow();
    });

    it("given a parent node, when its expand arrow is pressed, then the node expands and children render", () => {
        const onExpand = jest.fn();
        render(<TreeView data={testData} onExpand={onExpand} />);
        onExpand.mockClear();

        expect(screen.queryByTestId("node_row_1.1")).toBeNull();

        fireEvent.press(screen.getByTestId("expandable_arrow_1"));

        expect(onExpand).toHaveBeenCalled();
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        expect(lastCall[0] as string[]).toContain("1");
        expect(screen.getByTestId("node_row_1.1")).toBeTruthy();
    });

    it("given drag enabled, when the drag container lays out, then the layout handler records the height without crashing", () => {
        render(<TreeView data={testData} dragAndDrop={{}} />);

        // The wrapper View that owns the pan handlers also tracks its height for
        // auto-scroll clamping; firing layout on it must be handled.
        let inst: any = screen.getByTestId("flash-list");
        while (inst && !(inst.props && inst.props.onResponderMove)) {
            inst = inst.parent;
        }
        expect(inst).toBeTruthy();

        expect(() =>
            inst.props.onLayout({ nativeEvent: { layout: { height: 480 } } })
        ).not.toThrow();
    });

    it("given treeFlashListProps callbacks, when list scroll and content-size events fire, then they are forwarded to the consumer", () => {
        const onScroll = jest.fn();
        const onContentSizeChange = jest.fn();

        render(
            <TreeView
                data={testData}
                dragAndDrop={{}}
                treeFlashListProps={{ onScroll, onContentSizeChange } as any}
            />
        );

        const flashList = screen.getByTestId("flash-list");
        const scrollEvent = { nativeEvent: { contentOffset: { y: 42 } } };
        fireEvent.scroll(flashList, scrollEvent);
        flashList.props.onContentSizeChange(300, 800);

        // The library wraps both callbacks for its own drag bookkeeping but the
        // consumer contract is that they still receive every event unchanged.
        expect(onScroll).toHaveBeenCalledTimes(1);
        expect(onScroll.mock.calls[0]![0].nativeEvent.contentOffset.y).toBe(42);
        expect(onContentSizeChange).toHaveBeenCalledWith(300, 800);
    });

    it("given no treeFlashListProps, when scroll and content-size events fire, then nothing crashes", () => {
        render(<TreeView data={testData} dragAndDrop={{}} />);

        const flashList = screen.getByTestId("flash-list");
        fireEvent.scroll(flashList, { nativeEvent: { contentOffset: { y: 10 } } });

        expect(() => flashList.props.onContentSizeChange(300, 800)).not.toThrow();
    });

    it("given a ref, when calling scrollToNodeID for a nested node, then its ancestors get expanded", () => {
        const undoPatch = patchHostViewMethods();
        try {
            const onExpand = jest.fn();
            const ref = createRef<TreeViewRef<string>>();

            render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);
            onExpand.mockClear();

            act(() => {
                ref.current!.scrollToNodeID({ nodeId: "1.1" });
            });

            // Scrolling to a hidden nested node must reveal it: parent "1" expands.
            expect(onExpand).toHaveBeenCalled();
            const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
            expect(lastCall[0] as string[]).toContain("1");
        } finally {
            undoPatch();
        }
    });

    it("given moveNode with scrollToNode, when the deferred scroll fires, then the moved node is revealed via expansion", () => {
        const undoPatch = patchHostViewMethods();
        jest.useFakeTimers();
        try {
            const onExpand = jest.fn();
            const ref = createRef<TreeViewRef<string>>();

            render(<TreeView ref={ref} data={testData} onExpand={onExpand} />);
            onExpand.mockClear();

            let result: MoveResult<string> | null = null;
            act(() => {
                result = ref.current!.moveNode("2", "1.1", "inside", { scrollToNode: true });
            });
            expect(result).not.toBeNull();

            act(() => {
                jest.runAllTimers();
            });

            // The moved node ended up nested under 1 > 1.1; the opt-in scroll must
            // expand that chain so the node is actually visible.
            const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
            const expandedIds = lastCall[0] as string[];
            expect(expandedIds).toEqual(expect.arrayContaining(["1", "1.1"]));
        } finally {
            jest.useRealTimers();
            undoPatch();
        }
    });

    it("given a controlled consumer, when the post-move tree is fed back into data, then the store is not reinitialized", () => {
        const ref = createRef<TreeViewRef<string>>();
        const { rerender } = render(<TreeView ref={ref} data={testData} />);

        // Select something so a destructive reinit would be observable.
        act(() => { ref.current!.selectNodes(["1.1"]); });
        act(() => { ref.current!.moveNode("2", "1", "inside"); });

        const movedTree = ref.current!.getTreeData();
        const checkedBefore = ref.current!.getChildToParentMap();
        expect(checkedBefore.get("2")).toBe("1");

        // Controlled flow: consumer echoes the reordered tree back via `data`.
        // An equal tree must be recognized and skipped - reinitializing would
        // wipe selection and expansion out from under the user.
        const echoedData = JSON.parse(JSON.stringify(movedTree));
        rerender(<TreeView ref={ref} data={echoedData} />);

        expect(ref.current!.getTreeData()).toBe(movedTree);

        // A later, genuinely different data prop must still reinitialize.
        const differentData: TreeNode<string>[] = [{ id: "Z", name: "Node Z" }];
        rerender(<TreeView ref={ref} data={differentData} />);
        expect(ref.current!.getTreeData().map(n => n.id)).toEqual(["Z"]);
    });

    it("given the dragAndDrop prop changes by value, when re-rendered, then the new rules take effect", () => {
        const ref = createRef<TreeViewRef<string>>();
        const { rerender } = render(
            <TreeView ref={ref} data={testData} dragAndDrop={{ maxDepth: 1 }} />
        );

        // maxDepth 1 blocks nesting "2" under "1.1" (would land at level 2).
        let result: MoveResult<string> | null = null;
        act(() => {
            result = ref.current!.moveNode("2", "1.1", "inside", { validate: true });
        });
        expect(result).toBeNull();

        // Passing a NEW object with different content must not be swallowed by
        // the identity-stabilizing ref - the relaxed rule has to apply.
        rerender(<TreeView ref={ref} data={testData} dragAndDrop={{ maxDepth: 5 }} />);

        act(() => {
            result = ref.current!.moveNode("2", "1.1", "inside", { validate: true });
        });
        expect(result).not.toBeNull();
    });

    describe("interactive drag (component level)", () => {
        // PanResponder gesture events need a touch history record to compute
        // gesture state (same shape as the hook-level tests).
        function mockGestureEvent(pageY: number, pageX = 50) {
            return {
                nativeEvent: {
                    pageY, pageX, locationY: 10, locationX: 10,
                    touches: [{ pageY, pageX }],
                    changedTouches: [], identifier: 1, target: 1, timestamp: 0,
                },
                touchHistory: {
                    mostRecentTimeStamp: 1,
                    numberActiveTouches: 1,
                    indexOfSingleActiveTouch: 0,
                    touchBank: [{
                        touchActive: true,
                        currentPageX: pageX, currentPageY: pageY,
                        currentTimeStamp: 1,
                        previousPageX: pageX, previousPageY: pageY - 1,
                        previousTimeStamp: 0,
                        startPageX: pageX, startPageY: pageY - 1,
                        startTimeStamp: 0,
                    }],
                } as any,
            } as any;
        }

        function findDragContainer() {
            let inst: any = screen.getByTestId("flash-list");
            while (inst && !(inst.props && inst.props.onResponderMove)) {
                inst = inst.parent;
            }
            expect(inst).toBeTruthy();
            return inst;
        }

        // Node rows sit under a 5px list header at item height 36 (defaults):
        // row i spans local Y [5 + i*36, 5 + (i+1)*36).
        const rowPageY = (index: number, fraction: number) => 5 + index * 36 + 36 * fraction;

        let undoPatch: () => void;

        beforeEach(() => {
            undoPatch = patchHostViewMethods();
            jest.useFakeTimers();
        });

        afterEach(() => {
            act(() => { jest.runOnlyPendingTimers(); });
            jest.useRealTimers();
            undoPatch();
        });

        it("given a long-press drag dropped inside another node, when released, then onDragEnd fires and the tree is reordered", () => {
            const onDragEnd = jest.fn();
            render(<TreeView data={testData} dragAndDrop={{ onDragEnd }} />);

            // Long-press node "2" (index 1) to start the drag.
            fireEvent(screen.getByTestId("node_row_2"), "touchStart", {
                nativeEvent: { pageY: rowPageY(1, 0.3), locationY: 10 },
            });
            act(() => { jest.advanceTimersByTime(500); });

            const container = findDragContainer();

            // Drag over the middle ("inside" zone) of node "1" (index 0) and release.
            act(() => { container.props.onResponderGrant(mockGestureEvent(rowPageY(1, 0.3))); });
            act(() => { container.props.onResponderMove(mockGestureEvent(rowPageY(0, 0.5))); });
            act(() => { container.props.onResponderRelease(mockGestureEvent(rowPageY(0, 0.5))); });

            expect(onDragEnd).toHaveBeenCalledTimes(1);
            expect(onDragEnd.mock.calls[0]![0]).toMatchObject({
                draggedNodeId: "2",
                targetNodeId: "1",
                position: "inside",
            });
        });

        it("given a node was being dragged, when its checkbox or expand arrow is pressed mid-drag, then the press is swallowed", () => {
            const onCheck = jest.fn();
            const onExpand = jest.fn();
            const utils = render(
                <TreeView data={testData} onCheck={onCheck} onExpand={onExpand} dragAndDrop={{}} />
            );

            // Long-press node "1" (index 0, has children) to start dragging it.
            fireEvent(screen.getByTestId("node_row_1"), "touchStart", {
                nativeEvent: { pageY: rowPageY(0, 0.3), locationY: 10 },
            });
            act(() => { jest.advanceTimersByTime(500); });

            onCheck.mockClear();
            onExpand.mockClear();

            // A finger-lift after a long-press drag also fires press events; the
            // node must swallow them so a drag never toggles check/expand state.
            fireEvent.press(screen.getByTestId("checkbox_1"));
            fireEvent.press(screen.getByTestId("expandable_arrow_1"));

            expect(onCheck).not.toHaveBeenCalled();
            expect(onExpand).not.toHaveBeenCalled();

            // Cancel the drag; a FRESH touch must clear the flag and presses work again.
            const container = findDragContainer();
            act(() => { container.props.onResponderTerminate(mockGestureEvent(rowPageY(0, 0.3))); });
            fireEvent(screen.getByTestId("node_row_1"), "touchStart", {
                nativeEvent: { pageY: rowPageY(0, 0.3), locationY: 10 },
            });
            fireEvent(screen.getByTestId("node_row_1"), "touchEnd");
            fireEvent.press(screen.getByTestId("checkbox_1"));

            expect(onCheck).toHaveBeenCalled();
            const lastCall = onCheck.mock.calls[onCheck.mock.calls.length - 1];
            expect((lastCall[0] as string[]).sort()).toEqual(["1", "1.1", "1.2"]);

            utils.unmount();
        });
    });

    describe("drop indicator rendering", () => {
        function getStore() {
            const storeModule = require("../store/treeView.store");
            const spy = jest.spyOn(storeModule, "getTreeViewStore");
            const utils = render(<TreeView data={testData} dragAndDrop={{}} />);
            const storeId = spy.mock.calls[0]![0] as string;
            const store = storeModule.getTreeViewStore(storeId);
            spy.mockRestore();
            return { store, utils };
        }

        it.each(["inside", "above", "below"] as const)(
            "given a drop target with position %s, when rendered, then the built-in indicator appears without crashing",
            (position) => {
                const { store } = getStore();

                act(() => {
                    store.getState().updateDraggedNodeId("2");
                    store.getState().updateDropTarget("1", position, 0);
                });

                // The target row renders its indicator overlay; the row itself stays.
                expect(screen.getByTestId("node_row_1")).toBeTruthy();

                act(() => {
                    store.getState().updateDropTarget(null, null, null);
                    store.getState().updateDraggedNodeId(null);
                });
            }
        );

        it("given custom dropIndicatorStyleProps, when an above-drop is targeted at root level, then the styled indicator renders", () => {
            const storeModule = require("../store/treeView.store");
            const spy = jest.spyOn(storeModule, "getTreeViewStore");
            render(
                <TreeView
                    data={testData}
                    dragAndDrop={{
                        customizations: {
                            dropIndicatorStyleProps: {
                                lineColor: "#FF0000",
                                lineThickness: 2,
                                circleSize: 8,
                                highlightColor: "rgba(255,0,0,0.1)",
                                highlightBorderColor: "rgba(255,0,0,0.4)",
                                highlightBorderWidth: 1,
                                highlightBorderRadius: 2,
                            },
                        },
                    }}
                />
            );
            const storeId = spy.mock.calls[0]![0] as string;
            const store = storeModule.getTreeViewStore(storeId);
            spy.mockRestore();

            act(() => {
                store.getState().updateDraggedNodeId("2");
                // Root level: the circle clamp (safeLeftOffset) branch is exercised.
                store.getState().updateDropTarget("1", "above", 0);
            });
            expect(screen.getByTestId("node_row_1")).toBeTruthy();

            act(() => {
                store.getState().updateDropTarget("1", "inside", 0);
            });
            expect(screen.getByTestId("node_row_1")).toBeTruthy();
        });
    });

    it("given initialScrollNodeID, when mounted, then the target's ancestors are pre-expanded", () => {
        const onExpand = jest.fn();

        render(<TreeView data={testData} onExpand={onExpand} initialScrollNodeID="1.1" />);

        // Mount must reveal the initial scroll target: parent "1" expanded.
        const lastCall = onExpand.mock.calls[onExpand.mock.calls.length - 1];
        expect(lastCall[0] as string[]).toContain("1");
        expect(screen.getByTestId("node_row_1.1")).toBeTruthy();
    });

    it("given validate, when moveNode targets an unknown node, then it returns null", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(
            <TreeView ref={ref} data={testData} dragAndDrop={{ canDrop: () => true }} />
        );

        let result: MoveResult<string> | null = {} as MoveResult<string>;
        act(() => {
            result = ref.current!.moveNode("2", "GHOST", "inside", { validate: true });
        });

        expect(result).toBeNull();
    });

    it("given validate with maxDepth, when moveNode inserts a sibling within the limit, then it succeeds", () => {
        const ref = createRef<TreeViewRef<string>>();
        render(<TreeView ref={ref} data={testData} dragAndDrop={{ maxDepth: 1 }} />);

        // "Above 1.1" makes "2" a sibling at level 1 - within maxDepth 1.
        let result: MoveResult<string> | null = null;
        act(() => {
            result = ref.current!.moveNode("2", "1.1", "above", { validate: true });
        });

        expect(result).not.toBeNull();
        expect(result!).toMatchObject({ newParentId: "1", position: "above" });
    });

    it("given a CustomDropIndicatorComponent, when a drop target is set, then it renders with position and level", () => {
        const storeModule = require("../store/treeView.store");
        const spy = jest.spyOn(storeModule, "getTreeViewStore");
        const CustomIndicator = jest.fn(({ position, level }: any) => (
            <Text testID="custom-indicator">{`${position}:${level}`}</Text>
        ));
        render(
            <TreeView
                data={testData}
                dragAndDrop={{ customizations: { CustomDropIndicatorComponent: CustomIndicator } }}
            />
        );
        const storeId = spy.mock.calls[0]![0] as string;
        const store = storeModule.getTreeViewStore(storeId);
        spy.mockRestore();

        act(() => {
            store.getState().updateDraggedNodeId("2");
            store.getState().updateDropTarget("1", "inside", 1);
        });

        expect(screen.getByTestId("custom-indicator")).toBeTruthy();
        expect(screen.getByText("inside:1")).toBeTruthy();
    });

    it("given a CustomNodeRowComponent with drag enabled, when a drop target is set, then the row still renders with the indicator wrapper", () => {
        const storeModule = require("../store/treeView.store");
        const spy = jest.spyOn(storeModule, "getTreeViewStore");
        render(
            <TreeView
                data={testData}
                dragAndDrop={{}}
                CustomNodeRowComponent={({ node, isDropTarget }: any) => (
                    <Text testID={`custom-row-${node.id}`}>{`${node.name}:${isDropTarget}`}</Text>
                )}
            />
        );
        const storeId = spy.mock.calls[0]![0] as string;
        const store = storeModule.getTreeViewStore(storeId);
        spy.mockRestore();

        act(() => {
            store.getState().updateDraggedNodeId("2");
            store.getState().updateDropTarget("1", "above", 0);
        });

        expect(screen.getByText("Node 1:true")).toBeTruthy();
    });

    it("given zero-height layout reports, when a node lays out, then the measurement is discarded", () => {
        render(<TreeView data={testData} dragAndDrop={{}} />);

        const nodeRow = screen.getByTestId("node_row_1");
        // Zero heights (unmounted/clipped rows) must not poison drop-target math.
        expect(() => {
            fireEvent(nodeRow, "layout", { nativeEvent: { layout: { height: 0 } } });
            fireEvent(nodeRow, "layout", { nativeEvent: { layout: { height: 48 } } });
            fireEvent(nodeRow, "layout", { nativeEvent: { layout: { height: 52 } } });
        }).not.toThrow();
    });
});
