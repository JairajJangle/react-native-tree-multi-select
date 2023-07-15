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
            toggleCheckboxes(['1', '2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();

        expect(checked.has('1')).toBeTruthy();
        expect(checked.has('1.1')).toBeTruthy();
        expect(checked.has('1.2')).toBeTruthy();
        expect(checked.has('1.2.1')).toBeTruthy();
        expect(checked.has('2')).toBeTruthy();

        expect(indeterminate.has('1')).toBeFalsy();
        expect(indeterminate.has('1.1')).toBeFalsy();
        expect(indeterminate.has('1.2')).toBeFalsy();
        expect(indeterminate.has('1.2.1')).toBeFalsy();
        expect(indeterminate.has('2')).toBeFalsy();

        // Act
        act(() => {
            toggleCheckboxes(['1.2']);
        });

        // Assert
        const { checked: checkedAfterUncheck, indeterminate: indeterminateAfterUncheck } = useTreeViewStore.getState();

        expect(checkedAfterUncheck.has('1')).toBeFalsy();
        expect(checkedAfterUncheck.has('1.1')).toBeTruthy();
        expect(checkedAfterUncheck.has('1.2')).toBeFalsy();
        expect(checkedAfterUncheck.has('1.2.1')).toBeFalsy();
        expect(checked.has('2')).toBeTruthy();

        expect(indeterminateAfterUncheck.has('1')).toBeTruthy();
        expect(indeterminateAfterUncheck.has('1.1')).toBeFalsy();
        expect(indeterminateAfterUncheck.has('1.2')).toBeFalsy();
        expect(indeterminateAfterUncheck.has('1.2.1')).toBeFalsy();
        expect(indeterminate.has('2')).toBeFalsy();

        // Act
        act(() => {
            toggleCheckboxes(['2']);
        });

        // Assert
        const { checked: checkedAfterUncheck2, indeterminate: indeterminateAfterUncheck2 } = useTreeViewStore.getState();

        expect(checkedAfterUncheck2.has('1')).toBeFalsy();
        expect(checkedAfterUncheck2.has('1.1')).toBeTruthy();
        expect(checkedAfterUncheck2.has('1.2')).toBeFalsy();
        expect(checkedAfterUncheck2.has('1.2.1')).toBeFalsy();
        expect(checkedAfterUncheck2.has('2')).toBeFalsy();

        expect(indeterminateAfterUncheck2.has('1')).toBeTruthy();
        expect(indeterminateAfterUncheck2.has('1.1')).toBeFalsy();
        expect(indeterminateAfterUncheck2.has('1.2')).toBeFalsy();
        expect(indeterminateAfterUncheck2.has('1.2.1')).toBeFalsy();
        expect(indeterminateAfterUncheck2.has('2')).toBeFalsy();

        // Act
        act(() => {
            toggleCheckboxes(['1.2']);
        });


        // Assert
        const {
            checked: checkedAfter1ChildrenCheck,
            indeterminate: indeterminateAfter1ChildrenCheck
        } = useTreeViewStore.getState();

        // As all children of node 1 are checked, it should also be checked
        expect(checkedAfter1ChildrenCheck.has('1')).toBeTruthy();
        expect(checkedAfter1ChildrenCheck.has('1.1')).toBeTruthy();
        expect(checkedAfter1ChildrenCheck.has('1.2')).toBeTruthy();
        expect(checkedAfter1ChildrenCheck.has('1.2.1')).toBeTruthy();
        expect(checkedAfter1ChildrenCheck.has('2')).toBeFalsy();

        expect(indeterminateAfter1ChildrenCheck.has('1')).toBeFalsy();
        expect(indeterminateAfter1ChildrenCheck.has('1.1')).toBeFalsy();
        expect(indeterminateAfter1ChildrenCheck.has('1.2')).toBeFalsy();
        expect(indeterminateAfter1ChildrenCheck.has('1.2.1')).toBeFalsy();
        expect(indeterminateAfter1ChildrenCheck.has('2')).toBeFalsy();
    });
});
