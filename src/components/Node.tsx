import React from "react";
import {
    View,
    TouchableOpacity,
    type TouchableOpacityProps,
    StyleSheet
} from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';

import type {
    __CheckBoxState__,
    CheckboxProps,
    CheckboxValueType,
    ExpandIconProps,
    TreeNode
} from "../types/treeView.types";

import NodeList from "./NodeList";
import { CustomCheckboxView } from "./CustomCheckboxView";

interface Props {
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

export default function Node(props: Props) {
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

    return (
        <View style={[
            styles.parentView,
            { marginLeft: level && 15, }
        ]}>
            <View style={styles.checkboxAndArrowRow}>
                <CustomCheckboxView
                    text={node.name}
                    onValueChange={() => onCheck(node.id)}
                    value={value} />

                {node.children?.length ? (
                    <ExpandArrowTouchableComponent
                        style={styles.expandableArrowTouchable}
                        onPress={() => onToggleExpand(node.id)}>
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
    parentView: {
        flex: 1
    },
    expandableArrowTouchable: {
        flex: 1
    },
    checkboxAndArrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: "100%",
    }
});
