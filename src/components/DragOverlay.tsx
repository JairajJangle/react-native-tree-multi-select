import { memo, type ComponentType } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { fastIsEqual } from "fast-is-equal";

import type {
    __FlattenedTreeNode__,
    CheckBoxViewProps,
    DragDropCustomizations,
    TreeItemCustomizations,
} from "../types/treeView.types";
import { CheckboxView } from "./CheckboxView";
import { CustomExpandCollapseIcon } from "./CustomExpandCollapseIcon";
import { defaultIndentationMultiplier } from "../constants/treeView.constants";
import { getTreeViewStore } from "../store/treeView.store";
import { getCheckboxValue } from "../helpers";

interface DragOverlayProps<ID> extends TreeItemCustomizations<ID> {
    storeId: string;
    overlayY: Animated.Value;
    overlayX: Animated.Value;
    node: __FlattenedTreeNode__<ID>;
    level: number;
    dragDropCustomizations?: DragDropCustomizations<ID>;
}

function _DragOverlay<ID>(props: DragOverlayProps<ID>) {
    const {
        storeId,
        overlayY,
        overlayX,
        node,
        level,
        indentationMultiplier = defaultIndentationMultiplier,
        CheckboxComponent = CheckboxView as ComponentType<CheckBoxViewProps>,
        ExpandCollapseIconComponent = CustomExpandCollapseIcon,
        CustomNodeRowComponent,
        checkBoxViewStyleProps,
        dragDropCustomizations,
    } = props;

    // Read the actual checked state for the dragged node
    const store = getTreeViewStore<ID>(storeId);
    const { checked, indeterminate } = store.getState();
    const checkedValue = getCheckboxValue(checked.has(node.id), indeterminate.has(node.id));

    const overlayStyleProps = dragDropCustomizations?.dragOverlayStyleProps;
    const CustomOverlay = dragDropCustomizations?.CustomDragOverlayComponent;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.overlay,
                overlayStyleProps && {
                    ...(overlayStyleProps.backgroundColor != null && { backgroundColor: overlayStyleProps.backgroundColor }),
                    ...(overlayStyleProps.shadowColor != null && { shadowColor: overlayStyleProps.shadowColor }),
                    ...(overlayStyleProps.shadowOffset != null && { shadowOffset: overlayStyleProps.shadowOffset }),
                    ...(overlayStyleProps.shadowOpacity != null && { shadowOpacity: overlayStyleProps.shadowOpacity }),
                    ...(overlayStyleProps.shadowRadius != null && { shadowRadius: overlayStyleProps.shadowRadius }),
                    ...(overlayStyleProps.elevation != null && { elevation: overlayStyleProps.elevation }),
                    ...(overlayStyleProps.zIndex != null && { zIndex: overlayStyleProps.zIndex }),
                },
                overlayStyleProps?.style,
                { transform: [{ translateX: overlayX }, { translateY: overlayY }] },
            ]}
        >
            {/* Render priority: CustomDragOverlayComponent > CustomNodeRowComponent > built-in.
               The overlay is display-only (pointerEvents="none" on parent), so handlers are no-ops.
               isExpanded is always false because useDragDrop collapses the node at drag start. */}
            {CustomOverlay ? (
                <CustomOverlay node={node} level={level} checkedValue={checkedValue} />
            ) : CustomNodeRowComponent ? (
                <CustomNodeRowComponent
                    node={node}
                    level={level}
                    checkedValue={checkedValue}
                    isExpanded={false}
                    onCheck={() => {}}
                    onExpand={() => {}}
                />
            ) : (
                <View
                    style={[
                        styles.nodeRow,
                        { paddingStart: level * indentationMultiplier },
                    ]}
                >
                    <CheckboxComponent
                        text={node.name}
                        onValueChange={() => {}}
                        value={checkedValue}
                        {...checkBoxViewStyleProps}
                    />
                    {node.children?.length ? (
                        <View style={styles.expandArrow}>
                            <ExpandCollapseIconComponent isExpanded={false} />
                        </View>
                    ) : null}
                </View>
            )}
        </Animated.View>
    );
}

/**
 * Re-rendering the overlay mid-drag makes React Native re-bind the Animated
 * transform, which can flash the overlay at its un-translated position for a
 * frame (visible when e.g. auto-expand re-renders the tree while dragging).
 * Nothing the overlay renders can change mid-drag, so block re-renders unless
 * a prop meaningfully differs - style/customization objects are compared by
 * value because consumers routinely pass fresh (but equal) literals per render.
 */
const overlayPropsAreEqual = <ID,>(
    prev: DragOverlayProps<ID>,
    next: DragOverlayProps<ID>
) =>
    prev.storeId === next.storeId &&
    prev.overlayY === next.overlayY &&
    prev.overlayX === next.overlayX &&
    prev.node === next.node &&
    prev.level === next.level &&
    prev.indentationMultiplier === next.indentationMultiplier &&
    prev.CheckboxComponent === next.CheckboxComponent &&
    prev.ExpandCollapseIconComponent === next.ExpandCollapseIconComponent &&
    prev.CustomNodeRowComponent === next.CustomNodeRowComponent &&
    fastIsEqual(prev.checkBoxViewStyleProps, next.checkBoxViewStyleProps) &&
    fastIsEqual(prev.dragDropCustomizations, next.dragDropCustomizations);

export const DragOverlay = memo(
    _DragOverlay,
    overlayPropsAreEqual
) as typeof _DragOverlay;

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
    },
    nodeRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: "100%",
    },
    expandArrow: {
        flex: 1,
    },
});
