import { getFlattenedTreeData } from "../helpers";
import { generateExpectedFlatTree, tree3d2b } from "../__mocks__/generateTree.mock";
import { TreeNode } from "../types/treeView.types";

describe("getFlattenedTreeData", () => {
    let nodes: TreeNode[];
    let expandedIds: Set<string>;

    beforeEach(() => {
        nodes = tree3d2b;
        expandedIds = new Set<string>();
    });

    // Hardcoded test
    test("should correctly flatten a simple tree", () => {
        const simpleNodes: TreeNode[] = [{
            id: "1",
            name: "node1",
            children: [
                {
                    id: "1.1", name: "node1.1", children: [
                        { id: "1.1.1", name: "node1.1.1" },
                        { id: "1.1.2", name: "node1.1.2" },
                        { id: "1.1.3", name: "node1.1.3" },
                    ]
                },
                {
                    id: "1.2", name: "node1.2", children: [
                        { id: "1.2.1", name: "node1.2.1" },
                        { id: "1.2.2", name: "node1.2.2" },
                        { id: "1.2.3", name: "node1.2.3" },
                    ]
                },
                {
                    id: "1.3", name: "node1.3", children: [
                        { id: "1.3.1", name: "node1.3.1" },
                        { id: "1.3.2", name: "node1.3.2" },
                        { id: "1.3.3", name: "node1.3.3" },
                    ]
                },
            ],
        }];
        const simpleExpandedIds = new Set(["1", "1.1", "1.2", "1.3"]);
        const result = getFlattenedTreeData(simpleNodes, simpleExpandedIds);
        expect(result).toEqual([
            { id: "1", name: "node1", level: 0, children: simpleNodes?.[0]?.children },
            { id: "1.1", name: "node1.1", level: 1, children: simpleNodes?.[0]?.children?.[0]?.children },
            { id: "1.1.1", name: "node1.1.1", level: 2 },
            { id: "1.1.2", name: "node1.1.2", level: 2 },
            { id: "1.1.3", name: "node1.1.3", level: 2 },
            { id: "1.2", name: "node1.2", level: 1, children: simpleNodes?.[0]?.children?.[1]?.children },
            { id: "1.2.1", name: "node1.2.1", level: 2 },
            { id: "1.2.2", name: "node1.2.2", level: 2 },
            { id: "1.2.3", name: "node1.2.3", level: 2 },
            { id: "1.3", name: "node1.3", level: 1, children: simpleNodes?.[0]?.children?.[2]?.children },
            { id: "1.3.1", name: "node1.3.1", level: 2 },
            { id: "1.3.2", name: "node1.3.2", level: 2 },
            { id: "1.3.3", name: "node1.3.3", level: 2 },
        ]);
    });

    // Dynamic test
    test("should return a flat array of nodes with correct level property", () => {
        expandedIds.add("1");
        expandedIds.add("1.1");
        expandedIds.add("1.2");
        expandedIds.add("1.3");
        const result = getFlattenedTreeData(nodes, expandedIds);
        const expected = generateExpectedFlatTree(nodes, expandedIds);
        expect(result).toEqual(expected);
    });

    // Edge case: tree with no expanded nodes
    test("should return a flat array of root nodes when no nodes are expanded", () => {
        const result = getFlattenedTreeData(nodes, new Set());
        expect(result).toEqual(nodes.map(node => ({ ...node, level: 0 })));
    });
});
