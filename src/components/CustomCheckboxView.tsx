import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
    type StyleProp,
    type ViewStyle,
    type TextProps
} from "react-native";

import { Checkbox } from 'react-native-paper';
import {
    type Props
} from 'react-native-paper/src/components/Checkbox/CheckboxAndroid';

import type { CheckboxValueType } from "../types/treeView.types";

type CheckboxProps = Omit<Props, "onPress" | "status">;

export interface CustomCheckBoxViewProps {
    value: CheckboxValueType;
    onValueChange: (value: boolean) => void;
    text: string;

    // Optional style modifiers
    outermostParentViewStyle?: StyleProp<ViewStyle> | {};
    checkboxParentViewStyle?: StyleProp<ViewStyle> | {};
    textTouchableStyle?: StyleProp<ViewStyle> | {};

    // Optional checkbox and text component props
    checkboxProps?: CheckboxProps;
    textProps?: TextProps;
}

function arePropsEqual(
    prevProps: CustomCheckBoxViewProps,
    nextProps: CustomCheckBoxViewProps
) {
    return (
        prevProps.value === nextProps.value
    );
}

export const CustomCheckboxView = React.memo(_CustomCheckboxView, arePropsEqual);

function _CustomCheckboxView(props: CustomCheckBoxViewProps) {
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
                <TouchableWithoutFeedback
                    style={textTouchableStyle}
                    onPress={onValueChangeModifier}>
                    <Text
                        {...textProps}>
                        {text}
                    </Text>
                </TouchableWithoutFeedback>
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
