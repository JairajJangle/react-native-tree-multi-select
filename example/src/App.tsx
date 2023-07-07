import * as React from 'react';

import {
  Button,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import {
  TreeView,
  CustomCheckboxView,

  type CustomCheckBoxViewProps,
  type CheckboxProps,
  type TreeViewRef
} from 'react-native-tree-multi-select';
import { sampleData2 } from './sample/sampleData2';

// Example of HOC wrapped Checkbox to react required prop signature
function withCheckboxProps(
  Component: React.ComponentType<CustomCheckBoxViewProps>
): React.ComponentType<CheckboxProps> {
  return function WrappedComponent(props: CheckboxProps) {
    const { value, onValueChange, text } = props;

    // transform CheckboxProps to Props
    const transformedProps: CustomCheckBoxViewProps = {
      value: value,
      onValueChange: () => onValueChange(),
      text: text,
      // set other Props properties as you need
    };

    return <Component {...transformedProps} />;
  };
}

export default function App() {
  const treeViewRef = React.useRef<TreeViewRef | null>(null);
  const [searchText, setSearchText] = React.useState('');

  const handleSelectionChange = (selectedIds: string[]) => {
    console.debug('Selected ids:', selectedIds);
  };

  return (
    <SafeAreaView
      style={styles.mainView}>
      <TextInput
        style={styles.textInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder='Search here' />
      <View
        style={styles.selectionButtonRow}>
        <Button
          title='Select All'
          onPress={() => {
            treeViewRef.current?.selectAll?.();
          }} />
        <Button
          title='Unselect All'
          onPress={() => {
            treeViewRef.current?.unselectAll?.();
          }} />
      </View>

      <View
        style={styles.treeViewParent}>
        <TreeView
          ref={treeViewRef}
          data={sampleData2}
          onSelectionChange={handleSelectionChange}
          CheckboxComponent={withCheckboxProps(CustomCheckboxView)}
          searchText={searchText}
        />
      </View>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    alignSelf: "flex-start",
    backgroundColor: "white",
  },
  selectionButtonRow: {
    borderTopWidth: 0.5,
    borderColor: "grey",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  textInput: {
    borderRadius: 10,
    margin: 10,
    padding: 10,
    backgroundColor: "#DDD",
    height: 40,
    fontSize: 16
  },
  treeViewParent: {
    flex: 1,
    minWidth: "100%",
    borderTopWidth: 0.5,
    marginTop: 5,
    borderColor: "grey",
  }
});
