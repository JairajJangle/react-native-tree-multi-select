jest.mock('zustand');

import { useTreeViewStore } from '../store/treeView.store';
import {
    initializeNodeMaps,
    toggleCheckboxes
} from '../helpers';
import { act } from 'react-test-renderer';
import { tree3d2b } from '../__mocks__/generateTree.mock';

describe('toggleCheckboxes', () => {
    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(tree3d2b);
    });

    it('correctly updates checkbox states', () => {
        // Act
        act(() => {
            // Pre-selection also got covered in this test
            toggleCheckboxes(['1', '2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();

        expect(checked).toEqual(new Set([
            '1',
            '1.1',
            '1.1.1',
            '1.1.2',
            '1.2',
            '1.2.1',
            '1.2.2',
            '2',
            '2.1',
            '2.1.1',
            '2.1.2',
            '2.2',
            '2.2.1',
            '2.2.2'
        ]));

        expect(indeterminate).toEqual(new Set([]));

        // Act
        act(() => {
            toggleCheckboxes(['1.2']); // Was checked, now should be unchecked
        });

        // Assert
        const {
            checked: checkedAfterUncheck,
            indeterminate: indeterminateAfterUncheck
        } = useTreeViewStore.getState();


        expect(checkedAfterUncheck).toEqual(new Set([
            '1.1',
            '1.1.1',
            '1.1.2',
            '2',
            '2.1',
            '2.1.1',
            '2.1.2',
            '2.2',
            '2.2.1',
            '2.2.2'
        ]));

        expect(indeterminateAfterUncheck).toEqual(new Set([
            "1"
        ]));

        // Act
        act(() => {
            toggleCheckboxes(['2']); // Was checked, now should be unchecked
        });

        // Assert
        const {
            checked: checkedAfterUncheck2,
            indeterminate: indeterminateAfterUncheck2
        } = useTreeViewStore.getState();

        expect(checkedAfterUncheck2).toEqual(new Set([
            '1.1',
            '1.1.1',
            '1.1.2'
        ]));

        expect(indeterminateAfterUncheck2).toEqual(new Set([
            "1"
        ]));

        // Act
        act(() => {
            toggleCheckboxes(['1.2']); // Was unchecked, now should be checked
        });

        // Assert
        const {
            checked: checkedAfter1ChildrenCheck,
            indeterminate: indeterminateAfter1ChildrenCheck
        } = useTreeViewStore.getState();

        // As all children of node 1 are checked, it should also be checked
        expect(checkedAfter1ChildrenCheck).toEqual(new Set([
            '1', // All children are checked again
            '1.1',
            '1.1.1',
            '1.1.2',
            '1.2',
            '1.2.1',
            '1.2.2'
        ]));

        // 1 is all checked whereas all children of 2 are unchecked
        expect(indeterminateAfter1ChildrenCheck).toEqual(new Set([]));
    });
});
