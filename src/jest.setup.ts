import "@testing-library/jest-native/extend-expect";

// Skip host component auto-detection which fails in RN 0.78+ jest environment
try {
    const { configure } = require("@testing-library/react-native");
    configure({
        hostComponentNames: {
            text: "Text",
            textInput: "TextInput",
            switch: "RCTSwitch",
            scrollView: "RCTScrollView",
            modal: "Modal",
        },
    });
} catch (_) {
    // @testing-library/react-native not available in all environments
}