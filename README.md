# react-native-tree-multi-select

Tree view with multi selection using checkbox + search filtering.

[![npm version](https://badge.fury.io/js/react-native-tree-multi-select.svg)](https://badge.fury.io/js/react-native-tree-multi-select)![License](https://img.shields.io/github/license/JairajJangle/react-native-tree-multi-select) ![Workflow Status](https://github.com/JairajJangle/react-native-tree-multi-select/actions/workflows/ci.yml/badge.svg)

## Demo

<div align="left">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHFleDNleTZsMXVoMjk1YnlpdXFtanZyZGprMDkwcDdteGhqYTNhcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L0w26RrC32gdfWZ8Ux/giphy.gif" alt="demo" style="border: 1px solid gray;" />
</div>

## Installation

Using yarn 

```sh
yarn add react-native-tree-multi-select
```

using npm:

```sh
npm install react-native-tree-multi-select
```

Dependencies required to be installed for this library to work:

1. [@shopify/flash-list](https://github.com/Shopify/flash-list)
2. [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons)

Make sure to follow the native-related installation for these dependencies.

## Usage

```tsx
import {
  TreeView,
  type TreeNode,
  type TreeViewRef
} from 'react-native-tree-multi-select';

const myData: TreeNode[] = [...];

export function MyAppScreen(){
  const treeViewRef = React.useRef<TreeViewRef | null>(null);
  
  // Recommended to use debounce for search function
  function triggerSearch(text: string){
    // Pass search text to the tree along with the keys on which search is to be done(optional)
    treeViewRef.current?.setSearchText(text, ["name"]);
  }
  
  const handleSelectionChange = (checkedIds: string[]) => {
    // NOTE: Do something with updated checkedIds here
  };
  const handleExpanded = (expandedIds: string[]) => {
    // NOTE: Do something with updated expandedIds here
  };
  
  // Multi-selection function calls using ref
  const onSelectAllPress = () => treeViewRef.current?.selectAll?.();
  const onUnselectAllPress = () => treeViewRef.current?.unselectAll?.();
  const onSelectAllFilteredPress = () => treeViewRef.current?.selectAllFiltered?.();
  const onUnselectAllFilteredPress = () => treeViewRef.current?.unselectAllFiltered?.();
  
  return(
    // ...
    <TreeView
      ref={treeViewRef}
      data={myData}
      onCheck={handleSelectionChange}
      onExpand={handleExpanded}
    />
  );
}
```

### Properties

| Property                           | Type                                   | Required | Description                                  |
| ---------------------------------- | -------------------------------------- | -------- | -------------------------------------------- |
| `data`                             | `TreeNode[]`                           | Yes      | An array of `TreeNode` objects               |
| `onCheck`                          | `(checkedIds: string[]) => void`       | No       | Callback when a checkbox is checked          |
| `onExpand`                         | `(expandedIds: string[]) => void`      | No       | Callback when a node is expanded             |
| `preselectedIds`                   | `string[]`                             | No       | An array of `id`s that should be preselected |
| `treeFlashListProps`               | `TreeFlatListProps`                    | No       | Props for the flash list                     |
| `checkBoxViewStyleProps`           | `CheckBoxViewStyleProps`               | No       | Props for the checkbox view                  |
| `CheckboxComponent`                | `ComponentType<CheckBoxViewProps>`     | No       | A custom checkbox component                  |
| `ExpandCollapseIconComponent`      | `ComponentType<ExpandIconProps>`       | No       | A custom expand/collapse icon component      |
| `ExpandCollapseTouchableComponent` | `ComponentType<TouchableOpacityProps>` | No       | A custom expand/collapse touchable component |

## TreeViewRef

| Property              | Type                                                  | Description                                                  |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `selectAll`           | `() => void`                                          | Selects **all** nodes                                        |
| `unselectAll`         | `() => void`                                          | Unselects **all** nodes                                      |
| `selectAllFiltered`   | `() => void`                                          | Selects all **filtered** nodes                               |
| `unselectAllFiltered` | `() => void`                                          | Unselects all **filtered** nodes                             |
| `expandAll`           | `() => void`                                          | Expands all nodes                                            |
| `collapseAll`         | `() => void`                                          | Collapses all nodes                                          |
| `setSearchText`       | `(searchText: string, searchKeys?: string[]) => void` | Set the search text and optionally the search keys. Default search key is "name"<br /><br />Recommended to call this inside a debounced function if you find any performance issue otherwise. |

## TreeNode

| Property        | Type         | Required | Description                                                  |
| --------------- | ------------ | -------- | ------------------------------------------------------------ |
| `id`            | `string`     | Yes      | Unique identifier for the node                               |
| `name`          | `string`     | Yes      | The display name of the node                                 |
| `children`      | `TreeNode[]` | No       | An array of child `TreeNode` objects                         |
| `[key: string]` | `any`        | No       | Any additional properties for the node <br />(May be useful to perform search on) |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
