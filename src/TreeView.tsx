import React from 'react';
import { InteractionManager } from 'react-native';
import type {
	TreeNode,
	TreeViewProps,
	TreeViewRef
} from './types/treeView.types';
import NodeList from './components/NodeList';
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
	collapseNodes
} from './helpers';
import { useTreeViewStore } from './store/treeView.store';
import usePreviousState from './utils/usePreviousState';
import { useShallow } from "zustand/react/shallow";
import uuid from "react-native-uuid";
import useDeepCompareEffect from "./utils/useDeepCompareEffect";
import { typedMemo } from './utils/typedMemo';
import {
	ScrollToNodeHandlerRef,
	ScrollToNodeParams
} from "./handlers/ScrollToNodeHandler";

function _innerTreeView<ID>(
	props: TreeViewProps<ID>,
	ref: React.ForwardedRef<TreeViewRef<ID>>
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
	} = props;

	const storeId = React.useMemo(() => uuid.v4(), []);

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

	React.useImperativeHandle(ref, () => ({
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
	}));

	const scrollToNodeHandlerRef = React.useRef<ScrollToNodeHandlerRef<ID>>(null);
	const prevSearchText = usePreviousState(searchText);

	useDeepCompareEffect(() => {
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

	const getIds = React.useCallback((node: TreeNode<ID>): ID[] => {
		if (!node.children || node.children.length === 0) {
			return [node.id];
		} else {
			return [node.id, ...node.children.flatMap((item) => getIds(item))];
		}
	}, []);

	React.useEffect(() => {
		onCheck?.(Array.from(checked), Array.from(indeterminate));
	}, [onCheck, checked, indeterminate]);

	React.useEffect(() => {
		onExpand?.(Array.from(expanded));
	}, [onExpand, expanded]);

	React.useEffect(() => {
		if (searchText) {
			InteractionManager.runAfterInteractions(() => {
				updateExpanded(new Set(initialTreeViewData.flatMap(
					(item) => getIds(item)
				)));
			});
		}
		else if (prevSearchText && prevSearchText !== "") {
			/* Collapse all nodes only if previous search query was non-empty: this is
			done to prevent node collapse on first render if preExpandedIds is provided */
			InteractionManager.runAfterInteractions(() => {
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

	React.useEffect(() => {
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
		/>
	);
}

const _TreeView = React.forwardRef(_innerTreeView) as <ID>(
	props: TreeViewProps<ID> & { ref?: React.ForwardedRef<TreeViewRef<ID>>; }
) => ReturnType<typeof _innerTreeView>;

export const TreeView = typedMemo<typeof _TreeView>(_TreeView);
