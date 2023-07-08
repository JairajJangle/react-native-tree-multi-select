import React from "react";
import { TextInput, StyleSheet } from "react-native";

interface Props {
  onChange: (value: string) => void;
}

const SearchInput = React.memo(_SearchInput);
export default SearchInput;

function _SearchInput(props: Props) {
  const { onChange } = props;

  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <TextInput
      style={styles.textInput}
      onChangeText={handleChange}
      placeholder='Search here'
      placeholderTextColor={"#888"}
    />
  );
}


const styles = StyleSheet.create({
  textInput: {
    color: "black",
    borderRadius: 10,
    margin: 10,
    padding: 10,
    backgroundColor: "#EEE",
    height: 40,
    fontSize: 16
  }
});