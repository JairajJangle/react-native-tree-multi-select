import React from 'react';
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
  collapseAll
} from './helpers';
import { useStore } from './store/global.store';
import { InteractionManager } from 'react-native';

const _TreeView = React.forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,

      onCheck,
      onExpand,

      preselectedIds,

      treeFlashListProps,
      checkBoxViewStyleProps,

      CheckboxComponent,
      ExpandCollapseIconComponent,
      ExpandCollapseTouchableComponent
    } = props;

    const {
      expanded,
      updateExpanded,

      globalData,
      updateGlobalData,

      searchText,
      updatedSearchText,

      updatedSearchKeys,

      checked,

      cleanUpGlobalStore,
    } = useStore();

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
      updatedSearchText(text);
      updatedSearchKeys(keys);
    }

    React.useEffect(() => {
      updateGlobalData(data);
      initializeNodeMaps(
        data,
        preselectedIds,
      );
    }, [updateGlobalData, data, preselectedIds]);


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
          updateExpanded(new Set(globalData.flatMap((item) => getIds(item))));
        });
      }
      else {
        InteractionManager.runAfterInteractions(() => {
          updateExpanded(new Set());
        });
      }
    }, [getIds, globalData, searchText, updateExpanded]);

    React.useEffect(() => {
      return () => {
        cleanUpGlobalStore();
      };
    }, [cleanUpGlobalStore]);

    return (
      <NodeList
        treeFlashListProps={treeFlashListProps}
        checkBoxViewStyleProps={checkBoxViewStyleProps}

        CheckboxComponent={CheckboxComponent}
        ExpandCollapseIconComponent={ExpandCollapseIconComponent}
        ExpandCollapseTouchableComponent={ExpandCollapseTouchableComponent}
      />
    );
  }
);

export const TreeView = React.memo(_TreeView);