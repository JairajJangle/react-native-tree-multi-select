import {
    Button,
    SafeAreaView,
    View
} from "react-native";

import SearchInput from "../components/SearchInput";

import debounce from "lodash/debounce";

import {
    TreeView,
    type TreeViewRef
} from "react-native-tree-multi-select";

import { styles } from "./screens.styles";
import { defaultID, generateTreeList } from "../utils/sampleDataGenerator";
import { useCallback, useRef } from "react";

export default function MediumDataScreen() {
    const sampleData = useRef(generateTreeList(20, 4, 5, defaultID, "1"));
    const treeViewRef = useRef<TreeViewRef | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearchText = useCallback(
        debounce((text) => treeViewRef.current?.setSearchText(text), 375, {
            leading: true,
            trailing: true,
            maxWait: 750
        }),
        []
    );

    const handleSelectionChange = (
        _checkedIds: string[],
        _indeterminateIds: string[]
    ) => {
        // NOTE: Handle _checkedIds and _indeterminateIds here
    };
    const handleExpanded = (_expandedIds: string[]) => {
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
                <TreeView
                    ref={treeViewRef}
                    data={sampleData.current}
                    onCheck={handleSelectionChange}
                    onExpand={handleExpanded}
                />
            </View>
        </SafeAreaView>
    );
}
