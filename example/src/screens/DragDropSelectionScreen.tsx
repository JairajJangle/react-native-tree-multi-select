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
    moveTreeNode,
    type TreeViewRef,
    type TreeNode,
    type DragEndEvent,
    type DragStartEvent,
    type DragCancelEvent,
} from "react-native-tree-multi-select";

import { styles as screenStyles, treeFlashListProps } from "./screens.styles";

/**
 * Showcases the interplay between drag-and-drop and tri-state selection:
 * check a subtree, drag it into another parent, and watch the checked /
 * indeterminate states of both the old and new ancestor chains recalculate
 * automatically. Also demonstrates onDragStart / onDragCancel and the
 * validated programmatic moveNode() ref method with scroll-to-node.
 */

const initialData: TreeNode[] = [
    {
        id: "eng",
        name: "Engineering",
        children: [
            { id: "eng.1", name: "Alice" },
            { id: "eng.2", name: "Bob" },
            {
                id: "eng.mobile",
                name: "Mobile Squad",
                children: [
                    { id: "eng.mobile.1", name: "Carol" },
                    { id: "eng.mobile.2", name: "Dave" },
                ],
            },
        ],
    },
    {
        id: "design",
        name: "Design",
        children: [
            { id: "design.1", name: "Erin" },
            { id: "design.2", name: "Frank" },
        ],
    },
    {
        id: "sales",
        name: "Sales",
        children: [
            { id: "sales.1", name: "Grace" },
            { id: "sales.2", name: "Heidi" },
        ],
    },
];

export default function DragDropSelectionScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [status, setStatus] = useState(
        "Check a few people, then drag them between teams"
    );
    const [checkedCount, setCheckedCount] = useState(0);
    const [indeterminateCount, setIndeterminateCount] = useState(0);

    // Live tri-state selection: after any drag-drop move the library
    // recalculates parent checked/indeterminate states and this fires again.
    const handleCheck = useCallback((
        checkedIds: string[],
        indeterminateIds: string[]
    ) => {
        setCheckedCount(checkedIds.length);
        setIndeterminateCount(indeterminateIds.length);
    }, []);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setStatus(`Dragging "${event.draggedNodeId}"...`);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(prev => moveTreeNode(
            prev, event.draggedNodeId, event.targetNodeId, event.position
        ));
        setStatus(
            `Moved "${event.draggedNodeId}" ${event.position} "${event.targetNodeId}" `
            + "- watch the parent checkboxes recalculate"
        );
    }, []);

    const handleDragCancel = useCallback((event: DragCancelEvent) => {
        setStatus(`Cancelled dragging "${event.draggedNodeId}"`);
    }, []);

    // Programmatic, validated move: succeeds (Mobile Squad accepts children).
    const moveAliceToMobile = () => {
        const result = treeViewRef.current?.moveNode(
            "eng.1", "eng.mobile", "inside",
            { validate: true, scrollToNode: true }
        );
        setStatus(result
            ? `moveNode(): Alice -> inside Mobile Squad (new index ${result.newIndex})`
            : "moveNode(): blocked by validation or no-op");
        if (result) {
            setData(treeViewRef.current!.getTreeData());
        }
    };

    // Programmatic, validated move: BLOCKED (canNodeHaveChildren rejects
    // dropping "inside" a person - only teams can contain nodes).
    const moveBobInsideGrace = () => {
        const result = treeViewRef.current?.moveNode(
            "eng.2", "sales.1", "inside",
            { validate: true, scrollToNode: true }
        );
        setStatus(result
            ? "moveNode(): unexpected success"
            : "moveNode(): blocked - people cannot contain other nodes");
        if (result) {
            setData(treeViewRef.current!.getTreeData());
        }
    };

    // Only "team" nodes (the ones that started with children) accept children.
    const canNodeHaveChildren = useCallback(
        (node: TreeNode) => !String(node.id).includes("."),
        []
    );

    const resetPress = () => {
        setData(initialData);
        treeViewRef.current?.unselectAll();
        setStatus("Check a few people, then drag them between teams");
    };

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.statusText}>{status}</Text>
            <Text style={localStyles.countsText}>
                checked: {checkedCount} | indeterminate: {indeterminateCount}
            </Text>

            <View style={screenStyles.selectionButtonRow}>
                <Button title="Alice → Mobile" onPress={moveAliceToMobile} />
                <Button title="Bob → in Grace (blocked)" onPress={moveBobInsideGrace} />
            </View>
            <View
                style={[
                    screenStyles.selectionButtonRow,
                    screenStyles.selectionButtonBottom,
                ]}
            >
                <Button title="Reset" onPress={resetPress} />
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    treeFlashListProps={treeFlashListProps}
                    ref={treeViewRef}
                    data={data}
                    onCheck={handleCheck}
                    dragAndDrop={{
                        onDragStart: handleDragStart,
                        onDragEnd: handleDragEnd,
                        onDragCancel: handleDragCancel,
                        canNodeHaveChildren,
                    }}
                    preExpandedIds={["eng", "eng.mobile", "design", "sales"]}
                />
            </View>
        </SafeAreaView>
    );
}

const localStyles = StyleSheet.create({
    statusText: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 4,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
    },
    countsText: {
        paddingBottom: 8,
        fontSize: 12,
        color: "#0078FF",
        textAlign: "center",
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
});
