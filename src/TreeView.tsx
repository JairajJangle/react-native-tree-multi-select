import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { TreeNode, TreeViewProps, TreeViewRef } from './types/treeView.types';
import NodeList from './components/NodeList';
import useCheckboxState from './hooks/useCheckboxState';

export const TreeView = forwardRef<TreeViewRef, TreeViewProps>(
  (props, ref) => {
    const {
      data,
      onSelectionChange,

      preselectedIds,

      searchText,

      CheckboxComponent,
    } = props;

    const [state, toggleCheckbox, selectAll, unselectAll] = useCheckboxState(
      data,
      preselectedIds,
      onSelectionChange,
    );

    useImperativeHandle(ref, () => ({
      selectAll,
      unselectAll,
    }));

    const [expanded, setExpanded] = useState(new Set<string>());

    const handleToggleExpand = React.useCallback((id: string) => {
      const newExpanded = new Set(expanded);
      if (expanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpanded(newExpanded);
    }, [expanded]);

    useEffect(() => {
      if (searchText) {
        setExpanded(new Set(data.flatMap((item) => getIds(item))));
      } else {
        setExpanded(new Set());
      }
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
        state={state}
        onCheck={toggleCheckbox}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        searchText={searchText}
        CheckboxComponent={CheckboxComponent}
      />
    );
  }
);