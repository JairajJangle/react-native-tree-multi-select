import React from "react";

/** wrapper for React.memo that works with generic components. */
export const typedMemo: <T>(c: T) => T = React.memo;
