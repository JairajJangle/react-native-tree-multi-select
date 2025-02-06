/**
 * ScrollToNodeHandler Component
 *
 * This component provides an imperative handle to scroll to a specified node within a tree view.
 * The scrolling action is orchestrated via a two-step "milestone" mechanism that ensures the target
 * node is both expanded in the tree and that the rendered list reflects this expansion before the scroll
 * is performed.
 *
 * The two key milestones tracked by the `expandAndScrollToNodeQueue` state are:
 * 1. EXPANDED: Indicates that the expansion logic for the target node has been initiated.
 * 2. RENDERED: Indicates that the list has re-rendered with the expanded node included.
 *
 * When the `scrollToNodeID` method is called:
 * - The scroll parameters (target node ID, animation preferences, view offset/position) are stored in a ref.
 * - The target node's expansion is triggered via the `expandNodes` helper.
 * - The `expandAndScrollToNodeQueue` state is updated to mark that expansion has begun.
 *
 * As the component re-renders (e.g., after the node expansion changes the rendered list):
 * - A useEffect monitors changes to the list, and once it detects the expansion has occurred,
 *   it updates the queue to include the RENDERED milestone.
 *
 * A layout effect then waits for both conditions to be met:
 * - The target node is confirmed to be in the expanded set.
 * - The `expandAndScrollToNodeQueue` exactly matches the expected milestones ([EXPANDED, RENDERED]).
 *
 * Once both conditions are satisfied:
 * - The index of the target node is determined within the latest flattened node list.
 * - The flash list is scrolled to that index.
 * - The queued scroll parameters and milestone queue are reset.
 *
 * This design ensures that the scroll action is performed only after the target node is fully present
 * in the UI, thus preventing issues with attempting to scroll to an element that does not exist yet.
 */

import React from "react";
import { expandNodes } from "../helpers/expandCollapse.helper";
import { useTreeViewStore } from "../store/treeView.store";
import { useShallow } from "zustand/react/shallow";
import { __FlattenedTreeNode__ } from "../types/treeView.types";
import { typedMemo } from "../utils/typedMemo";
import { isEqual } from "lodash";

interface Props<ID> {
  storeId: string;
  flashListRef: React.MutableRefObject<any>;
  flattenedFilteredNodes: __FlattenedTreeNode__<ID>[];
  setInitialScrollIndex: React.Dispatch<React.SetStateAction<number>>;
  initialScrollNodeID: ID | undefined;
}

export interface ScrollToNodeParams<ID> {
  nodeId: ID;
  expandScrolledNode?: boolean;

  animated?: boolean;
  viewOffset?: number;
  viewPosition?: number;
}

// Enum representing the two milestones needed before scrolling
enum ExpandQueueAction {
  EXPANDED,
  RENDERED,
}

export interface ScrollToNodeHandlerRef<ID> {
  scrollToNodeID: (params: ScrollToNodeParams<ID>) => void;
}

