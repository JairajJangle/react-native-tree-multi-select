jest.mock('zustand');

import { getTreeViewStore } from '../store/treeView.store';
import { tree3d2b } from "../__mocks__/generateTree.mock";
import {
    collapseAll,
    collapseNodes,
    expandAll,
    expandNodes,
    handleToggleExpand,
    initializeNodeMaps
} from '../helpers';
import { act } from 'react-test-renderer';
import { testStoreId } from "../constants/tests.constants";

describe('handleToggleExpand', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    test('handleToggleExpand correctly toggles the expanded state of a tree node', () => {
        act(() => {
            handleToggleExpand(testStoreId, '1');
        });

        // Node '1' should now be expanded
        let { expanded } = useTreeViewStore.getState();
        expect(expanded.has('1')).toBeTruthy();

        act(() => {
            handleToggleExpand(testStoreId, '1.2');
        });

        // Node '1.2' should now be expanded, Node '1'(parent) should remain expanded
        expanded = useTreeViewStore.getState().expanded;
        expect(expanded.has('1.2')).toBeTruthy();
        expect(expanded.has('1')).toBeTruthy();

        act(() => {
            handleToggleExpand(testStoreId, '1');
            handleToggleExpand(testStoreId, '2');
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

describe('expandAll', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it('calls expandAll on initial tree(all collapsed)', () => {
        act(() => {
            expandAll(testStoreId);
        });

        const { expanded, nodeMap } = useTreeViewStore.getState();

        // Convert nodeMap.keys() iterator to a Set for comparison
        const nodeKeys = new Set(nodeMap.keys());
        expect(expanded).toEqual(nodeKeys);
    });

    it('expands all node in tree with some nodes which are already expanded', () => {
        act(() => {
            handleToggleExpand(testStoreId, '1');
            handleToggleExpand(testStoreId, '2');
            handleToggleExpand(testStoreId, '1.1');
            handleToggleExpand(testStoreId, '1.2');
            handleToggleExpand(testStoreId, '1.1');

            expandAll(testStoreId);
        });

        const { expanded, nodeMap } = useTreeViewStore.getState();

        // Convert nodeMap.keys() iterator to a Set for comparison
        const nodeKeys = new Set(nodeMap.keys());
        expect(expanded).toEqual(nodeKeys);
    });
});

describe('collapseAll', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        // Setup mock tree
        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it('calls collapseAll on initial tree(all collapsed)', () => {
        act(() => {
            collapseAll(testStoreId);
        });

        const { expanded } = useTreeViewStore.getState();
        expect(expanded).toEqual(new Set<string>());
    });

    it('collapses all node in tree with some nodes which are already expanded', () => {
        act(() => {
            handleToggleExpand(testStoreId, '1');
            handleToggleExpand(testStoreId, '2');
            handleToggleExpand(testStoreId, '1.1');
            handleToggleExpand(testStoreId, '1.2');
            handleToggleExpand(testStoreId, '1.1');

            collapseAll(testStoreId);
        });

        const { expanded } = useTreeViewStore.getState();

        expect(expanded).toEqual(new Set<string>());
    });
});

describe('expandNodes & collapseNodes', () => {
    const useTreeViewStore = getTreeViewStore(testStoreId);

    beforeEach(() => {
        useTreeViewStore.setState(useTreeViewStore.getState(), true);

        useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
        initializeNodeMaps(testStoreId, tree3d2b);
    });

    it('expands and then collapses multiple nodes as needed', () => {
        act(() => {
            expandNodes(testStoreId, ["1", "2.1", "2.2.2"]);
        });

        const { expanded: expandedAfterExpandNodes } = useTreeViewStore.getState();
        // Both nodes and their parents should be expanded
        expect(expandedAfterExpandNodes.has("1")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.1.2")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2.2")).toBeFalsy();

        expect(expandedAfterExpandNodes.has("2")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("2.1")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("2.1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("2.1.2")).toBeFalsy();

        expect(expandedAfterExpandNodes.has("2.2")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("2.2.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("2.2.2")).toBeTruthy();

        // Then collapse the same nodes
        act(() => {
            collapseNodes(testStoreId, ["1", "2.2"]);
        });

        const { expanded: expandedAfterCollapseNodes } = useTreeViewStore.getState();
        // Both nodes and their children should be collapsed
        expect(expandedAfterCollapseNodes.has("1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.1.1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.1.2")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.2")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.2.1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("1.2.2")).toBeFalsy();

        expect(expandedAfterCollapseNodes.has("2")).toBeTruthy();
        expect(expandedAfterCollapseNodes.has("2.1")).toBeTruthy();
        expect(expandedAfterCollapseNodes.has("2.1.1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("2.1.2")).toBeFalsy();

        expect(expandedAfterCollapseNodes.has("2.2")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("2.2.1")).toBeFalsy();
        expect(expandedAfterCollapseNodes.has("2.2.2")).toBeFalsy();
    });

    it('expands to show nodes till parents without expanding to show children', () => {
        act(() => {
            expandNodes(testStoreId, ["1", "2.1", "2.2.2"], true);
        });

        const { expanded: expandedAfterExpandNodes } = useTreeViewStore.getState();
        // Both nodes and their parents should be expanded
        expect(expandedAfterExpandNodes.has("1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.1.2")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("1.2.2")).toBeFalsy();

        expect(expandedAfterExpandNodes.has("2")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("2.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("2.1.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("2.1.2")).toBeFalsy();

        expect(expandedAfterExpandNodes.has("2.2")).toBeTruthy();
        expect(expandedAfterExpandNodes.has("2.2.1")).toBeFalsy();
        expect(expandedAfterExpandNodes.has("2.2.2")).toBeFalsy();
    });
});
