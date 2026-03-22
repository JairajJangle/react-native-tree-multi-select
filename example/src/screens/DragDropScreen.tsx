import { useRef, useState, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Button,
    Switch,
} from "react-native";

import {
    TreeView,
    type TreeViewRef,
    type TreeNode,
    type DragEndEvent,
} from "react-native-tree-multi-select";

import { styles as screenStyles } from "./screens.styles";

const initialData: TreeNode[] = [
    {
        id: "1",
        name: "Fruits",
        children: [
            { id: "1.1", name: "Apple" },
            { id: "1.2", name: "Banana" },
            {
                id: "1.3",
                name: "Citrus",
                children: [
                    { id: "1.3.1", name: "Orange" },
                    { id: "1.3.2", name: "Lemon" },
                    { id: "1.3.3", name: "Grapefruit" },
                ],
            },
            { id: "1.4", name: "Cherry" },
            { id: "1.5", name: "Mango" },
        ],
    },
    {
        id: "2",
        name: "Vegetables",
        children: [
            { id: "2.1", name: "Carrot" },
            { id: "2.2", name: "Broccoli" },
            {
                id: "2.3",
                name: "Leafy Greens",
                children: [
                    { id: "2.3.1", name: "Spinach" },
                    { id: "2.3.2", name: "Kale" },
                    { id: "2.3.3", name: "Lettuce" },
                ],
            },
            { id: "2.4", name: "Pepper" },
            { id: "2.5", name: "Tomato" },
        ],
    },
    {
        id: "3",
        name: "Grains",
        children: [
            { id: "3.1", name: "Rice" },
            { id: "3.2", name: "Wheat" },
            { id: "3.3", name: "Oats" },
        ],
    },
    {
        id: "4",
        name: "Dairy",
        children: [
            { id: "4.1", name: "Milk" },
            { id: "4.2", name: "Cheese" },
            { id: "4.3", name: "Yogurt" },
        ],
    },
    { id: "5", name: "Snacks" },
    { id: "6", name: "Beverages" },
];

export default function DragDropScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState<string>("");
    const [dragEnabled, setDragEnabled] = useState(true);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(event.newTreeData);
        setLastDrop(
            `Moved "${event.draggedNodeId}" ${event.position} "${event.targetNodeId}"`
        );
    }, []);

    const handleSelectionChange = useCallback(
        (_checkedIds: string[], _indeterminateIds: string[]) => {},
        []
    );

    const handleExpanded = useCallback((_expandedIds: string[]) => {}, []);

    const expandAllPress = () => treeViewRef.current?.expandAll?.();
    const collapseAllPress = () => treeViewRef.current?.collapseAll?.();
    const resetPress = () => {
        setData(initialData);
        setLastDrop("");
    };

    return (
        <SafeAreaView style={screenStyles.mainView}>
            {lastDrop ? (
                <Text style={localStyles.dropInfo}>{lastDrop}</Text>
            ) : (
                <Text style={localStyles.dropInfo}>
                    Long-press a node to start dragging
                </Text>
            )}

            <View style={screenStyles.selectionButtonRow}>
                <Button title="Expand All" onPress={expandAllPress} />
                <Button title="Collapse All" onPress={collapseAllPress} />
            </View>

            <View
                style={[
                    screenStyles.selectionButtonRow,
                    screenStyles.selectionButtonBottom,
                ]}
            >
                <Button title="Reset Tree" onPress={resetPress} />
                <View style={localStyles.toggleRow}>
                    <Text style={localStyles.toggleLabel}>Drag</Text>
                    <Switch value={dragEnabled} onValueChange={setDragEnabled} />
                </View>
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    ref={treeViewRef}
                    data={data}
                    onCheck={handleSelectionChange}
                    onExpand={handleExpanded}
                    dragEnabled={dragEnabled}
                    onDragEnd={handleDragEnd}
                    preExpandedIds={["1", "2"]}
                />
            </View>
        </SafeAreaView>
    );
}

const localStyles = StyleSheet.create({
    dropInfo: {
        padding: 10,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    toggleLabel: {
        fontSize: 14,
        marginRight: 6,
        color: "#333",
    },
});