function _innerScrollToNodeHandler<ID>(
  props: Props<ID>,
  ref: React.ForwardedRef<ScrollToNodeHandlerRef<ID>>
) {
  const {
    storeId,
    flashListRef,
    flattenedFilteredNodes,
    setInitialScrollIndex,
    initialScrollNodeID
  } = props;

  const { expanded, childToParentMap } = useTreeViewStore<ID>(storeId)(useShallow(
    state => ({
      expanded: state.expanded,
      childToParentMap: state.childToParentMap
    })
  ));

  React.useImperativeHandle(ref, () => ({
    scrollToNodeID: (params: ScrollToNodeParams<ID>) => {
      queuedScrollToNodeParams.current = params;
      // Mark that expansion is initiated.
      setExpandAndScrollToNodeQueue([ExpandQueueAction.EXPANDED]);
      // Trigger expansion logic (this may update the store and subsequently re-render the list).
      expandNodes(
        storeId,
        [queuedScrollToNodeParams.current.nodeId],
        !queuedScrollToNodeParams.current.expandScrolledNode
      );
    }
  }), [storeId]);

  // Ref to store the scroll parameters for the queued action.
  const queuedScrollToNodeParams = React.useRef<ScrollToNodeParams<ID> | null>(null);

  // State to track progression: first the expansion is triggered, then the list is rendered.
  const [expandAndScrollToNodeQueue, setExpandAndScrollToNodeQueue]
    = React.useState<ExpandQueueAction[]>([]);

  const latestFlattenedFilteredNodesRef = React.useRef(flattenedFilteredNodes);

  /* When the rendered node list changes, update the ref.
  If an expansion was triggered, mark that the list is now rendered. */
  React.useEffect(() => {
    setExpandAndScrollToNodeQueue(prevQueue => {
      if (prevQueue.includes(ExpandQueueAction.EXPANDED)) {
        latestFlattenedFilteredNodesRef.current = flattenedFilteredNodes;
        return [
          ExpandQueueAction.EXPANDED,
          ExpandQueueAction.RENDERED
        ];
      } else {
        return prevQueue;
      }
    });
  }, [flattenedFilteredNodes]);

  /* Once the target node is expanded and the list is updated (milestones reached),
  perform the scroll using the latest node list. */
  React.useLayoutEffect(() => {
    if (queuedScrollToNodeParams.current === null)
      return;

    if (!isEqual(
      expandAndScrollToNodeQueue,
      [ExpandQueueAction.EXPANDED, ExpandQueueAction.RENDERED]
    )) {
      return;
    }

    // If node is set to not expand
    if (!queuedScrollToNodeParams.current.expandScrolledNode) {
      let parentId: ID | undefined;
      // Get the parent's id of the node to scroll to
      if (childToParentMap.has(queuedScrollToNodeParams.current.nodeId)) {
        parentId = childToParentMap.get(queuedScrollToNodeParams.current.nodeId) as ID;
      }

      // Ensure if the parent is expanded before proceeding to scroll to the node
      if (parentId && !expanded.has(parentId))
        return;
    }
    // If node is set to expand
    else {
      if (!expanded.has(queuedScrollToNodeParams.current.nodeId))
        return;
    }

    const {
      nodeId,
      animated,
      viewOffset,
      viewPosition
    } = queuedScrollToNodeParams.current!;

    function scrollToItem() {
      const index = latestFlattenedFilteredNodesRef.current.findIndex(
        item => item.id === nodeId
      );

      if (index !== -1 && flashListRef.current) {
        // Scroll to the target index.
        flashListRef.current.scrollToIndex({
          index,
          animated,
          viewOffset,
          viewPosition
        });
      } else {
        if (__DEV__) {
          console.info("Cannot find the item of the mentioned id to scroll in the rendered tree view list data!");
        }
      }

      // Clear the queued parameters and reset the expansion/render queue.
      queuedScrollToNodeParams.current = null;
      setExpandAndScrollToNodeQueue([]);
    }

    scrollToItem();
  }, [childToParentMap, expanded, flashListRef, expandAndScrollToNodeQueue]);

  ////////////////////////////// Handle Initial Scroll /////////////////////////////
  /* On first render, if an initial scroll target is provided, determine its index.
  This is done only once. */
  const initialScrollDone = React.useRef(false);
  React.useLayoutEffect(() => {
    if (initialScrollDone.current) return;

    const index = flattenedFilteredNodes.findIndex(
      item => item.id === initialScrollNodeID
    );

    setInitialScrollIndex(index);

    if (index !== -1) {
      initialScrollDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flattenedFilteredNodes, initialScrollNodeID]);
  /////////////////////////////////////////////////////////////////////////////////

  return null;
}

const _ScrollToNodeHandler = React.forwardRef(_innerScrollToNodeHandler) as <ID>(
  props: Props<ID> & { ref?: React.ForwardedRef<ScrollToNodeHandlerRef<ID>>; }
) => ReturnType<typeof _innerScrollToNodeHandler>;

export const ScrollToNodeHandler = typedMemo<
  typeof _ScrollToNodeHandler
>(_ScrollToNodeHandler);
