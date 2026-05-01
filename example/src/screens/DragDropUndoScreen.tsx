import { useRef, useState, useCallback } from "react";
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
    type DragCancelEvent,
    type DropPosition,
} from "react-native-tree-multi-select";

import { styles as screenStyles } from "./screens.styles";

const initialData: TreeNode[] = [
    {
        id: "1",
        name: "Documents",
        children: [
            {
                id: "1.1",
                name: "Work",
                children: [
                    { id: "1.1.1", name: "Proposal.pdf" },
                    { id: "1.1.2", name: "Budget.xlsx" },
                    { id: "1.1.3", name: "Notes.md" },
                ],
            },
            {
                id: "1.2",
                name: "Personal",
                children: [
                    { id: "1.2.1", name: "Resume.pdf" },
                    { id: "1.2.2", name: "Taxes-2025.pdf" },
                ],
            },
        ],
    },
    {
        id: "2",
        name: "Photos",
        children: [
            { id: "2.1", name: "Vacation" },
            { id: "2.2", name: "Family" },
            { id: "2.3", name: "Screenshots" },
        ],
    },
    {
        id: "3",
        name: "Downloads",
        children: [
            { id: "3.1", name: "installer.dmg" },
            { id: "3.2", name: "archive.zip" },
        ],
    },
];

/** A lightweight move command — stores only IDs and position, not the full tree. */
interface MoveCommand {
    nodeId: string;
    targetId: string;
    position: DropPosition;
}

/**
 * Given a tree and a node ID, return the inverse move command that would
 * restore the node to its current position after it has been moved away.
 *
 * - If the node has a previous sibling → move "below" that sibling
 * - If the node is the first child → move "inside" its parent (inserts as first child)
 * - If the node is the first root → move "above" the next root sibling
 */
function getInverseMove(tree: TreeNode[], nodeId: string): MoveCommand | null {
    return findPosition(tree, nodeId, null);
}

function findPosition(
    siblings: TreeNode[],
    nodeId: string,
    parentId: string | null,
): MoveCommand | null {
    for (let i = 0; i < siblings.length; i++) {
        const node = siblings[i]!;
        if (node.id === nodeId) {
            if (i > 0) {
                // Has a previous sibling — undo = move "below" it
                return { nodeId, targetId: siblings[i - 1]!.id, position: "below" };
            }
            if (parentId !== null) {
                // First child — undo = move "inside" parent (inserts as first child)
                return { nodeId, targetId: parentId, position: "inside" };
            }
            if (i < siblings.length - 1) {
                // First root node — undo = move "above" next root
                return { nodeId, targetId: siblings[i + 1]!.id, position: "above" };
            }
            // Only node in the tree — nothing to undo
            return null;
        }
        if (node.children) {
            const found = findPosition(node.children, nodeId, node.id);
            if (found) return found;
        }
    }
    return null;
}

const MAX_HISTORY = 20;

