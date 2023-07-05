import * as React from 'react';

import { StyleSheet, TextInput, View } from 'react-native';
import {
  TreeView,
  CustomCheckboxView,

  type CustomCheckBoxViewProps,
  type CheckboxProps
} from 'react-native-tree-multi-select';
import { sampleData1 } from './sample/sampleData1';

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
  const [searchText, setSearchText] = React.useState('');

  const handleSelectionChange = (selectedIds: string[]) => {
    console.debug('Selected ids:', selectedIds);
  };

  return (
    <View
      style={styles.mainView}>
      <TextInput
        style={styles.textInput}
        value={searchText}
        onChangeText={setSearchText} />
      <TreeView
        data={sampleData1}
        onSelectionChange={handleSelectionChange}
        CheckboxComponent={withCheckboxProps(CustomCheckboxView)}
        searchText={searchText}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    alignSelf: "flex-start",
    backgroundColor: "white"
  },
  textInput: {
    backgroundColor: "grey"
  }
});
