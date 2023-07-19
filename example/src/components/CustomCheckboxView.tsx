import React, { useCallback } from "react";
import {
    ColorValue,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import {
    CheckBoxViewProps,
} from "react-native-tree-multi-select";

function arePropsEqual(
    prevProps: CheckBoxViewProps,
    nextProps: CheckBoxViewProps
) {
    return (
        prevProps.value === nextProps.value &&
        prevProps.text === nextProps.text
    );
}

export const CustomCheckboxView = React.memo(_CustomCheckboxView, arePropsEqual);

function _CustomCheckboxView(props: CheckBoxViewProps) {
    const {
        value,
        onValueChange,
        text,
    } = props;

    const getCheckboxColor: () => ColorValue = useCallback(() => {
        return (
            value === "indeterminate"
                ? "yellow"
                : value
                    ? "green"
                    : "red"
        );
    }, [value]);

    const getCheckboxText = useCallback(() => {
        return (
            value === "indeterminate"
                ? "😐"
                : value
                    ? "😃"
                    : "😶"
        );
    }, [value]);

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
            style={styles.mainView}>

            <TouchableOpacity
                style={[styles.checkboxTouchable,
                {
                    borderColor: getCheckboxColor()
                }]}
                onPress={onValueChangeModifier}>
                <Text
                    style={styles.checkboxView}>
                    {getCheckboxText()}
                </Text>
            </TouchableOpacity>

            {text ? (
                <TouchableOpacity
                    onPress={onValueChangeModifier}>
                    <Text
                        style={styles.checkboxTextStyle}
                        numberOfLines={1}>
                        {text}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

export const styles = StyleSheet.create({
    mainView: {
        alignSelf: 'center',
        alignItems: 'center',
        flexDirection: 'row',

        marginEnd: 10
    },
    checkboxTouchable: {
        marginVertical: 4,
        marginEnd: 5,
        marginStart: 10,
        borderWidth: 5,
        borderRadius: 45,
    },
    checkboxView: {
        fontSize: 30,
        margin: -4
    },
    checkboxTextStyle: {
        color: "black",
        marginTop: Platform.OS === 'android' ? 2 : undefined,
    },
});
