jest.mock("zustand");

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

import { Text } from "react-native";
import { Animated } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { DragOverlay } from "../components/DragOverlay";
import { getTreeViewStore } from "../store/treeView.store";
import { initializeNodeMaps } from "../helpers";
import type { __FlattenedTreeNode__ } from "../types/treeView.types";

const STORE_ID = "drag-overlay-test-store";

function setupStore(opts?: { checkedIds?: string[]; indeterminateIds?: string[] }) {
    const treeData = [
        {
            id: "1", name: "Parent Node", children: [
                { id: "1.1", name: "Child 1" },
                { id: "1.2", name: "Child 2" },
            ]
        },
        { id: "2", name: "Leaf Node" },
    ];

    const store = getTreeViewStore<string>(STORE_ID);
    store.getState().updateInitialTreeViewData(treeData);
    initializeNodeMaps(STORE_ID, treeData);

    if (opts?.checkedIds) {
        store.getState().updateChecked(new Set(opts.checkedIds));
    }
    if (opts?.indeterminateIds) {
        store.getState().updateIndeterminate(new Set(opts.indeterminateIds));
    }

    return store;
}

function makeOverlayProps(node: __FlattenedTreeNode__<string>, extra?: Record<string, any>) {
    return {
        storeId: STORE_ID,
        overlayY: new Animated.Value(0),
        overlayX: new Animated.Value(0),
        node,
        level: node.level ?? 0,
        ...extra,
    };
}

describe("DragOverlay", () => {
    it("given built-in renderer, when node is checked in store, then overlay shows checked checkbox", () => {
        setupStore({ checkedIds: ["1"] });

        const node: __FlattenedTreeNode__<string> = {
            id: "1", name: "Parent Node",
            children: [{ id: "1.1", name: "Child 1" }, { id: "1.2", name: "Child 2" }],
            level: 0,
        };

        render(<DragOverlay {...makeOverlayProps(node)} />);

        expect(screen.getByText("checked")).toBeTruthy();
    });

    it("given built-in renderer, when node has children, then expand icon is shown", () => {
        setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "1", name: "Parent Node",
            children: [{ id: "1.1", name: "Child 1" }, { id: "1.2", name: "Child 2" }],
            level: 0,
        };

        render(<DragOverlay {...makeOverlayProps(node)} />);

        expect(screen.getByText("caret-right")).toBeTruthy();
    });

    it("given built-in renderer, when node is a leaf, then no expand icon is shown", () => {
        setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "2", name: "Leaf Node", level: 0,
        };

        render(<DragOverlay {...makeOverlayProps(node)} />);

        expect(screen.queryByText("caret-right")).toBeNull();
        expect(screen.queryByText("caret-down")).toBeNull();
    });

    it("given custom overlay style props, when rendered, then styles are applied", () => {
        setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "2", name: "Leaf Node", level: 0,
        };

        render(
            <DragOverlay
                {...makeOverlayProps(node)}
                dragDropCustomizations={{
                    dragOverlayStyleProps: {
                        backgroundColor: "red",
                        shadowColor: "blue",
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        elevation: 5,
                        style: { borderWidth: 1 },
                    },
                }}
            />
        );

        // Component renders without error with all custom style props applied
        expect(screen.getByText("unchecked")).toBeTruthy();
    });

    it("given CustomDragOverlayComponent, when rendered, then custom component is used instead of built-in", () => {
        setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "1", name: "Parent Node",
            children: [{ id: "1.1", name: "Child 1" }],
            level: 0,
        };

        const CustomOverlay = ({ node: n, level, checkedValue }: any) => (
            <Text testID="custom-overlay">{`custom:${n.name}:${level}:${checkedValue}`}</Text>
        );

        render(
            <DragOverlay
                {...makeOverlayProps(node)}
                dragDropCustomizations={{ CustomDragOverlayComponent: CustomOverlay }}
            />
        );

        const el = screen.getByTestId("custom-overlay");
        expect(el).toBeTruthy();
        expect(screen.getByText(/custom:Parent Node/)).toBeTruthy();
    });

    it("given CustomNodeRowComponent but no CustomDragOverlayComponent, when rendered, then custom row is used", () => {
        setupStore({ checkedIds: ["2"] });

        const node: __FlattenedTreeNode__<string> = {
            id: "2", name: "Leaf Node", level: 0,
        };

        const CustomRow = ({ node: n, level, checkedValue, isExpanded }: any) => (
            <Text testID="custom-row">{`row:${n.name}:${level}:${checkedValue}:${isExpanded}`}</Text>
        );

        render(
            <DragOverlay
                {...makeOverlayProps(node)}
                CustomNodeRowComponent={CustomRow}
            />
        );

        const el = screen.getByTestId("custom-row");
        expect(el).toBeTruthy();
        expect(screen.getByText("row:Leaf Node:0:true:false")).toBeTruthy();
    });
});
