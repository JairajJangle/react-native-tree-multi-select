import { useRef, useState, useCallback, useMemo } from "react";
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
    moveTreeNode,
    type TreeViewRef,
    type TreeNode,
    type DragEndEvent,
} from "react-native-tree-multi-select";

import { styles as screenStyles, treeFlashListProps } from "./screens.styles";
import { defaultID, generateTreeList } from "../utils/sampleDataGenerator";

/**
 * Interactive playground for the drag-and-drop physics/behavior options:
 * autoExpand (hover-to-expand), magneticSnap (overlay indent spring),
 * autoScrollToDroppedNode, canDrag (locked nodes), invalidTargetOpacity,
 * plus live presets for autoScrollSpeed and longPressDuration. The tree is
 * large on purpose so edge auto-scroll is easy to try.
 */

const SPEED_PRESETS = [0.5, 1, 2] as const;
const LONG_PRESS_PRESETS = [250, 400, 800] as const;

export default function DragDropPlaygroundScreen() {
    const initialData = useMemo(
        () => generateTreeList(30, 4, 3, defaultID, "1"),
        []
    );
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState("Long-press a node to drag");

    const [autoExpand, setAutoExpand] = useState(true);
    const [magneticSnap, setMagneticSnap] = useState(true);
    const [scrollToDropped, setScrollToDropped] = useState(true);
    const [lockParents, setLockParents] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1);
    const [longPressIdx, setLongPressIdx] = useState(1);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(prev => moveTreeNode(
            prev, event.draggedNodeId, event.targetNodeId, event.position
        ));
        setLastDrop(
            `Moved "${event.draggedNodeId}" ${event.position} "${event.targetNodeId}"`
        );
    }, []);

    // canDrag: when enabled, parent nodes are locked in place - only leaves
    // can be picked up. Locked rows simply don't react to long-press.
    const canDrag = useCallback(
        (node: TreeNode) => !node.children?.length,
        []
    );

    const cycleSpeed = () =>
        setSpeedIdx(idx => (idx + 1) % SPEED_PRESETS.length);
    const cycleLongPress = () =>
        setLongPressIdx(idx => (idx + 1) % LONG_PRESS_PRESETS.length);

    const resetPress = () => {
        setData(initialData);
        setLastDrop("Long-press a node to drag");
    };

    return (
        <SafeAreaView style={screenStyles.mainView}>
            <Text style={localStyles.dropInfo}>{lastDrop}</Text>

            <View style={localStyles.optionsRow}>
                <View style={localStyles.toggleRow}>
                    <Text style={localStyles.toggleLabel}>autoExpand</Text>
                    <Switch value={autoExpand} onValueChange={setAutoExpand} />
                </View>
                <View style={localStyles.toggleRow}>
                    <Text style={localStyles.toggleLabel}>magneticSnap</Text>
                    <Switch value={magneticSnap} onValueChange={setMagneticSnap} />
                </View>
            </View>

            <View style={localStyles.optionsRow}>
                <View style={localStyles.toggleRow}>
                    <Text style={localStyles.toggleLabel}>scroll to dropped</Text>
                    <Switch value={scrollToDropped} onValueChange={setScrollToDropped} />
                </View>
                <View style={localStyles.toggleRow}>
                    <Text style={localStyles.toggleLabel}>lock parents (canDrag)</Text>
                    <Switch value={lockParents} onValueChange={setLockParents} />
                </View>
            </View>

            <View
                style={[
                    screenStyles.selectionButtonRow,
                    screenStyles.selectionButtonBottom,
                ]}
            >
                <Button
                    title={`Scroll speed: ${SPEED_PRESETS[speedIdx]}x`}
                    onPress={cycleSpeed}
                />
                <Button
                    title={`Long-press: ${LONG_PRESS_PRESETS[longPressIdx]}ms`}
                    onPress={cycleLongPress}
                />
                <Button title="Reset" onPress={resetPress} />
            </View>

            <View style={screenStyles.treeViewParent}>
                <TreeView
                    treeFlashListProps={treeFlashListProps}
                    ref={treeViewRef}
                    data={data}
                    onCheck={() => { }}
                    dragAndDrop={{
                        onDragEnd: handleDragEnd,
                        autoExpand,
                        magneticSnap,
                        autoScrollToDroppedNode: scrollToDropped,
                        autoScrollSpeed: SPEED_PRESETS[speedIdx],
                        longPressDuration: LONG_PRESS_PRESETS[longPressIdx],
                        canDrag: lockParents ? canDrag : undefined,
                        customizations: {
                            // Self/descendants (and locked rows during a drag)
                            // fade harder than the default 0.3 to stand out.
                            invalidTargetOpacity: 0.15,
                        },
                    }}
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
        fontSize: 12,
        marginRight: 6,
        color: "#333",
    },
    optionsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
});
