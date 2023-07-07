import React from "react";
import {
    View,
    StyleSheet,

    TouchableOpacity,
    type TouchableOpacityProps,
} from "react-native";
import { computed, Signal, useSignal } from "@preact/signals-react";
import Icon from 'react-native-vector-icons/FontAwesome';
import { FlashList } from "@shopify/flash-list";

import type {
    CheckboxProps,
    TreeFlatListProps,
    TreeNode,

    CheckboxValueType,
    ExpandIconProps,
} from "../types/treeView.types";

import { CustomCheckboxView } from "./CustomCheckboxView";
import { expanded, globalData, searchText, state } from "../signals/global.signals";
import { handleToggleExpand, toggleCheckbox } from "../hooks/useCheckboxState";

interface NodeListProps {
    treeFlatListProps?: TreeFlatListProps;

    CheckboxComponent?: React.ComponentType<CheckboxProps>;
    ExpandArrowTouchableComponent?: React.ComponentType<TouchableOpacityProps>;
}

export default function NodeList(props: NodeListProps) {
    const {
        treeFlatListProps,

        CheckboxComponent,
        ExpandArrowTouchableComponent,
    } = props;

    const flattenedNodes = computed(() => {
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

        return flattenTreeData(globalData.value);
    });

    const filteredNodes = computed(() => {
        if (searchText.value.trim() === "") {
            return flattenedNodes.value;
        } else {
            return flattenedNodes.value.filter(node => {
                return node.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
                    (node.children && node.children.some(child => child.name.toLowerCase().includes(searchText.value.toLowerCase())));
            });
        }
    });

    const nodeRenderer = ({ item }: { item: TreeNode; }) => {
        return (
            <Node
                node={item}
                level={item.level || 0}
                CheckboxComponent={CheckboxComponent}
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
            data={filteredNodes.value}
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
}

function Node(props: NodeProps) {
    const {
        node: _node,
        level,
        CheckboxComponent = CustomCheckboxView,
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
                <CheckboxComponent
                    text={node.value.name}
                    onValueChange={_onCheck}
                    value={value.value} />

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

