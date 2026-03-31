import { memo } from "react";

/** wrapper for memo that works with generic components. */
export const typedMemo: <T>(c: T) => T = memo;
