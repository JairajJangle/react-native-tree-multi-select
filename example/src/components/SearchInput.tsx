import React from "react";
import { TextInput, StyleSheet } from "react-native";

interface Props {
  onChange: (value: string) => void;
}

const SearchInput = React.memo(_SearchInput);
export default SearchInput;

function _SearchInput(props: Props) {
  const { onChange } = props;

  const [text, setText] = React.useState('');

  const handleChange = (value: string) => {
    setText(value);
    onChange(value);
  };

  return (
    <TextInput
      style={styles.textInput}
      value={text}
      onChangeText={handleChange}
      placeholder='Search here'
      placeholderTextColor={"#888"}
      blurOnSubmit
    />
  );
}


const styles = StyleSheet.create({
  textInput: {
    borderRadius: 10,
    margin: 10,
    padding: 10,
    backgroundColor: "#EEE",
    height: 40,
    fontSize: 16
  }
});