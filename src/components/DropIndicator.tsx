import React from "react";
import { Animated, View, StyleSheet } from "react-native";
import type { DropPosition } from "../types/dragDrop.types";

interface DropIndicatorProps {
    position: DropPosition;
    overlayY: Animated.Value;
    itemHeight: number;
    targetLevel: number;
    indentationMultiplier: number;
}

export const DropIndicator = React.memo(function DropIndicator(
    props: DropIndicatorProps
) {
    const {
        position,
        overlayY,
        itemHeight,
        targetLevel,
        indentationMultiplier,
    } = props;

    const indent = targetLevel * indentationMultiplier;

    if (position === "inside") {
        return (
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.highlightIndicator,
                    {
                        transform: [{ translateY: overlayY }],
                        height: itemHeight,
                        left: indent,
                    },
                ]}
            />
        );
    }

    // For "above", the line is at the overlay's top edge (offset 0)
    // For "below", the line is at the overlay's bottom edge (offset +itemHeight)
    const lineOffset = position === "above" ? 0 : itemHeight;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.lineContainer,
                {
                    transform: [{ translateY: Animated.add(overlayY, lineOffset - 1) }],
                    left: indent,
                },
            ]}
        >
            <View style={styles.lineCircle} />
            <View style={styles.line} />
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    highlightIndicator: {
        position: "absolute",
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 200, 0, 0.2)",
        borderWidth: 2,
        borderColor: "rgba(0, 200, 0, 0.6)",
        borderRadius: 4,
        zIndex: 9998,
    },
    lineContainer: {
        position: "absolute",
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        height: 3,
        zIndex: 9998,
    },
    lineCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#00CC00",
        marginLeft: -5,
        marginTop: -4,
    },
    line: {
        flex: 1,
        height: 3,
        backgroundColor: "#00CC00",
    },
});
