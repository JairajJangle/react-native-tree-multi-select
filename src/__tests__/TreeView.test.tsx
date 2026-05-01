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
});
