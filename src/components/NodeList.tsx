import {
    FlatList,
    View,
    StyleSheet,

    type TouchableOpacityProps
} from "react-native";
import type {
    __CheckBoxState__,
    CheckboxProps,
    TreeFlatListProps,
    TreeNode
} from "../types/treeView.types";
import { useMemo } from "react";
import React from "react";
import Node from "./Node";

interface Props {
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

export default function NodeList(props: Props) {
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

    const filterTreeData = (_nodes: TreeNode[]): TreeNode[] => {
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
    };

    const filteredNodes = useMemo(() => {
        return searchText ? filterTreeData(nodes) : nodes;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, searchText]);

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


export const styles = StyleSheet.create({
    defaultHeaderFooter: {
        padding: 5
    }
});
