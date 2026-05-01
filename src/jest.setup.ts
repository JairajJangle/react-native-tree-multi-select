import "@testing-library/react-native/extend-expect";
import { configure } from "@testing-library/react-native";

// Skip host component auto-detection which fails in RN 0.78+ jest environment.
// The type definition doesn't include hostComponentNames yet, but it works at runtime.
(configure as any)({
    hostComponentNames: {
        text: "Text",
        textInput: "TextInput",
        switch: "RCTSwitch",
        scrollView: "RCTScrollView",
        modal: "Modal",
    },
});