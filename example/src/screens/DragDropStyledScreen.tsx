import { useRef, useState, useCallback } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Button,
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
        name: "Design System",
        children: [
            {
                id: "1.1",
                name: "Colors",
                children: [
                    { id: "1.1.1", name: "Primary" },
                    { id: "1.1.2", name: "Secondary" },
                    { id: "1.1.3", name: "Neutral" },
                ],
            },
            {
                id: "1.2",
                name: "Typography",
                children: [
                    { id: "1.2.1", name: "Headings" },
                    { id: "1.2.2", name: "Body Text" },
                ],
            },
            { id: "1.3", name: "Spacing" },
        ],
    },
    {
        id: "2",
        name: "Components",
        children: [
            { id: "2.1", name: "Button" },
            { id: "2.2", name: "Card" },
            { id: "2.3", name: "Modal" },
            { id: "2.4", name: "Tooltip" },
        ],
    },
    {
        id: "3",
        name: "Patterns",
        children: [
            { id: "3.1", name: "Forms" },
            { id: "3.2", name: "Navigation" },
            { id: "3.3", name: "Data Display" },
        ],
    },
    { id: "4", name: "Utilities" },
];

export default function DragDropStyledScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState("");

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(event.newTreeData);
        setLastDrop(
            `"${event.draggedNodeId}" → ${event.position} "${event.targetNodeId}"`
        );
    }, []);

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.dropInfo}>
                {lastDrop || "Styled drop indicator & overlay"}
            </Text>

            <View style={screenStyles.selectionButtonRow}>
                <Button title="Expand All" onPress={() => treeViewRef.current?.expandAll()} />
                <Button title="Collapse All" onPress={() => treeViewRef.current?.collapseAll()} />
            </View>
            <View style={[screenStyles.selectionButtonRow, screenStyles.selectionButtonBottom]}>
                <Button title="Reset" onPress={() => { setData(initialData); setLastDrop(""); }} />
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    ref={treeViewRef}
                    data={data}
                    onCheck={() => {}}
                    onExpand={() => {}}
                    dragEnabled={true}
                    onDragEnd={handleDragEnd}
                    preExpandedIds={["1", "2", "3"]}
                    dragDropCustomizations={{
                        draggedNodeOpacity: 0.15,
                        dragOverlayStyleProps: {
                            backgroundColor: "rgba(230, 240, 255, 0.97)",
                            shadowColor: "#3366FF",
                            shadowOpacity: 0.35,
                            shadowRadius: 8,
                            elevation: 15,
                            style: {
                                borderLeftWidth: 3,
                                borderLeftColor: "#3366FF",
                                borderRadius: 6,
                            },
                        },
                        dropIndicatorStyleProps: {
                            lineColor: "#FF6B35",
                            lineThickness: 3,
                            circleSize: 12,
                            highlightColor: "rgba(255, 107, 53, 0.12)",
                            highlightBorderColor: "rgba(255, 107, 53, 0.5)",
                        },
                    }}
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
});
