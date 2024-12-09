jest.mock('zustand');

import { getTreeViewStore } from '../store/treeView.store';
import {
    initializeNodeMaps,
    toggleCheckboxes
} from '../helpers';
import { act } from 'react-test-renderer';
import { tree3d2b } from '../__mocks__/generateTree.mock';
import { testStoreId } from "../constants/tests.constants";

describe('toggleCheckboxes', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.getState().cleanUpTreeViewStore();

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it('correctly updates checkbox states', () => {
        // Act
        act(() => {
            // Pre-selection also got covered in this test
            toggleCheckboxes(testStoreId, ['1', '2'], true);
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
            toggleCheckboxes(testStoreId, ['1.2']); // Was checked, now should be unchecked
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
            toggleCheckboxes(testStoreId, ['2']); // Was checked, now should be unchecked
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
            toggleCheckboxes(testStoreId, ['1.2']); // Was unchecked, now should be checked
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

    it('correctly updates checkbox states when selectionPropagation is set to propagate to both parents and children', () => {
        // Set selectionPropagation to propagate to both parents and children
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: true,
            toParents: true,
        });

        // Verify children selection on parent selection
        {
            // Act
            act(() => {
                toggleCheckboxes(testStoreId, ['1'], true);
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
                toggleCheckboxes(testStoreId, ['1'], false);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([]));
            expect(indeterminate).toEqual(new Set([]));
        }

        // Verify children selection on parent selection with indeterminate state verification
        {
            act(() => {
                toggleCheckboxes(testStoreId, ['1.1'], true);
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

    it('correctly updates checkbox states when selectionPropagation is set to propagate to children only', () => {
        // Set selectionPropagation to propagate to children only
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: true,
            toParents: false,
        });

        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1'], true);
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

    it('correctly updates checkbox states when selectionPropagation is set to propagate to parents only', () => {
        // Set selectionPropagation to propagate to parents only
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: false,
            toParents: true,
        });

        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();

        // Expect '1.1' to be checked, '1' to be indeterminate
        expect(checked).toEqual(new Set([
            '1.1'
        ]));

        expect(indeterminate).toEqual(new Set([
            '1'
        ]));

        // Additional assertions to ensure certain nodes are not checked
        expect(checked.has('1')).toBeFalsy();  // Parent of '1.1'
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

    it('correctly updates checkbox states when selectionPropagation is set to not propagate to either parents or children', () => {
        // Set selectionPropagation to not propagate to either parents or children
        useTreeViewStore.getState().setSelectionPropagation({
            toChildren: false,
            toParents: false,
        });

        {
            // Act
            act(() => {
                toggleCheckboxes(testStoreId, ['1.1'], true);
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
                toggleCheckboxes(testStoreId, ['2.1.1'], true);
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

    it('correctly updates checkbox states when selectionPropagation not set - default behavior should be to select children and parents', () => {
        // Set selectionPropagation to not propagate to either parents or children
        useTreeViewStore.getState().setSelectionPropagation({});

        {
            // Act
            act(() => {
                toggleCheckboxes(testStoreId, ['1.1'], true);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                '1.1',
                '1.1.1',
                '1.1.2'
            ]));
            expect(indeterminate).toEqual(new Set(["1"]));
            expect(checked.has('1')).toBeFalsy();
            expect(checked.has('1.1.1')).toBeTruthy();
            expect(checked.has('1.1.2')).toBeTruthy();
            expect(checked.has('1.2')).toBeFalsy();
            expect(checked.has('1.2.1')).toBeFalsy();
            expect(checked.has('1.2.2')).toBeFalsy();
        }

        {
            // Act
            act(() => {
                toggleCheckboxes(testStoreId, ['2.1.1'], true);
            });

            // Assert
            const { checked, indeterminate } = useTreeViewStore.getState();
            expect(checked).toEqual(new Set([
                '1.1', // Previously checked node, earlier in this test
                '1.1.1',
                '1.1.2',
                '2.1.1',
            ]));
            expect(indeterminate).toEqual(new Set(['1', '2.1', '2']));
            expect(checked.has('2')).toBeFalsy();
            expect(checked.has('2.1')).toBeFalsy();
            expect(checked.has('2.1.2')).toBeFalsy();
            expect(checked.has('2.2')).toBeFalsy();
            expect(checked.has('2.2.1')).toBeFalsy();
            expect(checked.has('2.2.2')).toBeFalsy();
        }
    });

    it('does not change state when toggling an empty IDs array', () => {
        // Initial state: nothing is checked
        act(() => {
            toggleCheckboxes(testStoreId, [], true);
        });

        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());
    });

    it('handles toggling a non-existent node ID gracefully', () => {
        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['non-existent-id'], true);
        });

        // Assert: state remains unchanged
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());
    });

    it('handles toggling a single leaf node correctly', () => {
        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));
    });

    it('handles toggling a single leaf node and then unselecting it', () => {
        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], true);
        });

        // Assert
        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));

        // Act: Unselect
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], false);
        });

        // Assert
        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set());
        expect(indeterminate).toEqual(new Set());
    });

    it('handles toggling multiple nodes in different branches correctly', () => {
        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '2.1.2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1', '2.1.2']));
        expect(indeterminate).toEqual(new Set(['1.1', '1', '2.1', '2']));
    });

    it('does not allow duplicate IDs to affect the state multiple times', () => {
        // Act
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '1.1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));
    });

    it('handles toggling nodes when some nodes are already checked', () => {
        // Pre-select some nodes
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], true);
        });

        // Act: Select another node that shares the same parent
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.2'], true);
        });

        // Assert: Parent should be checked since all children are checked
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1', '1.1.1', '1.1.2']));
        expect(indeterminate).toEqual(new Set(['1']));
    });

    it('handles toggling a parent node after some of its children are already checked', () => {
        // Pre-select some children
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], true);
        });

        // Act: Toggle parent '1.1' to checked, which should check all its children
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1', '1.1.1', '1.1.2']));
        expect(indeterminate).toEqual(new Set(['1']));
    });

    it('handles toggling all nodes in the tree', () => {
        // Act: Select all nodes
        act(() => {
            toggleCheckboxes(testStoreId, ['1', '2'], true);
        });

        // Assert: All nodes should be checked
        const { checked, indeterminate } = useTreeViewStore.getState();
        const allIds = [
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
        ];
        expect(checked).toEqual(new Set(allIds));
        expect(indeterminate).toEqual(new Set([]));

        // Act: Unselect all nodes
        act(() => {
            toggleCheckboxes(testStoreId, ['1', '2'], false);
        });

        // Assert: All nodes should be unchecked
        const { checked: checkedAfterUnselect, indeterminate: indeterminateAfterUnselect } = useTreeViewStore.getState();
        expect(checkedAfterUnselect).toEqual(new Set());
        expect(indeterminateAfterUnselect).toEqual(new Set());
    });

    it('does not affect other branches when toggling nodes in one branch', () => {
        // Act: Select node '1.1' which should check '1.1' and its children
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1'], true);
        });

        // Assert
        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1', '1.1.1', '1.1.2']));
        expect(indeterminate).toEqual(new Set(['1']));

        // Act: Unselect '1.1.1' only
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], false);
        });

        // Assert: '1.1' should be indeterminate, '1' should remain indeterminate
        ({ checked, indeterminate } = useTreeViewStore.getState());
        expect(checked).toEqual(new Set(['1.1.2']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));

        // Ensure that other branch '2' remains untouched
        expect(checked.has('2')).toBeFalsy();
        expect(indeterminate.has('2')).toBeFalsy();
    });

    it('handles toggling nodes with multiple levels of depth', () => {
        // Extend the tree with deeper levels if necessary
        const extendedTree = [
            {
                "id": "1",
                "name": "node1",
                "children": [
                    {
                        "id": "1.1",
                        "name": "node1.1",
                        "children": [
                            {
                                "id": "1.1.1",
                                "name": "node1.1.1",
                                "children": [
                                    {
                                        "id": "1.1.1.1",
                                        "name": "node1.1.1.1"
                                    }
                                ]
                            },
                            {
                                "id": "1.1.2",
                                "name": "node1.1.2"
                            }
                        ]
                    }
                ]
            }
        ];

        // Reinitialize the node maps with the extended tree
        act(() => {
            useTreeViewStore.getState().updateInitialTreeViewData(extendedTree);
            initializeNodeMaps(testStoreId, extendedTree);
        });

        // Act: Select the deepest node
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1.1', '1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));
    });

    it('handles toggling the same node multiple times within the same operation', () => {
        // Act: Toggle '1.1.1' twice in the same call
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '1.1.1'], true);
        });

        // Assert: '1.1.1' should be checked only once
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));
    });

    it('handles toggling parent nodes when some of their children are already in indeterminate state', () => {
        // Act: Select '1.1.1' and '1.2.1', making '1.1' and '1.2' indeterminate, and '1' indeterminate
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '1.2.1'], true);
        });

        // Assert
        let { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1', '1.2.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1.2', '1']));

        // Act: Toggle parent '1' to checked, which should check all its children
        act(() => {
            toggleCheckboxes(testStoreId, ['1'], true);
        });

        // Assert
        ({ checked, indeterminate } = useTreeViewStore.getState());
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
    });

    it('does not set a parent to checked if only some children are checked', () => {
        // Act: Select '1.1.1' only
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));

        // Act: Select '1.1.2'
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.2'], true);
        });

        // Assert
        const { checked: checked2, indeterminate: indeterminate2 } = useTreeViewStore.getState();
        expect(checked2).toEqual(new Set(['1.1.1', '1.1.2', '1.1']));
        expect(indeterminate2).toEqual(new Set(['1']));
    });

    it('handles toggling nodes with no children correctly', () => {
        // Act: Select a leaf node '1.1.2'
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.2']));
        expect(indeterminate).toEqual(new Set(['1.1', '1']));
    });

    it('handles toggling multiple nodes that share the same parent correctly', () => {
        // Act: Select both children '1.1.1' and '1.1.2'
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '1.1.2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1', '1.1.2', '1.1']));
        expect(indeterminate).toEqual(new Set(['1']));
    });

    it('handles toggling nodes in different branches without interference', () => {
        // Act: Select '1.1.1' and '2.2.2'
        act(() => {
            toggleCheckboxes(testStoreId, ['1.1.1', '2.2.2'], true);
        });

        // Assert
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['1.1.1', '2.2.2']));
        expect(indeterminate).toEqual(new Set(['1.1', '1', '2.2', '2']));
    });

    it("handles toggling a node with children as an empty array correctly", () => {
        // Act: Toggle node '3' to checked
        act(() => {
            toggleCheckboxes(testStoreId, ['3'], true);
        });

        // Assert: Node '3' should be checked, no indeterminate
        const { checked, indeterminate } = useTreeViewStore.getState();
        expect(checked).toEqual(new Set(['3']));
        expect(indeterminate).toEqual(new Set());

        // Act: Toggle node '3' to unchecked
        act(() => {
            toggleCheckboxes(testStoreId, ['3'], false);
        });

        // Assert: Node '3' should be unchecked, no indeterminate
        const { checked: checkedAfterUncheck, indeterminate: indeterminateAfterUncheck } = useTreeViewStore.getState();
        expect(checkedAfterUncheck).toEqual(new Set());
        expect(indeterminateAfterUncheck).toEqual(new Set());
    });
});
