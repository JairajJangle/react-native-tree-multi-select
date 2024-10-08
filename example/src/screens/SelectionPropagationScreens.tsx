import React from 'react';
import { SelectionPropagationBehavior } from "react-native-tree-multi-select";
import SmallDataScreen from "./SmallDataScreen";

export function OnlyToParentSmallDataScreen() {
  const selectionPropagationBehavior: SelectionPropagationBehavior = {
    toChildren: false,
    toParents: true,
  };

  return (
    <SmallDataScreen
      selectionPropagationBehavior={selectionPropagationBehavior} />
  );
}

export function OnlyToChildrenSmallDataScreen() {
  const selectionPropagationBehavior: SelectionPropagationBehavior = {
    toChildren: true,
    toParents: false,
  };

  return (
    <SmallDataScreen
      selectionPropagationBehavior={selectionPropagationBehavior} />
  );
}

export function NeitherToChildrenNorToParentSmallDataScreen() {
  const selectionPropagationBehavior: SelectionPropagationBehavior = {
    toChildren: false,
    toParents: false,
  };

  return (
    <SmallDataScreen
      selectionPropagationBehavior={selectionPropagationBehavior} />
  );
}