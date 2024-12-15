import { tree3d2b } from "../__mocks__/generateTree.mock";
import {
    getFilteredTreeData,
    getInnerMostChildrenIdsInTree,
    initializeNodeMaps,
    selectAll,
    selectAllFiltered,
    unselectAll,
    unselectAllFiltered
} from "../helpers";
import { getTreeViewStore } from "../store/treeView.store";
import { act } from 'react-test-renderer';
import { testStoreId } from "../constants/tests.constants";

jest.mock('zustand');

describe('selectAll helpers functions', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it('selectAll works correctly', () => {
        // Act
        act(() => {
            selectAll(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            '1',
            '1.1',
            '1.1.1',
            "1.1.2",
            '1.2',
            "1.2.1",
            "1.2.2",
            '2',
            '2.1',
            "2.1.1",
            "2.1.2",
            "2.2",
            "2.2.1",
            "2.2.2",
            "3"
        ]));
        expect(indeterminate).toEqual(new Set([]));
    });

    it('unselectAll works correctly', () => {
        // Arrange
        act(() => {
            selectAll(testStoreId);
        });

        // Act
        act(() => {
            unselectAll(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([]));
        expect(indeterminate).toEqual(new Set([]));
    });

    it('getInnerMostChildrenIdsInTree works correctly', () => {
        const initialData = useTreeViewStore.getState().initialTreeViewData;;

        // Act
        const innerMostChildrenIds = getInnerMostChildrenIdsInTree(initialData);

        // Assert
        expect(innerMostChildrenIds.sort()).toEqual([
            '1.1.1',
            "1.1.2",
            "1.2.1",
            "1.2.2",
            "2.1.1",
            "2.1.2",
            "2.2.1",
            "2.2.2",
        ].sort());
    });

    ////////////////////////////////////////////////////////////////////////////////
    it('selectAllFiltered works correctly for empty search term', () => {
        // Act
        act(() => {
            selectAllFiltered(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            '1',
            '1.1',
            '1.1.1',
            "1.1.2",
            '1.2',
            "1.2.1",
            "1.2.2",
            '2',
            '2.1',
            "2.1.1",
            "2.1.2",
            "2.2",
            "2.2.1",
            "2.2.2",
            "3"
        ]));
        expect(Array.from(indeterminate)).toEqual([]);
    });

    it('selectAllFiltered works correctly for non-empty search term with found nodes', () => {
        const searchTerm = "1.1";

        // Act
        act(() => {
            // Update search related states in the store
            useTreeViewStore.getState().updateSearchText(searchTerm);
            useTreeViewStore.getState().updateSearchKeys(["id"]);

            const { searchText, searchKeys } = useTreeViewStore.getState();

            // Get filtered tree data (getFilteredTreeData is already tested in `search.helper.test.ts`)
            const filteredTreeData = getFilteredTreeData(
                tree3d2b,
                searchText,
                searchKeys
            );

            // Get the ids of the inner most children in the filtered tree
            const innerMostChildrenIds = getInnerMostChildrenIdsInTree(
                filteredTreeData
            );

            // Update the state of innerMostChildrenIds in the store
            useTreeViewStore.getState().updateInnerMostChildrenIds(
                innerMostChildrenIds
            );

            // Call the select all filtered function
            selectAllFiltered(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            '1.1', // As both of it's children are checked
            '1.1.1',
            '1.1.2',
            '2.1.1'
        ]));
        expect(indeterminate).toEqual(new Set([
            '1', // As 1.2 is unchecked
            '2', // only one if it's children is checked
            '2.1'
        ]));
    });
    ////////////////////////////////////////////////////////////////////////////////

    it('unselectAllFiltered works correctly for empty search term', () => {
        // Arrange
        act(() => {
            selectAllFiltered(testStoreId);
        });

        // Act
        act(() => {
            unselectAllFiltered(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([]));
        expect(indeterminate).toEqual(new Set([]));
    });

    it('unselectAllFiltered works correctly for non-empty search term with found nodes', () => {
        const searchTerm = "1.1";

        // Act
        act(() => {
            // First select all the nodes(unfiltered)
            selectAll(testStoreId);

            // Update search related states in the store
            useTreeViewStore.getState().updateSearchText(searchTerm);
            useTreeViewStore.getState().updateSearchKeys(["id"]);

            const { searchText, searchKeys } = useTreeViewStore.getState();

            // Get filtered tree data (getFilteredTreeData is already tested in `search.helper.test.ts`)
            const filteredTreeData = getFilteredTreeData(
                tree3d2b,
                searchText,
                searchKeys
            );

            // Get the ids of the inner most children in the filtered tree
            const innerMostChildrenIds = getInnerMostChildrenIdsInTree(
                filteredTreeData
            );

            // Update the state of innerMostChildrenIds in the store
            useTreeViewStore.getState().updateInnerMostChildrenIds(
                innerMostChildrenIds
            );

            // Call the select all filtered function
            unselectAllFiltered(testStoreId);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            '1.2',
            '1.2.1',
            '1.2.2',
            '2.1.2',
            '2.2',
            '2.2.1',
            '2.2.2',
            '3'
        ]));
        expect(indeterminate).toEqual(new Set([
            '1',
            '2',
            '2.1'
        ]));
    });
});
