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
  toggleCheckboxes
} from './helpers';
import { useTreeViewStore } from './store/treeView.store';

const _TreeView = React.forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,

      onCheck,
      onExpand,

      preselectedIds = [],

      treeFlashListProps,
      checkBoxViewStyleProps,

      CheckboxComponent,
      ExpandCollapseIconComponent,
      ExpandCollapseTouchableComponent,

      indentationMultiplier
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

      setSearchText
    }));

    function setSearchText(text: string, keys: string[] = ["name"]) {
      updateSearchText(text);
      updateSearchKeys(keys);
    }

    React.useEffect(() => {
      updateInitialTreeViewData(data);

      initializeNodeMaps(data);

      // Check any preselected nodes
      toggleCheckboxes(preselectedIds, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
      else {
        InteractionManager.runAfterInteractions(() => {
          updateExpanded(new Set());
        });
      }
    }, [getIds, initialTreeViewData, searchText, updateExpanded]);

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
      />
    );
  }
);

export const TreeView = React.memo(_TreeView);