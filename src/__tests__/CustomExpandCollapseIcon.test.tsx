import { render, screen } from "@testing-library/react-native";

describe("CustomExpandCollapseIcon", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it("given @expo/vector-icons is available, when isExpanded=false, then shows caret-right", () => {
        jest.doMock("@expo/vector-icons/FontAwesome", () => {
            const { Text } = require("react-native");
            return { default: ({ name }: any) => <Text>{name}</Text> };
        });

        const { CustomExpandCollapseIcon } = require("../components/CustomExpandCollapseIcon");
        render(<CustomExpandCollapseIcon isExpanded={false} />);
        expect(screen.getByText("caret-right")).toBeTruthy();
    });

    it("given @expo/vector-icons is available, when isExpanded=true, then shows caret-down", () => {
        jest.doMock("@expo/vector-icons/FontAwesome", () => {
            const { Text } = require("react-native");
            return { default: ({ name }: any) => <Text>{name}</Text> };
        });

        const { CustomExpandCollapseIcon } = require("../components/CustomExpandCollapseIcon");
        render(<CustomExpandCollapseIcon isExpanded={true} />);
        expect(screen.getByText("caret-down")).toBeTruthy();
    });

    it("given @expo fails but react-native-vector-icons is available, when rendered, then uses fallback", () => {
        // Make expo throw
        jest.doMock("@expo/vector-icons/FontAwesome", () => {
            throw new Error("Module not found");
        });
        // Provide RN vector icons as fallback (virtual: true since it's not installed)
        jest.doMock("react-native-vector-icons/FontAwesome", () => {
            const { Text } = require("react-native");
            return { default: ({ name }: any) => <Text>{name}</Text> };
        }, { virtual: true });

        const { CustomExpandCollapseIcon } = require("../components/CustomExpandCollapseIcon");
        render(<CustomExpandCollapseIcon isExpanded={false} />);
        expect(screen.getByText("caret-right")).toBeTruthy();
    });

    it("given both icon libraries fail, when rendered, then returns null", () => {
        jest.doMock("@expo/vector-icons/FontAwesome", () => {
            throw new Error("Module not found");
        });
        jest.doMock("react-native-vector-icons/FontAwesome", () => {
            throw new Error("Module not found");
        }, { virtual: true });

        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        const { CustomExpandCollapseIcon } = require("../components/CustomExpandCollapseIcon");
        render(<CustomExpandCollapseIcon isExpanded={false} />);

        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("No FontAwesome icon library found")
        );
        expect(warnSpy).toHaveBeenCalledWith("FontAwesomeIcon is not available");
        expect(screen.queryByText("caret-right")).toBeNull();
        expect(screen.queryByText("caret-down")).toBeNull();
    });
});
