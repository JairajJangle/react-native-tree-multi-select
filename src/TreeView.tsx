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

const _TreeView = React.forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,

      onCheck,
      onExpand,

      preselectedIds = [],

      preExpandedIds = [],

      treeFlashListProps,
      checkBoxViewStyleProps,
      indentationMultiplier,

      CheckboxComponent,
      ExpandCollapseIconComponent,
      ExpandCollapseTouchableComponent,

      CustomNodeRowComponent,
    } = props;

    const {
      expanded,
      updateExpanded,

      initialTreeViewData,
      updateInitialTreeViewData,

      searchText,
      updateSearchText,

      updateSearchKeys,

      checked,

      cleanUpTreeViewStore,
    } = useTreeViewStore();

    React.useImperativeHandle(ref, () => ({
      selectAll,
      unselectAll,

      selectAllFiltered,
      unselectAllFiltered,

      expandAll,
      collapseAll,

      expandNodes,
      collapseNodes,

      checkNodes,
      uncheckNodes,

      setSearchText
    }));

    const prevSearchText = usePreviousState(searchText);

    React.useEffect(() => {
      updateInitialTreeViewData(data);

      initializeNodeMaps(data);

      // Check any pre-selected nodes
      toggleCheckboxes(preselectedIds, true);

      // Expand pre-expanded nodes
      expandNodes(preExpandedIds);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function checkNodes(ids: string[]) {
      toggleCheckboxes(ids, true);
    }

    function uncheckNodes(ids: string[]) {
      toggleCheckboxes(ids, false);
    }

    function setSearchText(text: string, keys: string[] = ["name"]) {
      updateSearchText(text);
      updateSearchKeys(keys);
    }

    const getIds = React.useCallback((node: TreeNode): string[] => {
      if (!node.children || node.children.length === 0) {
        return [node.id];
      } else {
        return [node.id, ...node.children.flatMap((item) => getIds(item))];
      }
    }, []);

    React.useEffect(() => {
      onCheck && onCheck(Array.from(checked));
    }, [onCheck, checked]);

    React.useEffect(() => {
      onExpand && onExpand(Array.from(expanded));
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
);

export const TreeView = React.memo(_TreeView);