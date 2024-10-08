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

    it('correctly updates checkbox states when selectionPropagationBehavior is set to propagate to both parents and children', () => {
        // Set selectionPropagationBehavior to propagate to both parents and children
        useTreeViewStore.getState().setSelectionPropagationBehavior({
            toChildren: true,
            toParents: true,
        });

        // Verify children selection on parent selection
        {
            // Act
            act(() => {
                toggleCheckboxes(['1'], true);
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
            ]));
            expect(indeterminate).toEqual(new Set([]));
        }

        // Verify children un-selection on parent un-selection
        {
            act(() => {
                toggleCheckboxes(['1'], false);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([]));
            expect(indeterminate).toEqual(new Set([]));
        }

        // Verify children selection on parent selection with indeterminate state verification
        {
            act(() => {
                toggleCheckboxes(['1.1'], true);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                '1.1',
                '1.1.1',
                '1.1.2',
            ]));
            expect(indeterminate).toEqual(new Set(['1']));

            // Additional assertions to ensure certain nodes are not checked
            expect(checked.has('1.2')).toBeFalsy();  // Sibling of '1.1'
            expect(checked.has('1.2.1')).toBeFalsy();  // Sibling of '1.1'
            expect(checked.has('1.2.2')).toBeFalsy();  // Sibling of '1.1'
        }
    });

    it('correctly updates checkbox states when selectionPropagationBehavior is set to propagate to children only', () => {
        // Set selectionPropagationBehavior to propagate to children only
        useTreeViewStore.getState().setSelectionPropagationBehavior({
            toChildren: true,
            toParents: false,
        });

        // Act
        act(() => {
            toggleCheckboxes(['1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set([
            '1.1',
            '1.1.1',
            '1.1.2',
        ]));
        expect(indeterminate).toEqual(new Set([]));
        expect(checked.has('1')).toBeFalsy();

        expect(checked.has('1.2')).toBeFalsy();
        expect(checked.has('1.2.1')).toBeFalsy();
        expect(checked.has('1.2.2')).toBeFalsy();
    });

    it('correctly updates checkbox states when selectionPropagationBehavior is set to propagate to parents only', () => {
        // Set selectionPropagationBehavior to propagate to parents only
        useTreeViewStore.getState().setSelectionPropagationBehavior({
            toChildren: false,
            toParents: true,
        });

        // Act
        act(() => {
            toggleCheckboxes(['1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();

        // Expect all parents to be checked up to the root
        expect(checked).toEqual(new Set([
            '1.1' // The initially checked node
        ]));

        // Since we are propagating only to parents, there should be no indeterminate nodes
        expect(indeterminate).toEqual(new Set([
            '1'
        ]));

        // Additional assertions to ensure certain nodes are not checked
        expect(checked.has('1')).toBeFalsy();  // Parent of '1.1.1'
        expect(checked.has('1.1.1')).toBeFalsy();  // Children of '1.1'
        expect(checked.has('1.1.2')).toBeFalsy();  // Sibling of '1.1.1'
        expect(checked.has('1.2')).toBeFalsy();    // Sibling of '1.1'
        expect(checked.has('1.2.1')).toBeFalsy();  // Child of '1.2'
        expect(checked.has('1.2.2')).toBeFalsy();  // Child of '1.2'
        expect(checked.has('2')).toBeFalsy();  // Parent node '2'
        expect(checked.has('2.1')).toBeFalsy();  // Child of '2'
        expect(checked.has('2.1.1')).toBeFalsy();  // Child of '2.1'
        expect(checked.has('2.1.2')).toBeFalsy();  // Child of '2.1'
        expect(checked.has('2.2')).toBeFalsy(); // Child of '2'
        expect(checked.has('2.2.1')).toBeFalsy();  // Child of '2.2'
        expect(checked.has('2.2.2')).toBeFalsy();  // Child of '2.2'
    });

    it('correctly updates checkbox states when selectionPropagationBehavior is set to not propagate to either parents or children', () => {
        // Set selectionPropagationBehavior to not propagate to either parents or children
        useTreeViewStore.getState().setSelectionPropagationBehavior({
            toChildren: false,
            toParents: false,
        });

        {
            // Act
            act(() => {
                toggleCheckboxes(['1.1'], true);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                '1.1',
            ]));
            expect(indeterminate).toEqual(new Set([]));
            expect(checked.has('1')).toBeFalsy();
            expect(checked.has('1.1.1')).toBeFalsy();
            expect(checked.has('1.1.2')).toBeFalsy();
            expect(checked.has('1.2')).toBeFalsy();
            expect(checked.has('1.2.1')).toBeFalsy();
            expect(checked.has('1.2.2')).toBeFalsy();
        }

        {
            // Act
            act(() => {
                toggleCheckboxes(['2.1.1'], true);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                '1.1', // Previously checked node, earlier in this test
                '2.1.1',
            ]));
            expect(indeterminate).toEqual(new Set([]));
            expect(checked.has('2')).toBeFalsy();
            expect(checked.has('2.1')).toBeFalsy();
            expect(checked.has('2.1.2')).toBeFalsy();
            expect(checked.has('2.2')).toBeFalsy();
            expect(checked.has('2.2.1')).toBeFalsy();
            expect(checked.has('2.2.2')).toBeFalsy();
        }
    });
});
