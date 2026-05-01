import {
	forwardRef,
	startTransition,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	type ForwardedRef,
} from "react";
import type {
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
} from "./helpers";
import { getTreeViewStore, useTreeViewStore } from "./store/treeView.store";
import usePreviousState from "./utils/usePreviousState";
import { useShallow } from "zustand/react/shallow";
import useDeepCompareEffect from "./utils/useDeepCompareEffect";
import { typedMemo } from "./utils/typedMemo";
import type {
	ScrollToNodeHandlerRef,
	ScrollToNodeParams
} from "./hooks/useScrollToNode";
import type { DragEndEvent, DropPosition } from "./types/dragDrop.types";
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

		moveNode,
	}));

	const scrollToNodeHandlerRef = useRef<ScrollToNodeHandlerRef<ID>>(null);
	const prevSearchText = usePreviousState(searchText);
	const internalDataRef = useRef<TreeNode<ID>[] | null>(null);

	// Wrap onDragEnd to set internalDataRef before calling consumer's callback
	const wrappedOnDragEnd = useCallback((event: DragEndEvent<ID>) => {
		internalDataRef.current = event.newTreeData;
		onDragEnd?.(event);
	}, [onDragEnd]);

	useDeepCompareEffect(() => {
		// If data matches what was set internally from a drag-drop, skip reinitialize
		if (internalDataRef.current !== null && fastIsEqual(data, internalDataRef.current)) {
			internalDataRef.current = null;
			return;
		}
		internalDataRef.current = null;

		cleanUpTreeViewStore();

		updateInitialTreeViewData(data);

		if (selectionPropagation)
			setSelectionPropagation(selectionPropagation);

		initializeNodeMaps(storeId, data);

		// Check any pre-selected nodes
		toggleCheckboxes(storeId, preselectedIds, true);

		// Expand pre-expanded nodes
		expandNodes(storeId, [
			...preExpandedIds,
			...(initialScrollNodeID ? [initialScrollNodeID] : [])
		]);
	}, [data]);

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

	function moveNode(nodeId: ID, targetNodeId: ID, position: DropPosition) {
		const store = getTreeViewStore<ID>(storeId);
		const currentData = store.getState().initialTreeViewData;
		const newData = moveTreeNode(currentData, nodeId, targetNodeId, position);

		store.getState().updateInitialTreeViewData(newData);
		initializeNodeMaps(storeId, newData);
		recalculateCheckedStates<ID>(storeId);

		if (position === "inside") {
			expandNodes(storeId, [targetNodeId]);
		}
		expandNodes(storeId, [nodeId], true);

		internalDataRef.current = newData;
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
		};
	}, [cleanUpTreeViewStore]);

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

			dragAndDrop={dragAndDrop && {
				...dragAndDrop,
				onDragEnd: wrappedOnDragEnd,
			}}
		/>
	);
}

const _TreeView = forwardRef(_innerTreeView) as <ID>(
	props: TreeViewProps<ID> & { ref?: ForwardedRef<TreeViewRef<ID>>; }
) => ReturnType<typeof _innerTreeView>;

export const TreeView = typedMemo<typeof _TreeView>(_TreeView);
