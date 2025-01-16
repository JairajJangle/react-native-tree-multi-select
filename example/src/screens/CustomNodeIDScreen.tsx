import { debounce } from "lodash";
import React, { useEffect, useRef } from "react";
import { SafeAreaView, View, Button } from "react-native";
import { SelectionPropagation, TreeViewRef, TreeView } from "react-native-tree-multi-select";
import SearchInput from "../components/SearchInput";
import { generateTreeList, TreeNode } from "../utils/sampleDataGenerator";
import { styles } from "./screens.styles";
import { CustomNodeRowView } from "../components/CustomNodeRowView";

interface Props {
    selectionPropagation?: SelectionPropagation;
}

const customMapper: (parentName?: string) => (it: TreeNode<number>, idx: number) => TreeNode<number> = (parentStr?: string) => (it: TreeNode<number>, idx: number) => {
  const name = `${parentStr ? `${parentStr}.` : ''}${idx + 1}`;
  return {
    ...it,
    name,
    children: it.children?.map(customMapper(name)) ?? []
  } as TreeNode<number>
}

export default function CustomNodeID(props: Props) {
    const { selectionPropagation } = props;

    const idRef = useRef<number>(1);

    useEffect(() => {
      return () => {
        idRef.current = 1
      };
    }, [])

    const sampleData = React.useMemo(() => generateTreeList<number>(30, 4, 5, (_prev, _idx) => idRef.current++, 1).map(customMapper()), []);
    console.log(sampleData);
    const treeViewRef = React.useRef<TreeViewRef<number> | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearchText = React.useCallback(
        debounce((text) => treeViewRef.current?.setSearchText(text), 375, {
            leading: true,
            trailing: true,
            maxWait: 750
        }),
        []
    );

    const handleSelectionChange = (
        _checkedIds: number[],
        _indeterminateIds: number[]
    ) => {
        // NOTE: Handle _checkedIds and _indeterminateIds here
    };
    const handleExpanded = (_expandedIds: number[]) => {
        // NOTE: Handle _expandedIds here
    };

    // Expand collapse calls using ref
    const expandAllPress = () => treeViewRef.current?.expandAll?.();
    const collapseAllPress = () => treeViewRef.current?.collapseAll?.();

    // Multi-select calls using ref
    const onSelectAllPress = () => treeViewRef.current?.selectAll?.();
    const onUnselectAllPress = () => treeViewRef.current?.unselectAll?.();
    const onSelectAllFilteredPress = () => treeViewRef.current?.selectAllFiltered?.();
    const onUnselectAllFilteredPress = () => treeViewRef.current?.unselectAllFiltered?.();

    return (
        <SafeAreaView
            style={styles.mainView}>
            <SearchInput onChange={debouncedSetSearchText} />
            <View
                style={styles.selectionButtonRow}>
                <Button
                    title='Select All'
                    onPress={onSelectAllPress} />
                <Button
                    title='Unselect All'
                    onPress={onUnselectAllPress} />
            </View>
            <View
                style={styles.selectionButtonRow}>
                <Button
                    title='Select Filtered'
                    onPress={onSelectAllFilteredPress} />
                <Button
                    title='Unselect Filtered'
                    onPress={onUnselectAllFilteredPress} />
            </View>

            <View
                style={[styles.selectionButtonRow, styles.selectionButtonBottom]}>
                <Button
                    title='Expand All'
                    onPress={expandAllPress} />
                <Button
                    title='Collapse All'
                    onPress={collapseAllPress} />
            </View>

            <View
                style={styles.treeViewParent}>
                <TreeView<number>
                    ref={treeViewRef}
                    data={sampleData}
                    onCheck={handleSelectionChange}
                    onExpand={handleExpanded}
                    selectionPropagation={selectionPropagation}
                    CustomNodeRowComponent={CustomNodeRowView}
                />
            </View>
        </SafeAreaView>
    );
}
