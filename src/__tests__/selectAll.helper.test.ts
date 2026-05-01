jest.mock("zustand");

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
import { act } from "@testing-library/react-native";
import { testStoreId } from "../constants/tests.constants";

describe("given a tree initialized in the store", () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it("when selecting then unselecting all, then all nodes toggle correctly", () => {
        // Select all
        act(() => {
            selectAll(testStoreId);
        });

        const { checked: checkedAfterSelect, indeterminate: indeterminateAfterSelect } = useTreeViewStore.getState();
        expect(checkedAfterSelect).toEqual(new Set([
            "1",
            "1.1",
            "1.1.1",
            "1.1.2",
            "1.2",
            "1.2.1",
            "1.2.2",
            "2",
            "2.1",
            "2.1.1",
            "2.1.2",
            "2.2",
            "2.2.1",
            "2.2.2",
            "3"
        ]));
        expect(indeterminateAfterSelect).toEqual(new Set([]));

        // Unselect all
        act(() => {
            unselectAll(testStoreId);
        });

        const { checked: checkedAfterUnselect, indeterminate: indeterminateAfterUnselect } = useTreeViewStore.getState();
        expect(checkedAfterUnselect).toEqual(new Set([]));
        expect(indeterminateAfterUnselect).toEqual(new Set([]));
    });

    it("when getting leaf IDs, then only innermost nodes are returned", () => {
        const initialData = useTreeViewStore.getState().initialTreeViewData;;

        const innerMostChildrenIds = getInnerMostChildrenIdsInTree(initialData);

        expect(innerMostChildrenIds.sort()).toEqual([
            "1.1.1",
            "1.1.2",
            "1.2.1",
            "1.2.2",
            "2.1.1",
            "2.1.2",
            "2.2.1",
            "2.2.2",
        ].sort());
    });

    it("when selecting all filtered with empty and non-empty search terms, then only matching leaf nodes and their ancestors are affected", () => {
        // Empty search term: selects everything (same as selectAll)
        act(() => {
            selectAllFiltered(testStoreId);
        });

        const { checked: checkedEmpty, indeterminate: indeterminateEmpty } = useTreeViewStore.getState();
        expect(checkedEmpty).toEqual(new Set([
            "1",
            "1.1",
            "1.1.1",
            "1.1.2",
            "1.2",
            "1.2.1",
            "1.2.2",
            "2",
            "2.1",
            "2.1.1",
            "2.1.2",
            "2.2",
            "2.2.1",
            "2.2.2",
            "3"
        ]));
        expect(Array.from(indeterminateEmpty)).toEqual([]);

        // Reset state for the non-empty search term test
        act(() => {
            unselectAll(testStoreId);
        });

        // Non-empty search term: selects only matching filtered nodes
        const searchTerm = "1.1";

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

        const { checked: checkedFiltered, indeterminate: indeterminateFiltered } = useTreeViewStore.getState();
        expect(checkedFiltered).toEqual(new Set([
            "1.1", // As both of it's children are checked
            "1.1.1",
            "1.1.2",
            "2.1.1"
        ]));
        expect(indeterminateFiltered).toEqual(new Set([
            "1", // As 1.2 is unchecked
            "2", // only one if it's children is checked
            "2.1"
        ]));
    });

    it("when unselecting filtered with empty and non-empty search terms, then only matching nodes are unchecked", () => {
        // Empty search term: unselect all filtered after selecting all
        act(() => {
            selectAllFiltered(testStoreId);
        });

        act(() => {
            unselectAllFiltered(testStoreId);
        });

        const { checked: checkedEmpty, indeterminate: indeterminateEmpty } = useTreeViewStore.getState();
        expect(checkedEmpty).toEqual(new Set([]));
        expect(indeterminateEmpty).toEqual(new Set([]));

        // Non-empty search term: unselect filtered nodes from a fully selected tree
        const searchTerm = "1.1";

        act(() => {
            // First select all the nodes (unfiltered)
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

        const { checked: checkedFiltered, indeterminate: indeterminateFiltered } = useTreeViewStore.getState();
        expect(checkedFiltered).toEqual(new Set([
            "1.2",
            "1.2.1",
            "1.2.2",
            "2.1.2",
            "2.2",
            "2.2.1",
            "2.2.2",
            "3"
        ]));
        expect(indeterminateFiltered).toEqual(new Set([
            "1",
            "2",
            "2.1"
        ]));
    });
});
