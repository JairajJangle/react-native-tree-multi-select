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

      // Helper function to recursively delete children from the expanded set.
      const deleteChildrenFromExpanded = (node: TreeNode) => {
        if (node.children) {
          for (let child of node.children) {
            newExpanded.delete(child.id);
            deleteChildrenFromExpanded(child);
          }
        }
      };

      // Find the clicked node in the nodes array.
      const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
        for (let node of nodes) {
          if (node.id === id) {
            return node;
          } else if (node.children) {
            const found = findNode(node.children);
            if (found) {
              return found;
            }
          }
        }
        return undefined;
      };
      const node = findNode(data);

      if (expanded.has(id)) {
        newExpanded.delete(id);
        // If this node was in the expanded set, also delete all its children from the set.
        if (node) {
          deleteChildrenFromExpanded(node);
        }
      } else {
        newExpanded.add(id);
      }

      setExpanded(newExpanded);
    }, [expanded, data]);

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