import { useRef, useState, useCallback, memo } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Button,
    TouchableOpacity,
} from "react-native";

import {
    TreeView,
    type TreeViewRef,
    type TreeNode,
    type DragEndEvent,
    type NodeRowProps,
} from "react-native-tree-multi-select";

import { styles as screenStyles } from "./screens.styles";

const initialData: TreeNode[] = [
    {
        id: "team",
        name: "Engineering Team",
        children: [
            {
                id: "frontend",
                name: "Frontend",
                children: [
                    { id: "fe-1", name: "Alice Chen" },
                    { id: "fe-2", name: "Bob Park" },
                    { id: "fe-3", name: "Carol Liu" },
                ],
            },
            {
                id: "backend",
                name: "Backend",
                children: [
                    { id: "be-1", name: "Dave Kim" },
                    { id: "be-2", name: "Eve Santos" },
                ],
            },
            {
                id: "devops",
                name: "DevOps",
                children: [
                    { id: "do-1", name: "Frank Lee" },
                ],
            },
        ],
    },
    {
        id: "design",
        name: "Design Team",
        children: [
            { id: "d-1", name: "Grace Wang" },
            { id: "d-2", name: "Henry Zhao" },
        ],
    },
    {
        id: "pm",
        name: "Product",
        children: [
            { id: "pm-1", name: "Iris Patel" },
            { id: "pm-2", name: "Jack Moreno" },
        ],
    },
];

function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const avatarColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
];

function getColor(id: string): string {
    let hash = 0;
    // eslint-disable-next-line no-bitwise
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length]!;
}

const TeamNodeRow = memo(_TeamNodeRow) as typeof _TeamNodeRow;
function _TeamNodeRow<ID = string>(props: NodeRowProps<ID>) {
    const { node, level, checkedValue, isExpanded, onCheck, onExpand,
        isDragging, isDraggedNode, isDragTarget } = props;

    const isLeaf = !node.children?.length;
    const isChecked = checkedValue === true;
    const isIndeterminate = checkedValue === "indeterminate";

    const rowOpacity = isDragging && (isDraggedNode || isDragTarget) ? 0.3 : 1;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCheck}
            style={[
                rowStyles.row,
                { paddingLeft: 12 + level * 20, opacity: rowOpacity },
                isChecked && rowStyles.rowChecked,
            ]}
        >
            {isLeaf ? (
                <View style={[rowStyles.avatar, { backgroundColor: getColor(String(node.id)) }]}>
                    <Text style={rowStyles.avatarText}>{getInitials(node.name)}</Text>
                </View>
            ) : (
                <View style={[rowStyles.folderIcon, isChecked && rowStyles.folderIconChecked]}>
                    <Text style={rowStyles.folderEmoji}>
                        {isExpanded ? "📂" : "📁"}
                    </Text>
                </View>
            )}

            <View style={rowStyles.textContainer}>
                <Text style={[
                    rowStyles.name,
                    isChecked && rowStyles.nameChecked,
                ]} numberOfLines={1}>
                    {node.name}
                </Text>
                {!isLeaf && (
                    <Text style={rowStyles.subtitle}>
                        {node.children!.length} member{node.children!.length !== 1 ? "s" : ""}
                        {isIndeterminate ? " · Partial" : isChecked ? " · All selected" : ""}
                    </Text>
                )}
            </View>

            {/* Checkbox indicator */}
            <View style={[
                rowStyles.checkbox,
                isChecked && rowStyles.checkboxChecked,
                isIndeterminate && rowStyles.checkboxIndeterminate,
            ]}>
                {isChecked && <Text style={rowStyles.checkmark}>✓</Text>}
                {isIndeterminate && <Text style={rowStyles.dash}>−</Text>}
            </View>

            {!isLeaf && (
                <TouchableOpacity onPress={onExpand} style={rowStyles.expandBtn}>
                    <Text style={rowStyles.expandIcon}>{isExpanded ? "▾" : "▸"}</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

export default function DragDropCustomRowScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState("");

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(event.newTreeData);
        const action = event.position === "inside" ? "into" : event.position;
        setLastDrop(`Moved ${action} "${event.targetNodeId}"`);
    }, []);

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.header}>
                {lastDrop || "Drag to reorganize team members"}
            </Text>

            <View style={screenStyles.selectionButtonRow}>
                <Button title="Expand All" onPress={() => treeViewRef.current?.expandAll()} />
                <Button title="Collapse All" onPress={() => treeViewRef.current?.collapseAll()} />
            </View>
            <View style={[screenStyles.selectionButtonRow, screenStyles.selectionButtonBottom]}>
                <Button title="Reset Teams" onPress={() => { setData(initialData); setLastDrop(""); }} />
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    ref={treeViewRef}
                    data={data}
                    onCheck={() => {}}
                    onExpand={() => {}}
                    dragEnabled={true}
                    onDragEnd={handleDragEnd}
                    preExpandedIds={["team", "frontend", "backend", "devops", "design", "pm"]}
                    CustomNodeRowComponent={TeamNodeRow}
                    dragDropCustomizations={{
                        draggedNodeOpacity: 0.15,
                        dragOverlayStyleProps: {
                            backgroundColor: "rgba(255, 255, 255, 0.98)",
                            shadowColor: "#000",
                            shadowOpacity: 0.2,
                            shadowRadius: 12,
                            elevation: 20,
                            style: {
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: "rgba(0,0,0,0.06)",
                            },
                        },
                        dropIndicatorStyleProps: {
                            lineColor: "#4ECDC4",
                            lineThickness: 2,
                            circleSize: 8,
                            highlightColor: "rgba(78, 205, 196, 0.1)",
                            highlightBorderColor: "rgba(78, 205, 196, 0.4)",
                        },
                    }}
                />
            </View>
        </SafeAreaView>
    );
}

const localStyles = StyleSheet.create({
    header: {
        padding: 12,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
});

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingRight: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#f0f0f0",
    },
    rowChecked: {
        backgroundColor: "rgba(78, 205, 196, 0.06)",
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    avatarText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    folderIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        backgroundColor: "#f5f5f5",
    },
    folderIconChecked: {
        backgroundColor: "rgba(78, 205, 196, 0.15)",
    },
    folderEmoji: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        color: "#1a1a1a",
        fontWeight: "500",
    },
    nameChecked: {
        color: "#2d9a93",
    },
    subtitle: {
        fontSize: 11,
        color: "#999",
        marginTop: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: "#ccc",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    checkboxChecked: {
        backgroundColor: "#4ECDC4",
        borderColor: "#4ECDC4",
    },
    checkboxIndeterminate: {
        backgroundColor: "transparent",
        borderColor: "#4ECDC4",
    },
    checkmark: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    dash: {
        color: "#4ECDC4",
        fontSize: 16,
        fontWeight: "700",
        marginTop: -2,
    },
    expandBtn: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    expandIcon: {
        fontSize: 16,
        color: "#999",
    },
});
