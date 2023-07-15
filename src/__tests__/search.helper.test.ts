import { getFilteredTreeData } from "../helpers";
import { generateTree } from "../__mocks__/generateTree.mock";
import { TreeNode } from "../types/treeView.types";

describe('getFilteredTreeData', () => {
    let nodes: TreeNode[];
    let trimmedSearchTerm: string;
    let searchKeys: string[];

    beforeEach(() => {
        nodes = generateTree(4, 10);  // Create a tree with depth 3 and breadth 2

        trimmedSearchTerm = '';
        searchKeys = ['name'];
    });

    test('should return all nodes when search term is empty', () => {
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result).toEqual(nodes);
    });

    test('should return nodes that match the search term', () => {
        trimmedSearchTerm = 'node1';
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(node => {
            expect(node.name).toContain(trimmedSearchTerm);
        });
    });

    test('should return parent nodes whose children match the search term', () => {
        trimmedSearchTerm = 'node1.1';
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(node => {
            expect(node.children?.some(child => child.name === trimmedSearchTerm)).toBeTruthy();
        });
    });

    test('should return an empty array when no nodes match the search term', () => {
        trimmedSearchTerm = 'nonexistent';
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result).toEqual([]);
    });
});