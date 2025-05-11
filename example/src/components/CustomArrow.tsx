import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";

import { type ExpandIconProps } from "react-native-tree-multi-select";

export const CustomArrow = memo(_CustomArrow);

function _CustomArrow(props: ExpandIconProps) {
    const { isExpanded } = props;

    return (
        <View
            style={styles.mainView}>
            <View
                style={[
                    styles.innerView,
                    isExpanded
                        ? styles.innerViewExpanded
                        : styles.innerViewCollapsed
                ]}>
                <Icon
                    name={
                        isExpanded
                            ? "arrow-collapse-vertical"
                            : "arrow-expand-vertical"
                    }
                    size={25}
                    color={isExpanded ? "black" : "white"}
                />
                <Text
                    style={[styles.text,
                    isExpanded
                        ? styles.textExpanded
                        : styles.textCollapsed
                    ]}>
                    {isExpanded ? "Collapse" : "Expand"}
                </Text>
            </View>
        </View>
    );
}

export const styles = StyleSheet.create({
    mainView: {
        flexDirection: "row",
        marginVertical: 5
    },
    innerView: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 10,
        padding: 2,
    },
    innerViewExpanded: {
        backgroundColor: "white"
    },
    innerViewCollapsed: {
        backgroundColor: "black"
    },
    text: {
        fontSize: 10,
    },
    textExpanded: {
        color: "black",
    },
    textCollapsed: {
        color: "white",
    }
});