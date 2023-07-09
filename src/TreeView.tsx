import React, {
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
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
import { effect } from "@preact/signals-react";
import {
  cleanUpGlobalSignals,
  expanded,
  globalData,
  searchKeys,
  searchText,
  state
} from './signals/global.signals';
import { InteractionManager } from 'react-native';

const _TreeView = forwardRef<TreeViewRef, TreeViewProps>(
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

    useImperativeHandle(ref, () => ({
      selectAll,
      unselectAll,

      selectAllFiltered,
      unselectAllFiltered,

      expandAll,
      collapseAll,

      setSearchText
    }));

    function setSearchText(text: string, keys: string[] = ["name"]) {
      searchText.value = text;
      searchKeys.value = keys;
    }

    useEffect(() => {
      globalData.value = data;
      initializeNodeMaps(
        data,
        preselectedIds,
      );
    }, [data, preselectedIds]);

    const disposeCheckedStateEffect = React.useMemo(() => {
      return effect(() => {
        onCheck && onCheck(Array.from(state.value.checked));
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const disposeExpandedStateEffect = React.useMemo(() => {
      return effect(() => {
        onExpand && onExpand(Array.from(expanded.value));
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const disposeSearchStateEffect = React.useMemo(() => {
      return effect(() => {
        if (searchText.value) {
          InteractionManager.runAfterInteractions(() => {
            expanded.value = (new Set(globalData.value.flatMap((item) => getIds(item))));
          });
        }
        else {
          InteractionManager.runAfterInteractions(() => {
            expanded.value = (new Set());
          });
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      return () => {
        // Cleanup all global signals and signal effects
        disposeCheckedStateEffect();
        disposeExpandedStateEffect();
        disposeSearchStateEffect();

        cleanUpGlobalSignals();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getIds = React.useCallback((node: TreeNode): string[] => {
      if (!node.children || node.children.length === 0) {
        return [node.id];
      } else {
        return [node.id, ...node.children.flatMap((item) => getIds(item))];
      }
    }, []);

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