export default function DragDropUndoScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [undoStack, setUndoStack] = useState<MoveCommand[]>([]);
    const [redoStack, setRedoStack] = useState<MoveCommand[]>([]);
    const [status, setStatus] = useState("Drag nodes to reorganize");

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        // Compute the inverse move from the OLD tree (before the move was applied)
        const inverse = getInverseMove(data, event.draggedNodeId);
        if (inverse) {
            setUndoStack(prev => {
                const next = [inverse, ...prev];
                return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
            });
        }
        // New action breaks the redo chain
        setRedoStack([]);

        setData(event.newTreeData);
        setStatus(`Moved "${event.draggedNodeId}" ${event.position} "${event.targetNodeId}"`);
    }, [data]);

    const handleDragCancel = useCallback((_event: DragCancelEvent) => {
        setStatus("Drag cancelled");
    }, []);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const [inverseMove, ...rest] = undoStack;

        // Before applying the undo, compute the forward move so we can redo later
        const forwardMove = getInverseMove(data, inverseMove!.nodeId);
        if (forwardMove) {
            setRedoStack(prev => [forwardMove, ...prev]);
        }

        // Apply the inverse move via the ref
        treeViewRef.current?.moveNode(inverseMove!.nodeId, inverseMove!.targetId, inverseMove!.position);
        setUndoStack(rest);
        setData(prev => {
            // Re-read from ref isn't possible, so we apply moveTreeNode locally too
            // to keep our state in sync. The ref already updated the internal state.
            const { moveTreeNode } = require("react-native-tree-multi-select");
            return moveTreeNode(prev, inverseMove!.nodeId, inverseMove!.targetId, inverseMove!.position);
        });
        setStatus("Undid last move");
    }, [undoStack, data]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const [forwardMove, ...rest] = redoStack;

        // Before applying the redo, compute the inverse so we can undo again
        const inverse = getInverseMove(data, forwardMove!.nodeId);
        if (inverse) {
            setUndoStack(prev => [inverse, ...prev]);
        }

        treeViewRef.current?.moveNode(forwardMove!.nodeId, forwardMove!.targetId, forwardMove!.position);
        setRedoStack(rest);
        setData(prev => {
            const { moveTreeNode } = require("react-native-tree-multi-select");
            return moveTreeNode(prev, forwardMove!.nodeId, forwardMove!.targetId, forwardMove!.position);
        });
        setStatus("Redid move");
    }, [redoStack, data]);

    const handleReset = useCallback(() => {
        setData(initialData);
        setUndoStack([]);
        setRedoStack([]);
        setStatus("Tree reset");
    }, []);

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.status}>{status}</Text>
            <Text style={localStyles.subtitle}>
                Undo/Redo applies to drag-drop moves only, not selection changes
            </Text>

            <View style={screenStyles.selectionButtonRow}>
                <Button title="Expand All" onPress={() => treeViewRef.current?.expandAll()} />
                <Button title="Collapse All" onPress={() => treeViewRef.current?.collapseAll()} />
            </View>

            <View style={[screenStyles.selectionButtonRow, screenStyles.selectionButtonBottom]}>
                <Button title="Reset" onPress={handleReset} />
                <View style={localStyles.undoRedoRow}>
                    <TouchableOpacity
                        style={[localStyles.actionButton, undoStack.length === 0 && localStyles.actionButtonDisabled]}
                        onPress={handleUndo}
                        disabled={undoStack.length === 0}
                    >
                        <Text style={[localStyles.actionText, undoStack.length === 0 && localStyles.actionTextDisabled]}>
                            Undo ({undoStack.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[localStyles.actionButton, localStyles.redoButton, redoStack.length === 0 && localStyles.actionButtonDisabled]}
                        onPress={handleRedo}
                        disabled={redoStack.length === 0}
                    >
                        <Text style={[localStyles.actionText, redoStack.length === 0 && localStyles.actionTextDisabled]}>
                            Redo ({redoStack.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    ref={treeViewRef}
                    data={data}
                    onCheck={() => {}}
                    onExpand={() => {}}
                    dragAndDrop={{
                        onDragEnd: handleDragEnd,
                        onDragCancel: handleDragCancel,
                    }}
                    preExpandedIds={["1", "1.1", "1.2", "2", "3"]}
                />
            </View>
        </SafeAreaView>
    );
}

const localStyles = StyleSheet.create({
    status: {
        padding: 10,
        paddingBottom: 4,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
    },
    subtitle: {
        paddingHorizontal: 10,
        paddingBottom: 8,
        fontSize: 11,
        color: "#999",
        textAlign: "center",
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
    undoRedoRow: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    redoButton: {
        backgroundColor: "#34C759",
    },
    actionButtonDisabled: {
        backgroundColor: "#ddd",
    },
    actionText: {
        color: "#fff",
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "600",
        textAlignVertical: "center" as const,
        includeFontPadding: false,
    },
    actionTextDisabled: {
        color: "#999",
    },
});
