import React from "react";
import {
    View,
    StyleSheet,

    TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import type {
    TreeNode,

    CheckboxValueType,
    __FlattenedTreeNode__,
    NodeListProps,
    NodeProps,
} from "../types/treeView.types";

import { useTreeViewStore } from "../store/treeView.store";
import {
    doesNodeContainSearchTerm,
    handleToggleExpand,
    toggleCheckboxes
} from "../helpers";
import { CheckboxView } from "./CheckboxView";
import CustomExpandCollapseIcon from "./CustomExpandCollapseIcon";
import { defaultIndentationMultiplier } from "../constants/treeView.constants";

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
    } = props;

    const {
        expanded,
        initialTreeViewData,
        updatedInnerMostChildrenIds,
        searchKeys,
        searchText
    } = useTreeViewStore();

    const [filteredTree, setFilteredTree] = React.useState<TreeNode[]>([]);
    const [flattenedFilteredNodes, setFlattenedFilteredNodes]
        = React.useState<__FlattenedTreeNode__[]>([]);

    React.useEffect(() => {
        const searchTrimmed = searchText.trim().toLowerCase();

        const filterTreeData = (_nodes: TreeNode[]): TreeNode[] => {
            let filtered: TreeNode[] = [];

            for (let node of _nodes) {
                if (!searchTrimmed || doesNodeContainSearchTerm(node, searchTrimmed, searchKeys)) {
                    // If node itself matches, include it and all its descendants
                    filtered.push(node);
                } else if (node.children) {
                    // If node does not match, check its children and include them if they match
                    const childMatches = filterTreeData(node.children);
                    if (childMatches.length > 0) {
                        // If any children match, include the node, replacing its children with the matching ones
                        filtered.push({ ...node, children: childMatches });
                    }
                }
            }

            return filtered;
        };

        const tempFilterTree = filterTreeData(initialTreeViewData);
        setFilteredTree(tempFilterTree);
    }, [searchText, searchKeys, initialTreeViewData]);

    React.useEffect(() => {
        const flattenTreeData = (
            _nodes: TreeNode[],
            level: number = 0,
        ): __FlattenedTreeNode__[] => {
            let flattened: __FlattenedTreeNode__[] = [];
            for (let node of _nodes) {
                flattened.push({ ...node, level });
                if (node.children && expanded.has(node.id)) {
                    flattened = [...flattened, ...flattenTreeData(node.children, level + 1)];
                }
            }
            return flattened;
        };

        const tempFlattenTreeData = flattenTreeData(filteredTree);
        setFlattenedFilteredNodes(tempFlattenTreeData);
    }, [filteredTree, expanded]);

    React.useEffect(() => {
        const allLeafIds: string[] = [];
        const getLeafNodes = (_nodes: TreeNode[]) => {
            for (let node of _nodes) {
                if (node.children) {
                    getLeafNodes(node.children);
                } else {
                    allLeafIds.push(node.id);
                }
            }
        };

        getLeafNodes(filteredTree);

        updatedInnerMostChildrenIds(allLeafIds);
    }, [filteredTree, updatedInnerMostChildrenIds]);

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
            />
        );
    }, [
        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
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
    } = props;

    const { expanded, checked, indeterminate } = useTreeViewStore();

    const isChecked = checked.has(node.id);
    const isIndeterminate = indeterminate.has(node.id);
    const isExpanded = expanded.has(node.id);

    const [value, setValue] = React.useState(getValue(isChecked, isIndeterminate));

    React.useEffect(() => {
        setValue(getValue(isChecked, isIndeterminate));
    }, [isChecked, isIndeterminate]);

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(node.id);
    }, [node.id]);

    const _onCheck = React.useCallback(() => {
        toggleCheckboxes([node.id]);
    }, [node.id]);

    return (
        <View style={[
            styles.nodeParentView,
            { marginStart: level * indentationMultiplier, }
        ]}>
            <View style={styles.nodeCheckboxAndArrowRow}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    defaultHeaderFooter: {
        padding: 5
    },
    nodeParentView: {
        flex: 1
    },
    nodeExpandableArrowTouchable: {
        flex: 1
    },
    nodeCheckboxAndArrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: "100%",
    }
});

