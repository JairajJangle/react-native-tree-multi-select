import React, { useMemo } from "react";
import {
    FlatList,
    View,
    StyleSheet,

    TouchableOpacity,
    type TouchableOpacityProps,
} from "react-native";
import { computed, Signal } from "@preact/signals-react";
import Icon from 'react-native-vector-icons/FontAwesome';

import type {
    CheckboxProps,
    TreeFlatListProps,
    TreeNode,

    CheckboxValueType,
    ExpandIconProps,
} from "../types/treeView.types";

import { CustomCheckboxView } from "./CustomCheckboxView";
import { expanded, state } from "../signals/global.signals";
import { handleToggleExpand, toggleCheckbox } from "../hooks/useCheckboxState";

interface NodeListProps {
    nodes: TreeNode[];
    level: number;

    searchText: string;

    treeFlatListProps?: TreeFlatListProps;

    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

export default function NodeList(props: NodeListProps) {
    const {
        nodes,
        level,

        searchText,

        treeFlatListProps,

        CheckboxComponent,
        ExpandArrowTouchableComponent,
    } = props;

    const filterTreeData = React.useCallback((_nodes: TreeNode[]): TreeNode[] => {
        return _nodes.reduce<TreeNode[]>((filtered, node) => {
            if (node.name.toLowerCase().includes(searchText.toLowerCase())) {
                filtered.push({ ...node }); // copy node
            } else if (node.children) {
                const children = filterTreeData(node.children);
                if (children.length > 0) {
                    filtered.push({ ...node, children }); // copy node and replace children
                }
            }
            return filtered;
        }, []);
    }, [searchText]);

    const filteredNodes = useMemo(() => {
        return searchText ? filterTreeData(nodes) : nodes;
    }, [filterTreeData, nodes, searchText]);

    const nodeRenderer = ({ item }: { item: TreeNode; }) => {
        return (
            <Node
                node={item}
                level={level}
                CheckboxComponent={CheckboxComponent}
                ExpandArrowTouchableComponent={ExpandArrowTouchableComponent}
                searchText={searchText}
            />
        );
    };

    const keyExtractor = (item: TreeNode) => item.id;

    return (
        <FlatList
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            data={filteredNodes}
            renderItem={nodeRenderer}
            keyExtractor={keyExtractor}
            ListHeaderComponent={<HeaderFooterView />}
            ListFooterComponent={<HeaderFooterView />}
            {...treeFlatListProps}
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

    IconComponent?: React.ComponentType<ExpandIconProps>;
    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;

    searchText: string;
}

function Node(props: NodeProps) {
    const {
        node,
        level,
        CheckboxComponent = CustomCheckboxView,
        ExpandArrowTouchableComponent = TouchableOpacity,
        searchText,

        // TODO:
        // ExpandIconComponent,
    } = props;

    const isChecked = computed(() => {
        return state.value.checked.has(node.id);
    });
    const isIndeterminate = computed(() => {
        return state.value.indeterminate.has(node.id);
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
        return expanded.value.has(node.id);
    });

    const _onToggleExpand = React.useCallback(() => {
        handleToggleExpand(node.id);
    }, [node.id]);

    const _onCheck = React.useCallback(() => {
        toggleCheckbox(node.id);
    }, [node.id]);

    return (
        <View style={[
            styles.nodeParentView,
            { marginLeft: level && 15, }
        ]}>
            <View style={styles.nodeCheckboxAndArrowRow}>
                <CheckboxComponent
                    text={node.name}
                    onValueChange={_onCheck}
                    value={value.value} />

                {node.children?.length ? (
                    <ExpandArrowTouchableComponent
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        {/* <IconComponent isExpanded={isExpanded} /> */}
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
            {isExpanded.value && node.children && (
                <NodeList
                    nodes={node.children}
                    level={level + 1}
                    CheckboxComponent={CheckboxComponent}
                    ExpandArrowTouchableComponent={ExpandArrowTouchableComponent}
                    searchText={searchText}
                />
            )}
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

