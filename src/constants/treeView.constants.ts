export const defaultIndentationMultiplier = 15;

/** Padding used by the FlashList header/footer component. Total header height = 2 * this value. */
export const listHeaderFooterPadding = 5;

/** Estimated/default row height in px. Used as FlashList's estimatedItemSize and as
 *  the drag-and-drop fallback height before a row has been measured (kept in one
 *  place so the two never silently diverge). */
export const defaultItemHeight = 36;