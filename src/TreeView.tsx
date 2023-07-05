import React, {
  useState,
  useEffect,
} from 'react';
import type { TreeNode, TreeViewProps } from './types/treeView.types';
import NodeList from './components/NodeList';
import useCheckboxState from './hooks/useCheckboxState';

export function TreeView(props: TreeViewProps) {
  const {
    data,
    onSelectionChange,
    searchText,
    CheckboxComponent
  } = props;

  const [state, toggleCheckbox] = useCheckboxState(data, onSelectionChange);
  const [expanded, setExpanded] = useState(new Set<string>());

  const handleToggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (expanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

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
};