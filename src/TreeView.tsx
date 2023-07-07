import React, {
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { TreeNode, TreeViewProps, TreeViewRef } from './types/treeView.types';
import NodeList from './components/NodeList';
import {
  selectAll,
  unselectAll
} from './hooks/useCheckboxState';
import { effect } from "@preact/signals-react";
import { expanded, globalData, state } from './signals/global.signals';
import initializeNodeMaps from './hooks/useCheckboxState';
import { InteractionManager } from 'react-native';

export const TreeView = forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,
      onSelectionChange,

      preselectedIds,

      searchText,

      CheckboxComponent,
    } = props;

    useEffect(() => {
      initializeNodeMaps(
        data,
        preselectedIds,
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    globalData.value = data;

    useImperativeHandle(ref, () => ({
      selectAll,
      unselectAll,
    }));

    const disposeCheckedStateEffect = effect(() => {
      onSelectionChange && onSelectionChange(Array.from(state.value.checked));
    });

    disposeCheckedStateEffect();

    useEffect(() => {
      InteractionManager.runAfterInteractions(() => {
        if (searchText) {
          expanded.value = (new Set(data.flatMap((item) => getIds(item))));
        }
        else {
          expanded.value = (new Set());
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText, data]);

    const getIds = (node: TreeNode): string[] => {
      if (!node.children || node.children.length === 0) {
        return [node.id];
      } else {
        return [node.id, ...node.children.flatMap((item) => getIds(item))];
      }
    };

    return (
      <NodeList
        nodes={data}
        level={0}
        searchText={searchText}
        CheckboxComponent={CheckboxComponent}
      />
    );
  }
);