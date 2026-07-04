jest.mock("@futurejj/react-native-checkbox", () => {
    const { TouchableOpacity, Text } = require("react-native");
    return {
        Checkbox: ({ status, onPress, testID }: any) => (
            <TouchableOpacity testID={testID} onPress={onPress}>
                <Text>{status}</Text>
            </TouchableOpacity>
        ),
    };
});

import { render, screen, fireEvent } from "@testing-library/react-native";
import { CheckboxView } from "../components/CheckboxView";

describe("CheckboxView", () => {
    const defaultProps = {
        value: false as const,
        onValueChange: jest.fn(),
        text: "Test Label",
        testID: "test-cb",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("given value=true, when rendered, then checkbox shows checked status", () => {
        render(<CheckboxView {...defaultProps} value={true} />);
        expect(screen.getByText("checked")).toBeTruthy();
    });

    it("given value=false, when rendered, then checkbox shows unchecked status", () => {
        render(<CheckboxView {...defaultProps} value={false} />);
        expect(screen.getByText("unchecked")).toBeTruthy();
    });

    it("given value=indeterminate, when rendered, then checkbox shows indeterminate status", () => {
        render(<CheckboxView {...defaultProps} value="indeterminate" />);
        expect(screen.getByText("indeterminate")).toBeTruthy();
    });

    it("given value=false, when checkbox is pressed, then onValueChange is called with true", () => {
        const onValueChange = jest.fn();
        render(<CheckboxView {...defaultProps} value={false} onValueChange={onValueChange} />);

        fireEvent.press(screen.getByTestId("checkbox_test-cb"));
        expect(onValueChange).toHaveBeenCalledWith(true);
    });

    it("given value=true, when checkbox is pressed, then onValueChange is called with false", () => {
        const onValueChange = jest.fn();
        render(<CheckboxView {...defaultProps} value={true} onValueChange={onValueChange} />);

        fireEvent.press(screen.getByTestId("checkbox_test-cb"));
        expect(onValueChange).toHaveBeenCalledWith(false);
    });

    it("given value=indeterminate, when checkbox is pressed, then onValueChange is called with true", () => {
        const onValueChange = jest.fn();
        render(<CheckboxView {...defaultProps} value="indeterminate" onValueChange={onValueChange} />);

        fireEvent.press(screen.getByTestId("checkbox_test-cb"));
        expect(onValueChange).toHaveBeenCalledWith(true);
    });

    it("given text prop, when rendered, then text label is shown and tappable", () => {
        const onValueChange = jest.fn();
        render(<CheckboxView {...defaultProps} text="My Label" onValueChange={onValueChange} />);

        expect(screen.getByText("My Label")).toBeTruthy();
        fireEvent.press(screen.getByTestId("touchable_text_test-cb"));
        expect(onValueChange).toHaveBeenCalledWith(true);
    });

    it("given no text prop, when rendered, then text touchable is not rendered", () => {
        render(<CheckboxView {...defaultProps} text="" />);
        expect(screen.queryByTestId("touchable_text_test-cb")).toBeNull();
    });
});
