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
  initializeNodeMaps
} from './helpers';
import { effect } from "@preact/signals-react";
import {
  childToParentMap,
  expanded,
  globalData,
  nodeMap,
  searchText,
  state
} from './signals/global.signals';
import { InteractionManager } from 'react-native';

const _TreeView = forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,
      onSelectionChange,

      preselectedIds,

      treeFlashListProps,
      customCheckBoxViewProps,
    } = props;

    useImperativeHandle(ref, () => ({
      selectAll,
      unselectAll,

      selectAllFiltered,
      unselectAllFiltered,

      setSearchText
    }));

    function setSearchText(text: string) {
      searchText.value = text;
    }

    useEffect(() => {
      globalData.value = data;
      initializeNodeMaps(
        data,
        preselectedIds,
      );
    }, [data, preselectedIds]);

    const disposeCheckedStateEffect = effect(() => {
      onSelectionChange && onSelectionChange(Array.from(state.value.checked));
    });

    useEffect(() => {
      return () => {
        // Cleanup all global signals and signal effects
        disposeCheckedStateEffect();
        state.value = ({
          checked: new Set(),
          indeterminate: new Set(),
        });
        expanded.value = new Set<string>();
        globalData.value = [];
        nodeMap.value = new Map<string, TreeNode>();
        childToParentMap.value = new Map<string, string>();
        searchText.value = "";
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    effect(() => {
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

    const getIds = (node: TreeNode): string[] => {
      if (!node.children || node.children.length === 0) {
        return [node.id];
      } else {
        return [node.id, ...node.children.flatMap((item) => getIds(item))];
      }
    };

    return (
      <NodeList
        treeFlashListProps={treeFlashListProps}
        customCheckBoxViewProps={customCheckBoxViewProps}
      />
    );
  }
);

export const TreeView = React.memo(_TreeView);