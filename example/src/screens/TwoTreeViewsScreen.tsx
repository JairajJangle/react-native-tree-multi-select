import SmallDataScreen from "./SmallDataScreen";
import { View, StyleSheet } from "react-native";

export function TwoTreeViewsScreen() {
  return (
    <>
      <View
        style={styles.treeViewParent}>
        <SmallDataScreen />
      </View>


      <View
        style={styles.treeViewParent}>
        <SmallDataScreen />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  treeViewParent: {
    flex: 1,
  }
});