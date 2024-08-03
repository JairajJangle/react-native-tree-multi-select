import React from "react";
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import { ExpandIconProps } from "src/types/treeView.types";

export const CustomExpandCollapseIcon = React.memo(
    _CustomExpandCollapseIcon
);

function _CustomExpandCollapseIcon(props: ExpandIconProps) {
    const { isExpanded } = props;

    return (
        <FontAwesomeIcon
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