# react-native-tree-multi-select

⚡️Super-fast Tree view with multi-selection capabilities, using checkboxes and search filtering.

[![npm version](https://img.shields.io/npm/v/react-native-tree-multi-select)](https://badge.fury.io/js/react-native-tree-multi-select) [![License](https://img.shields.io/github/license/JairajJangle/react-native-tree-multi-select)](https://github.com/JairajJangle/react-native-tree-multi-select/blob/main/LICENSE) [![Workflow Status](https://github.com/JairajJangle/react-native-tree-multi-select/actions/workflows/ci.yml/badge.svg)](https://github.com/JairajJangle/react-native-tree-multi-select/actions/workflows/ci.yml) [![Supported Platform Badge](https://img.shields.io/badge/platform-android%20%26%20ios-blue)](https://github.com/JairajJangle/react-native-tree-multi-select/tree/main/example) [![GitHub issues](https://img.shields.io/github/issues/JairajJangle/react-native-tree-multi-select)](https://github.com/JairajJangle/react-native-tree-multi-select/issues?q=is%3Aopen+is%3Aissue) [![cov](https://raw.githubusercontent.com/JairajJangle/react-native-tree-multi-select/gh-pages/badges/coverage.svg)](https://github.com/JairajJangle/react-native-tree-multi-select/actions/workflows/ci.yml)



<div style="display: flex; justify-content: space-around;">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHFleDNleTZsMXVoMjk1YnlpdXFtanZyZGprMDkwcDdteGhqYTNhcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L0w26RrC32gdfWZ8Ux/giphy.gif" alt="Expand/collapse demo" style="border: 1px solid gray;" />
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGxuZHNqaGhrZmdyZzRtY21icHNtbHZoM3N4aHlyMDFxZjJrd25rMyZlcD12MV9pbnRtZXJuYWxfZ2lmX2J5X2lkJmN0PWc/KY6Y0gkSPYAFxffL8r/giphy.gif" alt="Search demo" style="border: 1px solid gray;" />
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXI4aWxpazdhaDk2MDk1a3BpaHphcmVoY2FpNGw3aHExZ3hwYmY3OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZXtvX5eqGzoCuD3hus/giphy.gif" alt="Customization demo" style="border: 1px solid gray;" />
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

Dependencies that need to be installed for this library to work:

1. [@shopify/flash-list](https://github.com/Shopify/flash-list)
2. [react-native-paper](https://github.com/callstack/react-native-paper)
3. [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons)

Make sure to follow the native-related installation instructions for these dependencies.

## Usage

```tsx
import {
  TreeView,
  type TreeNode,
  type TreeViewRef
} from 'react-native-tree-multi-select';

// Refer to the Properties table below or the example app for the TreeNode type
const myData: TreeNode[] = [...];

export function TreeViewUsageExample(){
  const treeViewRef = React.useRef<TreeViewRef | null>(null);
  
  // It's recommended to use debounce for the search function (refer to the example app)
  function triggerSearch(text: string){
    // Pass search text to the tree along with the keys on which search is to be done(optional)
    treeViewRef.current?.setSearchText(text, ["name"]);
  }
  
  // Callback functions for check and expand state changes:
  const handleSelectionChange = (checkedIds: string[]) => {
    // NOTE: Do something with updated checkedIds here
  };
  const handleExpanded = (expandedIds: string[]) => {
    // NOTE: Do something with updated expandedIds here
  };

  // Expand collapse calls using ref
  const expandAllPress = () => treeViewRef.current?.expandAll?.();
  const collapseAllPress = () => treeViewRef.current?.collapseAll?.();
  const expandNodes = (idsToExpand: string[]) => treeViewRef.current?.expandNodes?.(
    idsToExpand
  );
  const collapseNodes = (idsToCollapse: string[]) => treeViewRef.current?.collapseNodes?.(
    idsToCollapse
  );

  // Multi-selection function calls using ref
  const onSelectAllPress = () => treeViewRef.current?.selectAll?.();
  const onUnselectAllPress = () => treeViewRef.current?.unselectAll?.();
  const onSelectAllFilteredPress = () => treeViewRef.current?.selectAllFiltered?.();
  const onUnselectAllFilteredPress = () => treeViewRef.current?.unselectAllFiltered?.();
  
  return(
    // ... Remember to keep a fixed height for the parent. Read Flash List docs to know why
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

| Property                           | Type                                                         | Required | Description                                                  |
| ---------------------------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------ |
| `data`                             | `TreeNode[]`                                                 | Yes      | An array of `TreeNode` objects                               |
| `onCheck`                          | `(checkedIds: string[]) => void`                             | No       | Callback when a checkbox is checked                          |
| `onExpand`                         | `(expandedIds: string[]) => void`                            | No       | Callback when a node is expanded                             |
| `preselectedIds`                   | `string[]`                                                   | No       | An array of `id`s that should be pre-selected                 |
| `preExpandedIds`                   | `string[]`                                                   | No       | An array of `id`s that should be pre-expanded                 |
| `indentationMultiplier`            | `number`                                                     | No       | Indentation (`marginStart`) per level (defaults to 15)       |
| `treeFlashListProps`               | `TreeFlatListProps`                                          | No       | Props for the flash list                                     |
| `checkBoxViewStyleProps`           | `BuiltInCheckBoxViewStyleProps`                              | No       | Props for the checkbox view                                  |
| `CheckboxComponent`                | `ComponentType<CheckBoxViewProps>`                           | No       | A custom checkbox component. Defaults to React Native Paper's Checkbox |
| `ExpandCollapseIconComponent`      | `ComponentType<ExpandIconProps>`                             | No       | A custom expand/collapse icon component                      |
| `ExpandCollapseTouchableComponent` | `ComponentType<TouchableOpacityProps>`<br />(React Native's `TouchableOpacityProps`) | No       | A custom expand/collapse touchable component                 |
| `CustomNodeRowComponent`           | `React.ComponentType<NodeRowProps>`                          | No       | Custom row item component                                    |

ℹ️ If `CustomNodeRowComponent` is provided then below props are not applied:

1. `indentationMultiplier`
2. `checkBoxViewStyleProps`
3. `CheckboxComponent`
4. `ExpandCollapseIconComponent`
5. `ExpandCollapseTouchableComponent`.

⚠️ If the tree view doesn't scroll if rendered in a complex nested scroll view/s then try setting the `renderScrollComponent` value in  `treeFlashListProps` to `ScrollView` from `react-native-gesture-handler`.

---

#### TreeNode

| Property        | Type         | Required | Description                                                  |
| --------------- | ------------ | -------- | ------------------------------------------------------------ |
| `id`            | `string`     | Yes      | Unique identifier for the node                               |
| `name`          | `string`     | Yes      | The display name of the node                                 |
| `children`      | `TreeNode[]` | No       | An array of child `TreeNode` objects                         |
| `[key: string]` | `any`        | No       | Any additional properties for the node <br />(May be useful to perform search on) |

---

#### TreeViewRef

| Property              | Type                                                  | Description                                                  |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `selectAll`           | `() => void`                                          | Selects **all** nodes                                        |
| `unselectAll`         | `() => void`                                          | Unselects **all** nodes                                      |
| `selectAllFiltered`   | `() => void`                                          | Selects all **filtered** nodes                               |
| `unselectAllFiltered` | `() => void`                                          | Unselects all **filtered** nodes                             |
| `expandAll`           | `() => void`                                          | Expands all nodes                                            |
| `expandNodes`           | `() => void`                                          | Expands specified nodes    
| `collapseAll`         | `() => void`                                          | Collapses all nodes                                          |
| `collapseNodes`           | `() => void`                                          | Collapses specified nodes    
| `setSearchText`       | `(searchText: string, searchKeys?: string[]) => void` | Set the search text and optionally the search keys. Default search key is "name"<br /><br />Recommended to call this inside a debounced function if you find any performance issue otherwise. |

---

#### TreeFlatListProps

All properties of `FlashListProps`(from `@shopify/flash-list`) except for `data` and `renderItem`

---

#### BuiltInCheckBoxViewStyleProps

| Property                   | Type                             | Required | Description                                            |
| -------------------------- | -------------------------------- | -------- | ------------------------------------------------------ |
| `outermostParentViewStyle` | `StyleProp<ViewStyle>`           | No       | Optional style modifier for the outermost parent view. |
| `checkboxParentViewStyle`  | `StyleProp<ViewStyle>`           | No       | Optional style modifier for the checkbox parent view.  |
| `textTouchableStyle`       | `StyleProp<ViewStyle>`           | No       | Optional style modifier for the text touchable style.  |
| `checkboxProps`            | `CheckboxProps`                  | No       | Optional props for the checkbox component.             |
| `textProps`                | `TextProps` <br />(React Native) | No       | Optional props for the text component.                 |

#### CheckboxProps

All properties of `RNPaperCheckboxAndroidProps`(from `react-native-paper`) except for `onPress` and `status`

---

#### CheckBoxViewProps

| Property        | Type                       | Required | Description                                        |
| --------------- | -------------------------- | -------- | -------------------------------------------------- |
| `value`         | `CheckboxValueType`        | Yes      | The current value of the checkbox                  |
| `onValueChange` | `(value: boolean) => void` | Yes      | Function to be called when the checkbox is pressed |
| `text`          | `string`                   | Yes      | The display text besides the checkbox              |

#### CheckboxValueType

Type: `boolean` OR ` "indeterminate"`

---

#### ExpandIconProps

| Property   | Type    | Required | Description                       |
| ---------- | ------- | -------- | --------------------------------- |
| isExpanded | boolean | Yes      | Indicates if the icon is expanded |

---

#### NodeRowProps

| Property       | Type                | Required | Description                                             |
| -------------- | ------------------- | -------- | ------------------------------------------------------- |
| `node`         | `TreeNode`          | Yes      | The node to be rendered                                 |
| `level`        | `number`            | Yes      | The depth of the node in the tree                       |
| `checkedValue` | `CheckboxValueType` | Yes      | The current value of the checkbox                       |
| `isExpanded`   | `boolean`           | Yes      | Whether the node is expanded or not                     |
| `onCheck`      | `() => void`        | Yes      | Function to be called when the checkbox is pressed      |
| `onExpand`     | `() => void`        | Yes      | Function to be called when the expand button is pressed |

---

 ### 🙌 Planned features

- [x] Row Item full-customization
- [ ] Prop to set the maximum checked item limit
- [ ] Prop to disable certain nodes from getting checked
- [x] Ref function to programatically expand/collapse a certain node 
- [ ] Ref function to programatically un/check a certain node
- [ ] Ref function to auto-scroll to a certain node's position

If you do not see what you want in the planned feature list, raise a feature request. 

---

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

## Support the project

<p align="center" valign="center">
  <a href="https://liberapay.com/FutureJJ/donate">
    <img src="https://liberapay.com/assets/widgets/donate.svg" alt="LiberPay_Donation_Button" height="50" > 
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href=".github/assets/Jairaj_Jangle_Google_Pay_UPI_QR_Code.jpg">
    <img src=".github/assets/upi.png" alt="Paypal_Donation_Button" height="50" >
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://www.paypal.com/paypalme/jairajjangle001/usd">
    <img src=".github/assets/paypal_donate.png" alt="Paypal_Donation_Button" height="50" >
  </a>
</p>


## ❤️ Thanks to 

- Module built using [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
- To allow super fast list rendering [@shopify/flash-list](https://github.com/Shopify/flash-list)
- Super easy state management done using [zustand](https://github.com/pmndrs/zustand)
- Readme is edited using [Typora](https://typora.io/)
- Example app uses [@gorhom/showcase-template](https://github.com/gorhom/showcase-template)

---
