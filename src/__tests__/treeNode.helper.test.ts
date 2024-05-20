jest.mock('zustand');

import { act } from 'react-test-renderer';
import { useTreeViewStore } from '../store/treeView.store';
import { TreeNode } from 'src/types/treeView.types';
import { initializeNodeMaps } from '../helpers';

describe('initNodeMap helper', () => {
    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);
    });

    test('initializeNodeMaps correctly initializes the node maps', () => {
        const initialData: TreeNode[] = [
            {
                id: '1',
                name: 'Node 1',
                children: [
                    { id: '1.1', name: 'Node 1.1' },
                    { id: '1.2', name: 'Node 1.2', children: [{ id: '1.2.1', name: 'Node 1.2.1' }] },
                ],
            },
            { id: '2', name: 'Node 2' },
        ];

        act(() => {
            initializeNodeMaps(initialData);
        });

        const { nodeMap, childToParentMap } = useTreeViewStore.getState();

        // The nodeMap should contain all nodes, regardless of depth
        expect(nodeMap.has('1')).toBeTruthy();
        expect(nodeMap.has('1.1')).toBeTruthy();
        expect(nodeMap.has('1.2')).toBeTruthy();
        expect(nodeMap.has('1.2.1')).toBeTruthy();
        expect(nodeMap.has('2')).toBeTruthy();

        // The childToParentMap should contain all non-root nodes
        expect(childToParentMap.has('1')).toBeFalsy(); // Root node
        expect(childToParentMap.get('1.1')).toEqual('1');
        expect(childToParentMap.get('1.2')).toEqual('1');
        expect(childToParentMap.get('1.2.1')).toEqual('1.2');
        expect(childToParentMap.has('2')).toBeFalsy(); // Root node
    });
});
