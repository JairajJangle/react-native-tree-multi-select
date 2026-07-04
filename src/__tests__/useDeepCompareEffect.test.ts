jest.mock("fast-is-equal", () => ({
    fastIsEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
}));

import { renderHook } from "@testing-library/react-native";
import useDeepCompareEffect from "../utils/useDeepCompareEffect";

describe("useDeepCompareEffect", () => {
    it("given first render, when hook mounts, then effect runs", () => {
        const effect = jest.fn();

        renderHook(() => useDeepCompareEffect(effect, [{ a: 1 }]));

        expect(effect).toHaveBeenCalledTimes(1);
    });

    it("given same deps by reference, when re-rendering, then effect does NOT re-run", () => {
        const effect = jest.fn();
        const deps = [{ a: 1 }];

        const { rerender } = renderHook(() => useDeepCompareEffect(effect, deps));

        rerender({});

        // Called once on mount only
        expect(effect).toHaveBeenCalledTimes(1);
    });

    it("given deeply equal deps (new object same values), when re-rendering, then effect does NOT re-run", () => {
        const effect = jest.fn();

        const { rerender } = renderHook(
            ({ deps }) => useDeepCompareEffect(effect, deps),
            { initialProps: { deps: [{ a: 1, b: [2, 3] }] } }
        );

        // Re-render with a brand-new object that is deeply equal
        rerender({ deps: [{ a: 1, b: [2, 3] }] });

        // Effect should still only have been called once (on mount)
        expect(effect).toHaveBeenCalledTimes(1);
    });

    it("given deeply different deps, when re-rendering, then effect runs again", () => {
        const effect = jest.fn();

        const { rerender } = renderHook(
            ({ deps }) => useDeepCompareEffect(effect, deps),
            { initialProps: { deps: [{ a: 1 }] } }
        );

        expect(effect).toHaveBeenCalledTimes(1);

        // Re-render with deeply different deps
        rerender({ deps: [{ a: 2 }] });

        expect(effect).toHaveBeenCalledTimes(2);
    });

    it("given unmount, when component unmounts, then cleanup function is called", () => {
        const cleanup = jest.fn();
        const effect = jest.fn(() => cleanup);

        const { unmount } = renderHook(() => useDeepCompareEffect(effect, [{ a: 1 }]));

        expect(cleanup).not.toHaveBeenCalled();

        unmount();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("given two consecutive deep changes, when re-rendered each time, then the effect runs for BOTH changes", () => {
        const effect = jest.fn();

        const { rerender } = renderHook(
            ({ deps }) => useDeepCompareEffect(effect, deps),
            { initialProps: { deps: [{ a: 1 }] } }
        );
        expect(effect).toHaveBeenCalledTimes(1);

        // Two different values back-to-back: each one must trigger the effect.
        // (Regression: a boolean changed-flag stays true across consecutive
        // changes, silently dropping the second update.)
        rerender({ deps: [{ a: 2 }] });
        expect(effect).toHaveBeenCalledTimes(2);

        rerender({ deps: [{ a: 3 }] });
        expect(effect).toHaveBeenCalledTimes(3);
    });

    it("given an equal re-render after a change, when re-rendered, then the effect does NOT run again", () => {
        const effect = jest.fn();

        const { rerender } = renderHook(
            ({ deps }) => useDeepCompareEffect(effect, deps),
            { initialProps: { deps: [{ a: 1 }] } }
        );
        rerender({ deps: [{ a: 2 }] });
        expect(effect).toHaveBeenCalledTimes(2);

        // Deeply-equal deps after a change must not re-fire the effect.
        rerender({ deps: [{ a: 2 }] });
        rerender({ deps: [{ a: 2 }] });
        expect(effect).toHaveBeenCalledTimes(2);
    });
});
