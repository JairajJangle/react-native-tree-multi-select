import { memo } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { type NodeRowProps } from "react-native-tree-multi-select";
import Icon from "react-native-vector-icons/FontAwesome";

export const CustomNodeRowView = memo(_CustomNodeRowView) as typeof _CustomNodeRowView;

const VerticalLine = () => (
    <View style={styles.verticalLineStyle} />
);

const Levels = ({
    levels
}: {
    levels: number;
}) => {
    return (
        <View style={styles.levelsStyle}>
            {
                Array(levels).fill(null).map((_, i) => <VerticalLine key={i} />)
            }
        </View>
    );
};

function _CustomNodeRowView<ID = string>(props: NodeRowProps<ID>) {
    const { node, level, checkedValue, isExpanded, onCheck, onExpand } = props;

    const backgroundColor =
        checkedValue === true
            ? "black"
            : checkedValue === "indeterminate"
                ? "lightgrey"
                : "white";
    const color =
        checkedValue === true ? "white" : "black";
    const iconColor =
        checkedValue === true
            ? isExpanded ? "white" : "#9a9a9a"
            : isExpanded ? "black" : "#a1a1a1";



    return (
        <View style={[styles.rowView, { backgroundColor }]}>
            <View style={styles.innerRowView}>
                <Levels levels={level} />

                <TouchableOpacity style={styles.touchableOpacity} onPress={onCheck}>
                    <View style={
                        level === 0
                            ? styles.textViewMarginNegative
                            : styles.textView
                    }>
                        <Text style={{ color }}>{node.name}</Text>
                    </View>
                </TouchableOpacity>

                {
                    node.children?.length ? (
                        <TouchableOpacity
                            style={styles.iconTouchableView}
                            onPress={onExpand}>
                            <Icon
                                name={
                                    isExpanded
                                        ? "angle-double-up"
                                        : "angle-double-down"
                                }
                                size={25}
                                color={iconColor}
                            />
                        </TouchableOpacity>
                    ) : null
                }

            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    verticalLineStyle: {
        borderLeftWidth: 1,
        height: "110%",
        marginStart: 25,
        borderColor: "grey",
    },
    levelsStyle: {
        flexDirection: "row",
        marginEnd: 10
    },
    rowView: {
        marginHorizontal: 10,
        paddingEnd: 10,
        marginVertical: 0.5,
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderColor: "lightgrey",
        borderTopWidth: 1,
        borderTopColor: "#dedede"
    },
    innerRowView: {
        flexDirection: "row",
    },
    touchableOpacity: {
        padding: 4,
        paddingVertical: 8,
    },
    textView: {
        flexDirection: "row"
    },
    textViewMarginNegative: {
        flexDirection: "row",
        marginStart: -5
    },
    iconTouchableView: {
        flex: 1,
        alignItems: "flex-end",
        justifyContent: "center",
    }
});
