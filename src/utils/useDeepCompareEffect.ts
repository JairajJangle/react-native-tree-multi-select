import {
  useEffect,
  useMemo,
  useRef,
  type DependencyList,
  type EffectCallback,
} from "react";
import { fastIsEqual } from "fast-is-equal";

/**
 * Deep compare effect hook.
 * Ensures the effect runs on the first render and whenever dependencies deeply change.
 *
 * @param effect The effect callback function.
 * @param deps The dependencies array to compare deeply.
 */
export default function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList
) {
  // Ref to track if it's the first render
  const firstRenderRef = useRef<boolean>(true);

  // Memoized dependencies to avoid redundant `isEqual` checks
  const memoizedDependencies = useMemo(() => deps, [deps]);

  // Ref to store the previous dependencies
  const dependenciesRef = useRef<DependencyList>(memoizedDependencies);

  // Check for dependency changes
  const dependenciesChanged = !fastIsEqual(
    dependenciesRef.current,
    memoizedDependencies
  );
  if (dependenciesChanged) {
    dependenciesRef.current = memoizedDependencies;
  }

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependenciesChanged]); // exclude the effect function from the dependencies
}