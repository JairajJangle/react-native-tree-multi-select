import { memo, useRef } from "react";
import { TextInput, StyleSheet, View, TouchableOpacity } from "react-native";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";

interface Props {
  onChange: (value: string) => void;
}

const SearchInput = memo(_SearchInput);
export default SearchInput;

function _SearchInput(props: Props) {
  const { onChange } = props;

  const textInputRef = useRef<any>(null);

  const handleChange = (value: string) => {
    onChange(value);
  };

  const clearText = () => {
    textInputRef.current?.clear?.();
    onChange("");
  };

  return (
    <View
      style={styles.parentView}>
      <TextInput
        ref={textInputRef}
        style={styles.textInput}
        onChangeText={handleChange}
        placeholder='Search here'
        placeholderTextColor={"#888"}
      />
      <TouchableOpacity
        onPress={clearText}>
        <Icon
          name={"close-circle"}
          size={25}
          color="grey"
          style={styles.clearButtonIcon}
        />
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  parentView: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    color: "black",
    borderRadius: 10,
    margin: 10,
    padding: 10,
    backgroundColor: "#EEE",
    height: 40,
    fontSize: 16,
    flex: 1
  },
  clearButtonIcon: {
    marginEnd: 15
  }
});