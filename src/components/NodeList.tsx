import React from "react";
import {
    View,
    StyleSheet,

    TouchableOpacity,
    type TouchableOpacityProps,
} from "react-native";
import {
    computed,
    effect,
    Signal,
    useComputed,
    useSignal
} from "@preact/signals-react";
import { FlashList } from "@shopify/flash-list";

import type {
    TreeFlatListProps,
    TreeNode,

    CheckboxValueType,
    ExpandIconProps,
    CheckBoxViewStyleProps,
    CheckBoxViewProps,
    __FlattenedTreeNode__,
} from "../types/treeView.types";

import {
    expanded,
    globalData,
    innerMostChildrenIds,
    searchKeys,
    searchText,
    state
} from "../signals/global.signals";
import {
    doesNodeContainSearchTerm,
    handleToggleExpand,
    toggleCheckboxes
} from "../helpers";
import { CheckboxView } from "./CheckboxView";
import CustomExpandCollapseIcon from "./CustomExpandCollapseIcon";

interface NodeListProps {
    treeFlashListProps?: TreeFlatListProps;
    checkBoxViewStyleProps?: CheckBoxViewStyleProps;

    CheckboxComponent?: React.ComponentType<CheckBoxViewProps>;
    ExpandCollapseIconComponent?: React.ComponentType<ExpandIconProps>;
    ExpandCollapseTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

const NodeList = React.memo(_NodeList);
export default NodeList;

function _NodeList(props: NodeListProps) {
    const {
        treeFlashListProps,
        checkBoxViewStyleProps,

        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
    } = props;

    const filteredTree = React.useMemo(() => {
        return computed(() => {
            const searchTrimmed = searchText.value.trim().toLowerCase();

            const filterTreeData = (_nodes: TreeNode[]): TreeNode[] => {
                let filtered: TreeNode[] = [];

                for (let node of _nodes) {
                    if (!searchTrimmed || doesNodeContainSearchTerm(node, searchTrimmed, searchKeys.value)) {
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

            return filterTreeData(globalData.value);
        });
    }, []);

    const flattenedFilteredNodes = React.useMemo(() => {
        return computed(() => {
            const flattenTreeData = (
                _nodes: TreeNode[],
                level: number = 0,
            ): __FlattenedTreeNode__[] => {
                let flattened: __FlattenedTreeNode__[] = [];
                for (let node of _nodes) {
                    flattened.push({ ...node, level });
                    if (node.children && expanded.value.has(node.id)) {
                        flattened = [...flattened, ...flattenTreeData(node.children, level + 1)];
                    }
                }
                return flattened;
            };

            return flattenTreeData(filteredTree.value);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        effect(() => {
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

            getLeafNodes(filteredTree.value);

            innerMostChildrenIds.value = allLeafIds;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const nodeRenderer = React.useCallback((
        { item }: { item: __FlattenedTreeNode__; }
    ) => {
        return (
            <Node
                node={item}
                level={item.level || 0}
                checkBoxViewStyleProps={checkBoxViewStyleProps}

                CheckboxComponent={CheckboxComponent}
                ExpandCollapseIconComponent={ExpandCollapseIconComponent}
                ExpandCollapseTouchableComponent={ExpandCollapseTouchableComponent}
            />
        );
    }, [
        CheckboxComponent,
        ExpandCollapseIconComponent,
        ExpandCollapseTouchableComponent,
        checkBoxViewStyleProps
    ]);

    const keyExtractor = React.useCallback((item: TreeNode) => item.id, []);

    return (
        <FlashList
            estimatedItemSize={36}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            drawDistance={50}
            data={flattenedFilteredNodes.value}
            renderItem={nodeRenderer}
            keyExtractor={keyExtractor}
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

interface NodeProps {
    node: __FlattenedTreeNode__;
    level: number;

    checkBoxViewStyleProps?: CheckBoxViewStyleProps;

    ExpandCollapseIconComponent?: React.ComponentType<ExpandIconProps>;
    CheckboxComponent?: React.ComponentType<CheckBoxViewProps>;
    ExpandCollapseTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

const Node = React.memo(_Node);
function _Node(props: NodeProps) {
    const {
        node: _node,
        level,

        checkBoxViewStyleProps,

        ExpandCollapseIconComponent = CustomExpandCollapseIcon,
        CheckboxComponent = CheckboxView,
        ExpandCollapseTouchableComponent = TouchableOpacity,
    } = props;

    const node = useSignal(_node);
    React.useEffect(() => {
        node.value = _node;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_node]);

    const isChecked = useComputed(() => state.value.checked.has(node.value.id));
    const isIndeterminate = useComputed(() => state.value.indeterminate.has(
        node.value.id
    ));
    const value: Signal<CheckboxValueType> = useComputed(() => {
        if (isIndeterminate.value) {
            return 'indeterminate';
        } else if (isChecked.value) {
            return true;
        } else {
            return false;
        }
    });
    const isExpanded = useComputed(() => expanded.value.has(node.value.id));

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(node.value.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const _onCheck = React.useCallback(() => {
        toggleCheckboxes([node.value.id]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={[
            styles.nodeParentView,
            { marginLeft: level * 15, }
        ]}>
            <View style={styles.nodeCheckboxAndArrowRow}>
                <CheckboxComponent
                    text={node.value.name}
                    onValueChange={_onCheck}
                    value={value.value}
                    {...checkBoxViewStyleProps} />

                {node.value.children?.length ? (
                    <ExpandCollapseTouchableComponent
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        <ExpandCollapseIconComponent
                            isExpanded={isExpanded.value}
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

