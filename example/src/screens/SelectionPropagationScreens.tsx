import { type SelectionPropagation } from "react-native-tree-multi-select";
import SmallDataScreen from "./SmallDataScreen";

export function OnlyToParentSmallDataScreen() {
  const selectionPropagation: SelectionPropagation = {
    toChildren: false,
    toParents: true,
  };

  return (
    <SmallDataScreen
      selectionPropagation={selectionPropagation} />
  );
}

export function OnlyToChildrenSmallDataScreen() {
  const selectionPropagation: SelectionPropagation = {
    toChildren: true,
    toParents: false,
  };

  return (
    <SmallDataScreen
      selectionPropagation={selectionPropagation} />
  );
}

export function NeitherToChildrenNorToParentSmallDataScreen() {
  const selectionPropagation: SelectionPropagation = {
    toChildren: false,
    toParents: false,
  };

  return (
    <SmallDataScreen
      selectionPropagation={selectionPropagation} />
  );
}