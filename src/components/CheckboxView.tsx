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
    CheckboxValueType,
    CustomCheckBoxViewProps
} from "../types/treeView.types";

export interface CheckBoxViewProps extends CustomCheckBoxViewProps {
    value: CheckboxValueType;
    onValueChange: (value: boolean) => void;
    text: string;
}

function arePropsEqual(
    prevProps: CheckBoxViewProps,
    nextProps: CheckBoxViewProps
) {
    return (
        prevProps.value === nextProps.value &&
        prevProps.text === nextProps.text
    );
}

export const CheckboxView = React.memo(_CheckboxView, arePropsEqual);

function _CheckboxView(props: CheckBoxViewProps) {
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

    function customCheckboxValueTypeToRNPaperType(
        customCheckboxValueType: CheckboxValueType
    ) {
        return customCheckboxValueType === 'indeterminate'
            ? 'indeterminate'
            : customCheckboxValueType
                ? 'checked'
                : 'unchecked';
    }

    /**
     * This function modifies the change in value when the previous state was indeterminate.
     * If the prior value is 'indeterminate', it will mark the CheckBox as checked upon click.
     *
     * @param newValue This represents the updated CheckBox value after it's clicked.
     */
    function onValueChangeModifier() {
        // If the previous state was 'indeterminate', set checked to true
        if (value === 'indeterminate') onValueChange(true);
        else onValueChange(!value);
    }

    return (
        <View
            style={outermostParentViewStyle}>
            <View
                style={checkboxParentViewStyle}>
                <Checkbox.Android
                    theme={{
                        animation: {
                            scale: 0
                        }
                    }}
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
