import {
	forwardRef,
	startTransition,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	type ForwardedRef,
} from "react";
import type {
	DropAutoScrollOptions,
	TreeNode,
	TreeViewProps,
	TreeViewRef
} from "./types/treeView.types";
import NodeList from "./components/NodeList";
import {
	selectAll,
	selectAllFiltered,
	unselectAll,
	unselectAllFiltered,
	initializeNodeMaps,
	expandAll,
	collapseAll,
	toggleCheckboxes,
	expandNodes,
	collapseNodes,
	recalculateCheckedStates,
	moveTreeNode,
	findNodePosition,
	getSubtreeDepthFromMap,
	getNodeDepthFromParentMap,
} from "./helpers";
import { deleteTreeViewStore, getTreeViewStore, useTreeViewStore } from "./store/treeView.store";
import usePreviousState from "./utils/usePreviousState";
import { useShallow } from "zustand/react/shallow";
import useDeepCompareEffect from "./utils/useDeepCompareEffect";
import { typedMemo } from "./utils/typedMemo";
import type {
	ScrollToNodeHandlerRef,
	ScrollToNodeParams
} from "./hooks/useScrollToNode";
import type { DragEndEvent, DropPosition, MoveResult } from "./types/dragDrop.types";
import { fastIsEqual } from "fast-is-equal";

