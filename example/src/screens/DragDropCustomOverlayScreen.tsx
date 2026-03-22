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
    type DragOverlayComponentProps,
    type DropIndicatorComponentProps,
} from "react-native-tree-multi-select";

import { styles as screenStyles } from "./screens.styles";

const initialData: TreeNode[] = [
    {
        id: "inbox",
        name: "Inbox",
        children: [
            { id: "inbox-1", name: "Welcome email" },
            { id: "inbox-2", name: "Meeting invite" },
            { id: "inbox-3", name: "Project update" },
        ],
    },
    {
        id: "work",
        name: "Work",
        children: [
            {
                id: "work-proj",
                name: "Projects",
                children: [
                    { id: "proj-1", name: "Mobile App v2" },
                    { id: "proj-2", name: "API Migration" },
                ],
            },
            { id: "work-1", name: "Sprint planning" },
            { id: "work-2", name: "Code review" },
        ],
    },
    {
        id: "personal",
        name: "Personal",
        children: [
            { id: "personal-1", name: "Grocery list" },
            { id: "personal-2", name: "Workout plan" },
            { id: "personal-3", name: "Book notes" },
        ],
    },
    {
        id: "archive",
        name: "Archive",
        children: [
            { id: "archive-1", name: "Old reports" },
            { id: "archive-2", name: "2024 docs" },
        ],
    },
];

function CustomDragOverlay({ node, level }: DragOverlayComponentProps) {
    return (
        <View style={overlayStyles.container}>
            <View style={overlayStyles.iconContainer}>
                <Text style={overlayStyles.icon}>
                    {node.children?.length ? "📁" : "📄"}
                </Text>
            </View>
            <View style={overlayStyles.textContainer}>
                <Text style={overlayStyles.name} numberOfLines={1}>
                    {node.name}
                </Text>
                <Text style={overlayStyles.meta}>
                    {node.children?.length
                        ? `${node.children.length} items · Level ${level}`
                        : `Level ${level}`}
                </Text>
            </View>
            <Text style={overlayStyles.dragIcon}>✦</Text>
        </View>
    );
}

function CustomDropIndicator({ position }: DropIndicatorComponentProps) {
    if (position === "inside") {
        return (
            <View style={indicatorStyles.insideContainer}>
                <View style={indicatorStyles.insideDot} />
                <Text style={indicatorStyles.insideText}>Drop here</Text>
                <View style={indicatorStyles.insideDot} />
            </View>
        );
    }

    return (
        <View
            style={[
                indicatorStyles.lineContainer,
                position === "above" ? { top: 0 } : { bottom: 0 },
            ]}
        >
            <View style={indicatorStyles.diamond} />
            <View style={indicatorStyles.line} />
            <View style={indicatorStyles.diamond} />
        </View>
    );
}

export default function DragDropCustomOverlayScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState("");

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(event.newTreeData);
        setLastDrop(
            `Moved "${event.draggedNodeId}" ${event.position} "${event.targetNodeId}"`
        );
    }, []);

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.dropInfo}>
                {lastDrop || "Custom overlay & drop indicator components"}
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
                    preExpandedIds={["inbox", "work", "personal"]}
                    longPressDuration={300}
                    autoExpandDelay={600}
                    dragDropCustomizations={{
                        draggedNodeOpacity: 0.2,
                        CustomDragOverlayComponent: CustomDragOverlay,
                        CustomDropIndicatorComponent: CustomDropIndicator,
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

const overlayStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "#1a1a2e",
        borderRadius: 10,
        marginHorizontal: 4,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    icon: {
        fontSize: 18,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    meta: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        marginTop: 2,
    },
    dragIcon: {
        color: "#6c63ff",
        fontSize: 18,
        marginLeft: 8,
    },
});

const indicatorStyles = StyleSheet.create({
    lineContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        height: 3,
        zIndex: 10,
    },
    line: {
        flex: 1,
        height: 2,
        backgroundColor: "#6c63ff",
    },
    diamond: {
        width: 8,
        height: 8,
        backgroundColor: "#6c63ff",
        transform: [{ rotate: "45deg" }],
    },
    insideContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(108, 99, 255, 0.08)",
        borderWidth: 1.5,
        borderColor: "rgba(108, 99, 255, 0.4)",
        borderRadius: 6,
        borderStyle: "dashed",
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    insideDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#6c63ff",
        marginHorizontal: 6,
    },
    insideText: {
        color: "#6c63ff",
        fontSize: 11,
        fontWeight: "600",
    },
});
