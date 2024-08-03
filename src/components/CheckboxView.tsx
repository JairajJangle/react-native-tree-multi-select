import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import { Checkbox } from 'react-native-paper';
import type {
    BuiltInCheckBoxViewProps,
    CheckboxValueType
} from "../types/treeView.types";

function arePropsEqual(
    prevProps: BuiltInCheckBoxViewProps,
    nextProps: BuiltInCheckBoxViewProps
) {
    return (
        prevProps.value === nextProps.value &&
        prevProps.text === nextProps.text
    );
}

export const CheckboxView = React.memo(_CheckboxView, arePropsEqual);

function _CheckboxView(props: BuiltInCheckBoxViewProps) {
    const {
        value,
        onValueChange,
        text,

        outermostParentViewStyle = defaultCheckboxViewStyles.mainView,
        checkboxParentViewStyle = defaultCheckboxViewStyles.checkboxView,
        textTouchableStyle,

        checkboxProps,
        textProps = {
            style: defaultCheckboxViewStyles.checkboxTextStyle,
            numberOfLines: 1,
            ellipsizeMode: "middle",
        },
    } = props;

    const customCheckboxValueTypeToRNPaperType = React.useCallback((
        customCheckboxValueType: CheckboxValueType
    ) => {
        return customCheckboxValueType === 'indeterminate'
            ? 'indeterminate'
            : customCheckboxValueType
                ? 'checked'
                : 'unchecked';
    }, []);

    /**
     * This function modifies the change in value when the previous state was indeterminate.
     * If the prior value is 'indeterminate', it will mark the CheckBox as checked upon click.
     *
     * @param newValue This represents the updated CheckBox value after it's clicked.
     */
    const onValueChangeModifier = React.useCallback(() => {
        // If the previous state was 'indeterminate', set checked to true
        if (value === 'indeterminate') onValueChange(true);
        else onValueChange(!value);
    }, [onValueChange, value]);

    return (
        <View
            style={outermostParentViewStyle}>
            <View
                style={checkboxParentViewStyle}>
                <Checkbox.Android
                    {...checkboxProps}
                    status={customCheckboxValueTypeToRNPaperType(value)}
                    onPress={onValueChangeModifier} />
            </View>

            {text ? (
                <TouchableOpacity
                    style={textTouchableStyle}
                    onPress={onValueChangeModifier}>
                    <Text
                        {...textProps}>
                        {text}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

export const defaultCheckboxViewStyles = StyleSheet.create({
    mainView: {
        alignSelf: 'center',
        alignItems: 'center',
        flexDirection: 'row',

        marginEnd: 10
    },
    checkboxView: {
        marginStart: 5,
        transform: [{ scale: 1.2 }]
    },
    checkboxTextStyle: {
        color: "black",
        marginTop: Platform.OS === 'android' ? 2 : undefined,
    },
});
