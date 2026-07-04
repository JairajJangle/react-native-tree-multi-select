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

import { Text, TouchableOpacity } from "react-native";
import { Animated } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

    it("given display-only overlay, when the built-in checkbox is pressed, then store checked state is untouched", () => {
        const store = setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "2", name: "Leaf Node", level: 0,
        };

        render(<DragOverlay {...makeOverlayProps(node)} />);

        // The overlay is display-only: pointerEvents="none" blocks real presses,
        // so exercise the handler prop directly to prove it is inert.
        const checkboxTouchable = screen.getByText("unchecked").parent;
        fireEvent.press(checkboxTouchable!);
        act(() => {
            screen.UNSAFE_getAllByType(TouchableOpacity)[0]!.props.onPress();
        });

        expect(store.getState().checked.size).toBe(0);
        expect(screen.getByText("unchecked")).toBeTruthy();
    });

    it("given CustomNodeRowComponent, when its onCheck/onExpand are invoked, then they are inert no-ops", () => {
        const store = setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "1", name: "Parent Node",
            children: [{ id: "1.1", name: "Child 1" }],
            level: 0,
        };

        // pointerEvents="none" blocks real presses on the overlay, so invoke the
        // injected handlers directly: the display-only contract is they do nothing.
        const CustomRow = ({ onCheck, onExpand }: any) => {
            onCheck();
            onExpand();
            return <Text testID="custom-row">row</Text>;
        };

        render(
            <DragOverlay
                {...makeOverlayProps(node)}
                CustomNodeRowComponent={CustomRow}
            />
        );

        expect(screen.getByTestId("custom-row")).toBeTruthy();
        expect(store.getState().checked.size).toBe(0);
        expect(store.getState().expanded.size).toBe(0);
    });

    it("given partial overlay style props, when rendered, then only the provided fields are overridden", () => {
        setupStore();

        const node: __FlattenedTreeNode__<string> = {
            id: "2", name: "Leaf Node", level: 0,
        };

        render(
            <DragOverlay
                {...makeOverlayProps(node)}
                dragDropCustomizations={{
                    dragOverlayStyleProps: {
                        shadowOffset: { width: 1, height: 1 },
                        zIndex: 42,
                    },
                }}
            />
        );

        // Renders fine with the unset fields falling back to the built-in style
        expect(screen.getByText("unchecked")).toBeTruthy();
    });

    describe("memoization (overlayPropsAreEqual)", () => {
        const node: __FlattenedTreeNode__<string> = {
            id: "1", name: "Parent Node",
            children: [{ id: "1.1", name: "Child 1" }],
            level: 0,
        };

        function renderCountingOverlay() {
            let renders = 0;
            const CountingOverlay = () => {
                renders += 1;
                return <Text testID="counting-overlay">overlay</Text>;
            };
            return { CountingOverlay, getRenders: () => renders };
        }

        it("given fresh-but-equal style and customization literals, when re-rendered, then the overlay does not re-render", () => {
            setupStore();
            const { CountingOverlay, getRenders } = renderCountingOverlay();

            // Consumers routinely pass fresh (but deep-equal) literals per render;
            // the overlay must compare them by value and skip the re-render,
            // otherwise the Animated transform re-binds and flashes mid-drag.
            const sharedY = new Animated.Value(0);
            const sharedX = new Animated.Value(0);
            const makeProps = () => ({
                ...makeOverlayProps(node),
                overlayY: sharedY,
                overlayX: sharedX,
                checkBoxViewStyleProps: { outermostParentViewStyle: { margin: 1 } },
                dragDropCustomizations: { CustomDragOverlayComponent: CountingOverlay },
            });

            const { rerender } = render(<DragOverlay {...makeProps()} />);
            expect(getRenders()).toBe(1);

            rerender(<DragOverlay {...makeProps()} />);

            expect(getRenders()).toBe(1);
        });

        it("given a meaningfully changed prop, when re-rendered, then the overlay re-renders", () => {
            setupStore();
            const { CountingOverlay, getRenders } = renderCountingOverlay();

            const sharedY = new Animated.Value(0);
            const sharedX = new Animated.Value(0);
            const baseProps = () => ({
                ...makeOverlayProps(node),
                overlayY: sharedY,
                overlayX: sharedX,
                dragDropCustomizations: { CustomDragOverlayComponent: CountingOverlay },
            });

            const { rerender } = render(<DragOverlay {...baseProps()} />);
            expect(getRenders()).toBe(1);

            // A different dragged node must re-render the overlay
            const otherNode: __FlattenedTreeNode__<string> = { id: "2", name: "Leaf Node", level: 0 };
            rerender(<DragOverlay {...baseProps()} node={otherNode} />);
            expect(getRenders()).toBe(2);

            // A different level must re-render the overlay
            rerender(<DragOverlay {...baseProps()} node={otherNode} level={3} />);
            expect(getRenders()).toBe(3);

            // A different Animated position ref must re-render the overlay
            rerender(<DragOverlay {...baseProps()} node={otherNode} level={3} overlayY={new Animated.Value(5)} />);
            expect(getRenders()).toBe(4);

            // A different indentationMultiplier must re-render the overlay
            rerender(<DragOverlay {...baseProps()} node={otherNode} level={3} overlayY={new Animated.Value(5)} indentationMultiplier={30} />);
            expect(getRenders()).toBe(5);
        });
    });
});
