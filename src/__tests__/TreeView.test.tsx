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
import { render, act, screen } from "@testing-library/react-native";
import { TreeView } from "../TreeView";
import type { TreeNode, TreeViewRef } from "../types/treeView.types";

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

    it("given unmount, when component unmounts, then no errors occur", () => {
        const { unmount } = render(<TreeView data={testData} />);

        expect(() => unmount()).not.toThrow();
    });
});
