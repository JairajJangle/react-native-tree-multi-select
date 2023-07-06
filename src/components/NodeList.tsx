import React, { useMemo } from "react";
import {
    FlatList,
    View,
    StyleSheet,

    TouchableOpacity,
    type TouchableOpacityProps
} from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';

import type {
    __CheckBoxState__,
    CheckboxProps,
    TreeFlatListProps,
    TreeNode,

    CheckboxValueType,
    ExpandIconProps,
} from "../types/treeView.types";

import { CustomCheckboxView } from "./CustomCheckboxView";

interface NodeListProps {
    nodes: TreeNode[];
    level: number;

    state: __CheckBoxState__;
    onCheck: (id: string) => void;

    expanded: Set<string>;
    onToggleExpand: (id: string) => void;

    searchText: string;

    treeFlatListProps?: TreeFlatListProps;

    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

export default function NodeList(props: NodeListProps) {
    const {
        nodes,
        level,

        state,
        onCheck,

        expanded,
        onToggleExpand,

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

    return (
        <FlatList
            keyboardShouldPersistTaps="handled"
            data={filteredNodes}
            renderItem={({ item }) => (
                <Node
                    node={item}
                    level={level}
                    state={state}
                    onCheck={onCheck}
                    expanded={expanded}
                    onToggleExpand={onToggleExpand}
                    CheckboxComponent={CheckboxComponent}
                    ExpandArrowTouchableComponent={ExpandArrowTouchableComponent}
                    searchText={searchText}
                />
            )}
            keyExtractor={(item) => item.id}
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

    state: __CheckBoxState__;
    onCheck: (id: string) => void;

    expanded: Set<string>;
    onToggleExpand: (id: string) => void;

    IconComponent?: React.ComponentType<ExpandIconProps>;
    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;

    searchText: string;
}

function Node(props: NodeProps) {
    const {
        node,
        level,
        state,
        onCheck,
        expanded,
        onToggleExpand,
        CheckboxComponent = CustomCheckboxView,
        ExpandArrowTouchableComponent = TouchableOpacity,
        searchText,

        // TODO:
        // ExpandIconComponent,
    } = props;

    const isChecked = state.checked.has(node.id);
    const isIndeterminate = state.indeterminate.has(node.id);
    const isExpanded = expanded.has(node.id);

    let value: CheckboxValueType;
    if (isIndeterminate) {
        value = 'indeterminate';
    } else if (isChecked) {
        value = true;
    } else {
        value = false;
    }

    const _onToggleExpand = React.useCallback(() => {
        onToggleExpand(node.id);
    }, [node.id, onToggleExpand]);

    const _onCheck = React.useCallback(() => {
        onCheck(node.id);
    }, [node.id, onCheck]);

    return (
        <View style={[
            styles.nodeParentView,
            { marginLeft: level && 15, }
        ]}>
            <View style={styles.nodeCheckboxAndArrowRow}>
                <CheckboxComponent
                    text={node.name}
                    onValueChange={_onCheck}
                    value={value} />

                {node.children?.length ? (
                    <ExpandArrowTouchableComponent
                        style={styles.nodeExpandableArrowTouchable}
                        onPress={_onToggleExpand}>
                        {/* <IconComponent isExpanded={isExpanded} /> */}
                        <Icon
                            name={
                                isExpanded
                                    ? 'caret-down'
                                    : 'caret-right'
                            }
                            size={20}
                            color="black"
                        />
                    </ExpandArrowTouchableComponent>
                ) : null}
            </View>
            {isExpanded && node.children && (
                <NodeList
                    nodes={node.children}
                    level={level + 1}
                    state={state}
                    onCheck={onCheck}
                    expanded={expanded}
                    onToggleExpand={onToggleExpand}
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