function _innerTreeView<ID>(
	props: TreeViewProps<ID>,
	ref: ForwardedRef<TreeViewRef<ID>>
) {
	const {
		data,

		onCheck,
		onExpand,

		selectionPropagation,

		preselectedIds = [],

		preExpandedIds = [],

		initialScrollNodeID,

		treeFlashListProps,
		checkBoxViewStyleProps,
		indentationMultiplier,

		CheckboxComponent,
		ExpandCollapseIconComponent,
		ExpandCollapseTouchableComponent,

		CustomNodeRowComponent,

		dragAndDrop,
	} = props;

	const onDragEnd = dragAndDrop?.onDragEnd;

	const storeId = useId();

	const {
		expanded,
		updateExpanded,

		initialTreeViewData,
		updateInitialTreeViewData,

		searchText,
		updateSearchText,

		updateSearchKeys,

		checked,
		indeterminate,

		setSelectionPropagation,

		cleanUpTreeViewStore,

		draggedNodeId,
	} = useTreeViewStore<ID>(storeId)(useShallow(
		state => ({
			expanded: state.expanded,
			updateExpanded: state.updateExpanded,

			initialTreeViewData: state.initialTreeViewData,
			updateInitialTreeViewData: state.updateInitialTreeViewData,

			searchText: state.searchText,
			updateSearchText: state.updateSearchText,

			updateSearchKeys: state.updateSearchKeys,

			checked: state.checked,
			indeterminate: state.indeterminate,

			setSelectionPropagation: state.setSelectionPropagation,

			cleanUpTreeViewStore: state.cleanUpTreeViewStore,

			draggedNodeId: state.draggedNodeId,
		})
	));

	useImperativeHandle(ref, () => ({
		selectAll: () => selectAll(storeId),
		unselectAll: () => unselectAll(storeId),

		selectAllFiltered: () => selectAllFiltered(storeId),
		unselectAllFiltered: () => unselectAllFiltered(storeId),

		expandAll: () => expandAll(storeId),
		collapseAll: () => collapseAll(storeId),

		expandNodes: (ids: ID[]) => expandNodes(storeId, ids),
		collapseNodes: (ids: ID[]) => collapseNodes(storeId, ids),

		selectNodes: (ids: ID[]) => selectNodes(ids),
		unselectNodes: (ids: ID[]) => unselectNodes(ids),

		setSearchText,

		scrollToNodeID,

		getChildToParentMap,

		getTreeData,

		moveNode,
	}));

	const scrollToNodeHandlerRef = useRef<ScrollToNodeHandlerRef<ID>>(null);
	const prevSearchText = usePreviousState(searchText);
	const internalDataRef = useRef<TreeNode<ID>[] | null>(null);
	// Holds a `data` prop change that arrived mid-drag; applied once the drag ends so
	// the destructive reinit never swaps the node maps out from under an active drag.
	const pendingDataRef = useRef<TreeNode<ID>[] | null>(null);

	// Wrap onDragEnd to capture the post-move tree before calling the consumer's
	// callback. The reordered tree lives in the store (the event only carries the
	// lightweight move delta); snapshotting it here lets a controlled consumer feed
	// an equal tree back into `data` and skip re-initialization.
	const wrappedOnDragEnd = useCallback((event: DragEndEvent<ID>) => {
		internalDataRef.current = getTreeViewStore<ID>(storeId).getState().initialTreeViewData;
		// A `data` change deferred during this drag predates the move that just
		// committed; applying it would silently undo the drop after onDragEnd
		// already told the consumer it happened. Discard it - a controlled
		// consumer reacts to onDragEnd with fresh data anyway.
		pendingDataRef.current = null;
		onDragEnd?.(event);
	}, [onDragEnd, storeId]);

	// Reinitialize the store from a tree. Held in a ref so the value stays stable
	// (no dep churn) while always capturing the latest props/store actions.
	const applyDataRef = useRef<(nextData: TreeNode<ID>[]) => void>(() => { });
	applyDataRef.current = (nextData: TreeNode<ID>[]) => {
		// If data matches what was set internally from a drag-drop, skip reinitialize
		if (internalDataRef.current !== null && fastIsEqual(nextData, internalDataRef.current)) {
			internalDataRef.current = null;
			return;
		}
		internalDataRef.current = null;

		cleanUpTreeViewStore();

		updateInitialTreeViewData(nextData);

		if (selectionPropagation)
			setSelectionPropagation(selectionPropagation);

		initializeNodeMaps(storeId, nextData);

		// Check any pre-selected nodes
		toggleCheckboxes(storeId, preselectedIds, true);

		// Expand pre-expanded nodes
		expandNodes(storeId, [
			...preExpandedIds,
			...(initialScrollNodeID ? [initialScrollNodeID] : [])
		]);
	};

	useDeepCompareEffect(() => {
		// A reinit while a drag is in flight would replace nodeMap/childToParentMap
		// under the drag's feet and corrupt the commit. Defer it until the drag ends.
		if (getTreeViewStore<ID>(storeId).getState().draggedNodeId !== null) {
			pendingDataRef.current = data;
			return;
		}
		applyDataRef.current(data);
	}, [data]);

	// Apply any data change that was deferred during a drag, once the drag ends.
	useEffect(() => {
		if (draggedNodeId === null && pendingDataRef.current !== null) {
			const pending = pendingDataRef.current;
			pendingDataRef.current = null;
			applyDataRef.current(pending);
		}
	}, [draggedNodeId]);

	function selectNodes(ids: ID[]) {
		toggleCheckboxes(storeId, ids, true);
	}

	function unselectNodes(ids: ID[]) {
		toggleCheckboxes(storeId, ids, false);
	}

	function setSearchText(text: string, keys: string[] = ["name"]) {
		updateSearchText(text);
		updateSearchKeys(keys);
	}

	function scrollToNodeID(params: ScrollToNodeParams<ID>) {
		scrollToNodeHandlerRef.current?.scrollToNodeID(params);
	}

	function getChildToParentMap() {
		const treeViewStore = getTreeViewStore<ID>(storeId);
		return treeViewStore.getState().childToParentMap;
	}

	function getTreeData() {
		return getTreeViewStore<ID>(storeId).getState().initialTreeViewData;
	}

	function moveNode(
		nodeId: ID,
		targetNodeId: ID,
		position: DropPosition,
		options?: { validate?: boolean; scrollToNode?: boolean | DropAutoScrollOptions; }
	): MoveResult<ID> | null {
		const store = getTreeViewStore<ID>(storeId);
		const { initialTreeViewData: currentData, nodeMap, childToParentMap }
			= store.getState();

		// A programmatic move during an in-flight drag would reinitialize
		// nodeMap/childToParentMap under the drag's feet and corrupt the pending
		// commit (same guard as the deferred data-prop reinit above).
		if (store.getState().draggedNodeId !== null) {
			if (__DEV__) {
				console.warn(
					"[react-native-tree-multi-select] moveNode() ignored: a drag is in progress."
				);
			}
			return null;
		}

		// Validation rules (canDrop / maxDepth / canNodeHaveChildren) live on the
		// dragAndDrop prop, so `validate` only has rules to enforce when that prop is
		// configured. Warn in dev if the caller asked to validate but nothing can.
		if (__DEV__ && options?.validate
			&& !(dragAndDrop?.canDrop || dragAndDrop?.maxDepth !== undefined || dragAndDrop?.canNodeHaveChildren)) {
			console.warn(
				"[react-native-tree-multi-select] moveNode({ validate: true }) was called, "
				+ "but no validation rules are configured. canDrop / maxDepth / "
				+ "canNodeHaveChildren are read from the `dragAndDrop` prop; without them the "
				+ "move proceeds unvalidated."
			);
		}

		// Optional validation mirrors the interactive drag constraints so a
		// programmatic move can't silently build a tree the drag UI would reject.
		if (options?.validate && dragAndDrop) {
			const draggedNode = nodeMap.get(nodeId);
			const targetNode = nodeMap.get(targetNodeId);
			if (!draggedNode || !targetNode) return null;
			if (position === "inside"
				&& dragAndDrop.canNodeHaveChildren
				&& !dragAndDrop.canNodeHaveChildren(targetNode)) return null;
			if (dragAndDrop.canDrop
				&& !dragAndDrop.canDrop(draggedNode, targetNode, position)) return null;
			if (dragAndDrop.maxDepth !== undefined) {
				const targetLevel = getNodeDepthFromParentMap(childToParentMap, targetNodeId);
				const subtreeDepth = getSubtreeDepthFromMap(nodeMap, nodeId);
				const baseLevel = position === "inside" ? targetLevel + 1 : targetLevel;
				if (baseLevel + subtreeDepth > dragAndDrop.maxDepth) return null;
			}
		}

		const previousPosition = findNodePosition(currentData, nodeId);
		const newData = moveTreeNode(currentData, nodeId, targetNodeId, position);
		// moveTreeNode returns the original array reference on a no-op / invalid move
		// (same node, dropping into own descendant, or node/target not found).
		if (newData === currentData) return null;

		store.getState().updateInitialTreeViewData(newData);
		initializeNodeMaps(storeId, newData);
		recalculateCheckedStates<ID>(storeId);

		if (position === "inside") {
			expandNodes(storeId, [targetNodeId]);
		}
		expandNodes(storeId, [nodeId], true);

		internalDataRef.current = newData;

		// Optionally scroll the moved node into view (the interactive drag does this
		// automatically; programmatic moves opt in). Deferred so the expand/render settles.
		const scroll = options?.scrollToNode;
		if (scroll) {
			const custom = typeof scroll === "object" ? scroll : {};
			setTimeout(() => {
				scrollToNodeHandlerRef.current?.scrollToNodeID({
					nodeId,
					animated: custom.animated ?? true,
					viewPosition: custom.viewPosition ?? 0.5,
					viewOffset: custom.viewOffset,
				});
			}, 0);
		}

		const newPosition = findNodePosition(newData, nodeId);
		return {
			draggedNodeId: nodeId,
			targetNodeId,
			position,
			previousParentId: previousPosition?.parentId ?? null,
			previousIndex: previousPosition?.index ?? -1,
			newParentId: newPosition?.parentId ?? null,
			newIndex: newPosition?.index ?? -1,
		};
	}

	const getIds = useCallback((node: TreeNode<ID>): ID[] => {
		if (!node.children || node.children.length === 0) {
			return [node.id];
		} else {
			return [node.id, ...node.children.flatMap((item) => getIds(item))];
		}
	}, []);

	useEffect(() => {
		onCheck?.(Array.from(checked), Array.from(indeterminate));
	}, [onCheck, checked, indeterminate]);

	useEffect(() => {
		onExpand?.(Array.from(expanded));
	}, [onExpand, expanded]);

	useEffect(() => {
		if (searchText) {
			startTransition(() => {
				updateExpanded(new Set(initialTreeViewData.flatMap(
					(item) => getIds(item)
				)));
			});
		}
		else if (prevSearchText && prevSearchText !== "") {
			/* Collapse all nodes only if previous search query was non-empty: this is
			done to prevent node collapse on first render if preExpandedIds is provided */
			startTransition(() => {
				updateExpanded(new Set());
			});
		}
	}, [
		getIds,
		initialTreeViewData,
		prevSearchText,
		searchText,
		updateExpanded
	]);

	useEffect(() => {
		return () => {
			cleanUpTreeViewStore();
			deleteTreeViewStore(storeId);
		};
	}, [cleanUpTreeViewStore, storeId]);

	// Memoized so NodeList's memo isn't defeated by a fresh object every render.
	const dragAndDropWithWrappedEnd = useMemo(
		() => dragAndDrop && {
			...dragAndDrop,
			onDragEnd: wrappedOnDragEnd,
		},
		[dragAndDrop, wrappedOnDragEnd]
	);

	return (
		<NodeList
			storeId={storeId}

			scrollToNodeHandlerRef={scrollToNodeHandlerRef}
			initialScrollNodeID={initialScrollNodeID}

			treeFlashListProps={treeFlashListProps}
			checkBoxViewStyleProps={checkBoxViewStyleProps}
			indentationMultiplier={indentationMultiplier}

			CheckboxComponent={CheckboxComponent}
			ExpandCollapseIconComponent={ExpandCollapseIconComponent}
			ExpandCollapseTouchableComponent={ExpandCollapseTouchableComponent}

			CustomNodeRowComponent={CustomNodeRowComponent}

			dragAndDrop={dragAndDropWithWrappedEnd}
		/>
	);
}

const _TreeView = forwardRef(_innerTreeView) as <ID>(
	props: TreeViewProps<ID> & { ref?: ForwardedRef<TreeViewRef<ID>>; }
) => ReturnType<typeof _innerTreeView>;

export const TreeView = typedMemo<typeof _TreeView>(_TreeView);
