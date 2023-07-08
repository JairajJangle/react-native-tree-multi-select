import React from "react";
import Icon from 'react-native-vector-icons/FontAwesome';

import { ExpandIconProps } from "src/types/treeView.types";

export default function CustomExpandCollapseIcon(props: ExpandIconProps) {
    const { isExpanded } = props;

    return (
        <Icon
            name={
                isExpanded
                    ? 'caret-down'
                    : 'caret-right'
            }
            size={20}
            color="black"
        />
    );
}