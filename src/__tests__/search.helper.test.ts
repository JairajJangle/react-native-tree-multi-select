import { getFilteredTreeData } from "../helpers";
import { generateTree } from "../__mocks__/generateTree.mock";
import { TreeNode } from "../types/treeView.types";

describe("given a tree with searchable nodes", () => {
    let nodes: TreeNode[];
    let trimmedSearchTerm: string;
    let searchKeys: string[];

    beforeEach(() => {
        nodes = generateTree(4, 10);  // Create a tree with depth 3 and breadth 2

        trimmedSearchTerm = "";
        searchKeys = ["name"];
    });

    test("when search term is empty, then all nodes are returned", () => {
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result).toEqual(nodes);
    });

    test("when search term matches nodes, then only matching nodes are returned", () => {
        trimmedSearchTerm = "node1";
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(node => {
            expect(node.name).toContain(trimmedSearchTerm);
        });
    });

    test("when search term matches a child, then parent node is included in results", () => {
        trimmedSearchTerm = "node1.1";
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result.length).toBeGreaterThan(0);
        result.forEach(node => {
            expect(node.children?.some(
                child => child.name === trimmedSearchTerm
            )).toBeTruthy();
        });
    });

    test("when search term matches nothing, then empty array is returned", () => {
        trimmedSearchTerm = "nonexistent";
        const result = getFilteredTreeData(nodes, trimmedSearchTerm, searchKeys);
        expect(result).toEqual([]);
    });
});
