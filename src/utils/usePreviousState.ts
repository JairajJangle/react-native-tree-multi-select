import { useEffect, useRef } from "react";

/**
 * Get previous value of a state
 * @param value state
 * @returns previous value of @param value after it's updated
 */
export default function usePreviousState<T>(value: T) {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}