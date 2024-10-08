import React from "react";
import {
    View,
    StyleSheet,

    TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import type {
    CheckboxValueType,
    __FlattenedTreeNode__,
    NodeListProps,
    NodeProps,
} from "../types/treeView.types";

import { useTreeViewStore } from "../store/treeView.store";
import {
    getFilteredTreeData,
    getFlattenedTreeData,
    getInnerMostChildrenIdsInTree,
    handleToggleExpand,
    toggleCheckboxes
} from "../helpers";
import { CheckboxView } from "./CheckboxView";
import { CustomExpandCollapseIcon } from "./CustomExpandCollapseIcon";
import { defaultIndentationMultiplier } from "../constants/treeView.constants";
import { useShallow } from 'zustand/react/shallow';

const NodeList = React.memo(_NodeList);
export default NodeList;

function _NodeList(props: NodeListProps) {
    const {
        treeFlashListProps,
        checkBoxViewStyleProps,
        indentationMultiplier,

        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
        CustomNodeRowComponent
    } = props;

    const {
        expanded,
        initialTreeViewData,
        updateInnerMostChildrenIds,
        searchKeys,
        searchText
    } = useTreeViewStore(useShallow(
        state => ({
            expanded: state.expanded,
            initialTreeViewData: state.initialTreeViewData,
            updateInnerMostChildrenIds: state.updateInnerMostChildrenIds,
            searchKeys: state.searchKeys,
            searchText: state.searchText,
        })
    ));

    // First we filter the tree as per the search term and keys
    const filteredTree = React.useMemo(() => getFilteredTreeData(
        initialTreeViewData,
        searchText.trim().toLowerCase(),
        searchKeys
    ), [initialTreeViewData, searchText, searchKeys]);

    // Then we flatten the tree to make it "render-compatible" in a "flat" list
    const flattenedFilteredNodes = React.useMemo(() => getFlattenedTreeData(
        filteredTree,
        expanded,
    ), [filteredTree, expanded]);

    // And update the innermost children id -> required to un/select filtered tree
    React.useEffect(() => {
        const updatedInnerMostChildrenIds = getInnerMostChildrenIdsInTree(
            filteredTree
        );
        updateInnerMostChildrenIds(updatedInnerMostChildrenIds);
    }, [filteredTree, updateInnerMostChildrenIds]);

    const nodeRenderer = React.useCallback((
        { item }: { item: __FlattenedTreeNode__; }
    ) => {
        return (
            <Node
                node={item}
                level={item.level || 0}

                checkBoxViewStyleProps={checkBoxViewStyleProps}
                indentationMultiplier={indentationMultiplier}

                CheckboxComponent={CheckboxComponent}
                ExpandCollapseIconComponent={ExpandCollapseIconComponent}
                ExpandCollapseTouchableComponent={ExpandCollapseTouchableComponent}
                CustomNodeRowComponent={CustomNodeRowComponent}
            />
        );
    }, [
        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
        CustomNodeRowComponent,
        checkBoxViewStyleProps,
        indentationMultiplier
    ]);

    return (
        <FlashList
            estimatedItemSize={36}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            drawDistance={50}
            data={flattenedFilteredNodes}
            renderItem={nodeRenderer}
            ListHeaderComponent={<HeaderFooterView />}
            ListFooterComponent={<HeaderFooterView />}
            {...treeFlashListProps}
        />
    );
};

function HeaderFooterView() {
    return (
        <View style={styles.defaultHeaderFooter} />
    );
}

function getValue(
    isChecked: boolean,
    isIndeterminate: boolean
): CheckboxValueType {
    if (isIndeterminate) {
        return 'indeterminate';
    } else if (isChecked) {
        return true;
    } else {
        return false;
    }
}

const Node = React.memo(_Node);
function _Node(props: NodeProps) {
    const {
        node,
        level,

        checkBoxViewStyleProps,
        indentationMultiplier = defaultIndentationMultiplier,

        ExpandCollapseIconComponent = CustomExpandCollapseIcon,
        CheckboxComponent = CheckboxView,
        ExpandCollapseTouchableComponent = TouchableOpacity,
        CustomNodeRowComponent
    } = props;

    const {
        isExpanded,
        value,
    } = useTreeViewStore(useShallow(
        state => ({
            isExpanded: state.expanded.has(node.id),
            value: getValue(
                state.checked.has(node.id), // isChecked
                state.indeterminate.has(node.id) // isIndeterminate
            ),
        })
    ));

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(node.id);
    }, [node.id]);

    const _onCheck = React.useCallback(() => {
        toggleCheckboxes([node.id]);
    }, [node.id]);

    if (!CustomNodeRowComponent) {
        return (
            <View style={[
                styles.nodeCheckboxAndArrowRow,
                { paddingStart: level * indentationMultiplier }
            ]}>
                <CheckboxComponent
                    text={node.name}
                    onValueChange={_onCheck}
                    value={value}
                    {...checkBoxViewStyleProps} />

                {node.children?.length ? (
                    <ExpandCollapseTouchableComponent
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        <ExpandCollapseIconComponent
                            isExpanded={isExpanded}
                        />
                    </ExpandCollapseTouchableComponent>
                ) : null}
            </View>
        );
    }
    else {
        return (
            <CustomNodeRowComponent
                node={node}
                level={level}
                checkedValue={value}
                isExpanded={isExpanded}
                onCheck={_onCheck}
                onExpand={_onToggleExpand} />
        );
    }
};

const styles = StyleSheet.create({
    defaultHeaderFooter: {
        padding: 5
    },
    nodeExpandableArrowTouchable: {
        flex: 1
    },
    nodeCheckboxAndArrowRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: "100%"
    }
});

