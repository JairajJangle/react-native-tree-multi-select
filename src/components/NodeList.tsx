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
    useSignal
} from "@preact/signals-react";
import Icon from 'react-native-vector-icons/FontAwesome';
import { FlashList } from "@shopify/flash-list";

import type {
    TreeFlatListProps,
    TreeNode,

    CheckboxValueType,
    ExpandIconProps,
    CustomCheckBoxViewProps,
} from "../types/treeView.types";

import {
    expanded,
    flattenedFilteredNodes,
    globalData,
    innerMostChildrenIds,
    searchText,
    state
} from "../signals/global.signals";
import {
    handleToggleExpand,
    toggleCheckbox
} from "../helpers";
import { CheckboxProps } from "react-native-paper";
import { CheckboxView } from "./CheckboxView";

interface NodeListProps {
    treeFlashListProps?: TreeFlatListProps;
    customCheckBoxViewProps?: CustomCheckBoxViewProps;

    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

const NodeList = React.memo(_NodeList);
export default NodeList;

function _NodeList(props: NodeListProps) {
    const {
        treeFlashListProps,
        customCheckBoxViewProps,
        ExpandArrowTouchableComponent,
    } = props;

    const filteredTree = computed(() => {
        const searchTrimmed = searchText.value.trim().toLowerCase();

        const filterTreeData = (_nodes: TreeNode[]): TreeNode[] => {
            let filtered: TreeNode[] = [];

            for (let node of _nodes) {
                if (node.name.toLowerCase().includes(searchTrimmed)) {
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

    effect(() => {
        const flattenTreeData = (
            _nodes: TreeNode[],
            level: number = 0,
        ): TreeNode[] => {
            let flattened: TreeNode[] = [];
            for (let node of _nodes) {
                flattened.push({ ...node, level });
                if (node.children && expanded.value.has(node.id)) {
                    flattened = [...flattened, ...flattenTreeData(node.children, level + 1)];
                }
            }
            return flattened;
        };

        flattenedFilteredNodes.value = flattenTreeData(filteredTree.value);
    });

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

    const nodeRenderer = ({ item }: { item: TreeNode; }) => {
        return (
            <Node
                node={item}
                level={item.level || 0}
                customCheckBoxViewProps={customCheckBoxViewProps}
                ExpandArrowTouchableComponent={ExpandArrowTouchableComponent}
            />
        );
    };

    const keyExtractor = (item: TreeNode) => item.id;

    return (
        <FlashList
            estimatedItemSize={36}
            keyboardShouldPersistTaps="handled"
            drawDistance={100}
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
    node: TreeNode;
    level: number;

    customCheckBoxViewProps?: CustomCheckBoxViewProps;

    IconComponent?: React.ComponentType<ExpandIconProps>;
    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

const Node = React.memo(_Node);
function _Node(props: NodeProps) {
    const {
        node: _node,
        level,

        customCheckBoxViewProps,

        ExpandArrowTouchableComponent = TouchableOpacity,

        // TODO:
        // ExpandIconComponent,
    } = props;


    const node = useSignal(_node);
    React.useEffect(() => {
        node.value = _node;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_node]);

    const isChecked = computed(() => {
        return state.value.checked.has(node.value.id);
    });
    const isIndeterminate = computed(() => {
        return state.value.indeterminate.has(node.value.id);
    });
    const value: Signal<CheckboxValueType> = computed(() => {
        if (isIndeterminate.value) {
            return 'indeterminate';
        } else if (isChecked.value) {
            return true;
        } else {
            return false;
        }
    });
    const isExpanded = computed(() => {
        return expanded.value.has(node.value.id);
    });

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(node.value.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const _onCheck = React.useCallback(() => {
        toggleCheckbox(node.value.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={[
            styles.nodeParentView,
            { marginLeft: level * 15, }
        ]}>
            <View style={styles.nodeCheckboxAndArrowRow}>
                <CheckboxView
                    text={node.value.name}
                    onValueChange={_onCheck}
                    value={value.value}
                    {...customCheckBoxViewProps} />

                {node.value.children?.length ? (
                    <ExpandArrowTouchableComponent
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        <Icon
                            name={
                                isExpanded.value
                                    ? 'caret-down'
                                    : 'caret-right'
                            }
                            size={20}
                            color="black"
                        />
                    </ExpandArrowTouchableComponent>
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

