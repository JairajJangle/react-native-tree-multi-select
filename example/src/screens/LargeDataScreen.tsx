import * as React from 'react';

import {
    Button,
    SafeAreaView,
    View
} from 'react-native';

import SearchInput from '../components/SearchInput';

import { debounce } from "lodash";

import {
    TreeView,
    type TreeViewRef
} from 'react-native-tree-multi-select';

import { styles } from './screens.styles';
import { generateTreeList } from '../utils/sampleDataGenerator';

export default function LargeDataScreen() {
    const sampleData = React.useRef(generateTreeList(200, 5, 6));
    const treeViewRef = React.useRef<TreeViewRef | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearchText = React.useCallback(
        debounce((text) => treeViewRef.current?.setSearchText(text), 1000, {
            trailing: true,
            leading: false
        }),
        []
    );

    const handleSelectionChange = (_checkedIds: string[]) => {
        // NOTE: Handle _checkedIds here
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