import React from "react";
import { type ExpandIconProps } from "../types/treeView.types";

// Function to dynamically load FontAwesomeIcon from either Expo or React Native
function loadFontAwesomeIcon() {
    try {
        return require("@expo/vector-icons/FontAwesome").default;
    } catch (e) {
        try {
            return require("react-native-vector-icons/FontAwesome").default;
        } catch (error) {
            console.error(
                "No FontAwesome icon library found. Please install either @expo/vector-icons or react-native-vector-icons"
            );
            return null;
        }
    }
}

// Load the FontAwesomeIcon component
const FontAwesomeIcon = loadFontAwesomeIcon();

export const CustomExpandCollapseIcon = React.memo(
    _CustomExpandCollapseIcon
);

function _CustomExpandCollapseIcon(props: ExpandIconProps) {
    const { isExpanded } = props;

    // If FontAwesomeIcon is not available, render a fallback or null
    if (!FontAwesomeIcon) {
        console.warn("FontAwesomeIcon is not available");
        return null;
    }

    return (
        <FontAwesomeIcon
            name={
                isExpanded
                    ? "caret-down"
                    : "caret-right"
            }
            size={20}
            color="black"
        />
    );
}