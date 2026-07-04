import {
  useEffect,
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
  // Ref to store the previous dependencies
  const dependenciesRef = useRef<DependencyList>(deps);

  // Monotonic change counter: a boolean flag would stay `true` across two
  // consecutive deep changes and useEffect would miss the second one.
  const changeSignalRef = useRef(0);

  if (!fastIsEqual(dependenciesRef.current, deps)) {
    dependenciesRef.current = deps;
    changeSignalRef.current += 1;
  }

  useEffect(
    () => effect(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changeSignalRef.current] // exclude the effect function from the dependencies
  );
}