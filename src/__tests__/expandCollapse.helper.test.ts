jest.mock('zustand');

import { useTreeViewStore } from '../store/treeView.store';
import { tree3d2b } from "../__mocks__/generateTree.mock";
import {
    collapseAll,
    expandAll,
    handleToggleExpand,
    initializeNodeMaps
} from '../helpers';
import { act } from 'react-test-renderer';
import { TreeNode } from '../types/treeView.types';

describe('expandAll', () => {
    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(tree3d2b);
    });

    it('calls expandAll on initial tree(all collapsed)', () => {
        act(() => {
            expandAll();
        });

        const { expanded, nodeMap } = useTreeViewStore.getState();

        // Convert nodeMap.keys() iterator to a Set for comparison
        const nodeKeys = new Set(nodeMap.keys());
        expect(expanded).toEqual(nodeKeys);
    });

    it('expands all node in tree with some nodes which are already expanded', () => {
        act(() => {
            handleToggleExpand('1');
            handleToggleExpand('2');
            handleToggleExpand('1.1');
            handleToggleExpand('1.2');
            handleToggleExpand('1.1');

            expandAll();
        });

        const { expanded, nodeMap } = useTreeViewStore.getState();

        // Convert nodeMap.keys() iterator to a Set for comparison
        const nodeKeys = new Set(nodeMap.keys());
        expect(expanded).toEqual(nodeKeys);
    });
});

describe('collapseAll', () => {
    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(tree3d2b);
    });

    it('calls collapseAll on initial tree(all collapsed)', () => {
        act(() => {
            collapseAll();
        });

        const { expanded } = useTreeViewStore.getState();
        expect(expanded).toEqual(new Set<string>());
    });

    it('collapses all node in tree with some nodes which are already expanded', () => {
        act(() => {
            handleToggleExpand('1');
            handleToggleExpand('2');
            handleToggleExpand('1.1');
            handleToggleExpand('1.2');
            handleToggleExpand('1.1');

            collapseAll();
        });

        const { expanded } = useTreeViewStore.getState();

        expect(expanded).toEqual(new Set<string>());
    });
});

describe('handleToggleExpand', () => {
    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);
    });

    test('handleToggleExpand correctly toggles the expanded state of a tree node', () => {
        const initialData: TreeNode[] = [
            {
                id: '1',
                name: 'Node 1',
                children: [
                    {
                        id: '1.1',
                        name: 'Node 1.1'
                    },
                    {
                        id: '1.2',
                        name: 'Node 1.2',
                        children: [{
                            id: '1.2.1',
                            name: 'Node 1.2.1'
                        }]
                    },
                ],
            },
            {
                id: '2',
                name: 'Node 2'
            },
        ];

        act(() => {
            useTreeViewStore.getState().updateInitialTreeViewData(initialData);
            initializeNodeMaps(initialData);
        });

        act(() => {
            handleToggleExpand('1');
        });

        // Node '1' should now be expanded
        let { expanded } = useTreeViewStore.getState();
        expect(expanded.has('1')).toBeTruthy();

        act(() => {
            handleToggleExpand('1.2');
        });

        // Node '1.2' should now be expanded, Node '1'(parent) should remain expanded
        expanded = useTreeViewStore.getState().expanded;
        expect(expanded.has('1.2')).toBeTruthy();
        expect(expanded.has('1')).toBeTruthy();

        act(() => {
            handleToggleExpand('1');
            handleToggleExpand('2');
        });

        // Node '1' and its descendants should now be collapsed but Node '2' should remain expanded
        expanded = useTreeViewStore.getState().expanded;

        expect(expanded.has('1')).toBeFalsy();
        expect(expanded.has('1.1')).toBeFalsy();
        expect(expanded.has('1.2')).toBeFalsy();
        expect(expanded.has('1.2.1')).toBeFalsy();

        expect(expanded.has('2')).toBeTruthy();
    });
});
