import React, { useRef } from "react";
import isEqual from "lodash/isEqual";

/**
 * Deep compare effect hook.
 * Ensures the effect runs on the first render and whenever dependencies deeply change.
 *
 * @param effect The effect callback function.
 * @param dependencies The dependencies array to compare deeply.
 */
export default function useDeepCompareEffect(
  effect: React.EffectCallback,
  dependencies: any[]
) {
  const previousDependenciesRef = useRef<any[]>();
  const isFirstRender = useRef(true);

  const hasChanged =
    isFirstRender.current || !isEqual(previousDependenciesRef.current, dependencies);

  React.useEffect(() => {
    if (hasChanged) {
      isFirstRender.current = false; // Mark that the first render has passed
      previousDependenciesRef.current = dependencies; // Update dependencies reference
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanged]); // Depend only on the change detection flag
};