import React from "react";
import isEqual from "lodash/isEqual";

/**
 * Deep compare effect hook.
 * Ensures the effect runs on the first render and whenever dependencies deeply change.
 *
 * @param effect The effect callback function.
 * @param deps The dependencies array to compare deeply.
 */
export default function useDeepCompareEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList
) {
  // Ref to track if it's the first render
  const firstRenderRef = React.useRef<boolean>(true);

  // Memoized dependencies to avoid redundant `isEqual` checks
  const memoizedDependencies = React.useMemo(() => deps, [deps]);

  // Ref to store the previous dependencies
  const dependenciesRef = React.useRef<React.DependencyList>(memoizedDependencies);

  // Check for dependency changes
  const dependenciesChanged = !isEqual(dependenciesRef.current, memoizedDependencies);
  if (dependenciesChanged) {
    dependenciesRef.current = memoizedDependencies;
  }

  React.useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependenciesChanged]); // exclude the effect function from the dependencies
}