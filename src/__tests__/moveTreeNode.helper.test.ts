import { moveTreeNode } from "../helpers/moveTreeNode.helper";
import type { TreeNode } from "../types/treeView.types";

/**
 * Helper tree for most tests:
 *
 *  A
 *  ├── A1
 *  │   ├── A1a
 *  │   └── A1b
 *  └── A2
 *  B
 *  ├── B1
 *  └── B2
 *  C (leaf)
 */
function makeTree(): TreeNode<string>[] {
    return [
        {
            id: "A", name: "A", children: [
                {
                    id: "A1", name: "A1", children: [
                        { id: "A1a", name: "A1a" },
                        { id: "A1b", name: "A1b" },
                    ]
                },
                { id: "A2", name: "A2" },
            ]
        },
        {
            id: "B", name: "B", children: [
                { id: "B1", name: "B1" },
                { id: "B2", name: "B2" },
            ]
        },
        { id: "C", name: "C" },
    ];
}

/** Collect all node IDs in DFS order */
function collectIds<ID>(nodes: TreeNode<ID>[]): ID[] {
    const ids: ID[] = [];
    for (const n of nodes) {
        ids.push(n.id);
        if (n.children) ids.push(...collectIds(n.children));
    }
    return ids;
}

/** Find a node by ID in tree */
function findNode<ID>(nodes: TreeNode<ID>[], id: ID): TreeNode<ID> | null {
    for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
            const found = findNode(n.children, id);
            if (found) return found;
        }
    }
    return null;
}

describe("moveTreeNode", () => {
    describe("given various node pairs", () => {
        it("when moving above target, then node is inserted before target at correct level", () => {
            // Leaf node above a root sibling
            const tree1 = makeTree();
            const result1 = moveTreeNode(tree1, "C", "A", "above");

            expect(result1[0]!.id).toBe("C");
            expect(result1[1]!.id).toBe("A");
            expect(result1[2]!.id).toBe("B");
            expect(result1.length).toBe(3);

            // Deep node above another deep node
            const tree2 = makeTree();
            const result2 = moveTreeNode(tree2, "A1b", "B1", "above");

            const B2 = findNode(result2, "B")!;
            expect(B2.children![0]!.id).toBe("A1b");
            expect(B2.children![1]!.id).toBe("B1");
            expect(B2.children![2]!.id).toBe("B2");

            // A1b should be gone from A1
            const A1_2 = findNode(result2, "A1")!;
            expect(A1_2.children!.length).toBe(1);
            expect(A1_2.children![0]!.id).toBe("A1a");

            // Parent node (with children) above a root node
            const tree3 = makeTree();
            const result3 = moveTreeNode(tree3, "A1", "B", "above");

            expect(result3[0]!.id).toBe("A");
            expect(result3[1]!.id).toBe("A1");
            expect(result3[1]!.children!.length).toBe(2); // A1a, A1b preserved
            expect(result3[2]!.id).toBe("B");

            // A should no longer have A1 as a child
            const A3 = result3[0]!;
            expect(A3.children!.length).toBe(1);
            expect(A3.children![0]!.id).toBe("A2");
        });

        it("when moving below target, then node is inserted after target at correct level", () => {
            // Leaf node below a root node
            const tree1 = makeTree();
            const result1 = moveTreeNode(tree1, "C", "A", "below");

            expect(result1[0]!.id).toBe("A");
            expect(result1[1]!.id).toBe("C");
            expect(result1[2]!.id).toBe("B");

            // Node below the last root node
            const tree2 = makeTree();
            const result2 = moveTreeNode(tree2, "A2", "C", "below");

            expect(result2.length).toBe(4); // A, B, C, A2 at root
            expect(result2[3]!.id).toBe("A2");

            // Deep child below another deep child
            const tree3 = makeTree();
            const result3 = moveTreeNode(tree3, "B2", "A1a", "below");

            const A1_3 = findNode(result3, "A1")!;
            expect(A1_3.children![0]!.id).toBe("A1a");
            expect(A1_3.children![1]!.id).toBe("B2");
            expect(A1_3.children![2]!.id).toBe("A1b");

            // B should have lost B2
            const B3 = findNode(result3, "B")!;
            expect(B3.children!.length).toBe(1);
            expect(B3.children![0]!.id).toBe("B1");
        });

        it("when moving inside target, then node becomes first child of target", () => {
            // Move inside a leaf node (creates children)
            const tree1 = makeTree();
            const result1 = moveTreeNode(tree1, "B1", "C", "inside");

            const C1 = findNode(result1, "C")!;
            expect(C1.children).toBeDefined();
            expect(C1.children!.length).toBe(1);
            expect(C1.children![0]!.id).toBe("B1");

            // Move inside a parent (prepends as first child)
            const tree2 = makeTree();
            const result2 = moveTreeNode(tree2, "C", "B", "inside");

            const B2 = findNode(result2, "B")!;
            expect(B2.children![0]!.id).toBe("C");
            expect(B2.children![1]!.id).toBe("B1");
            expect(B2.children![2]!.id).toBe("B2");

            // C removed from root
            expect(result2.length).toBe(2);

            // Move a subtree inside another node, preserving the subtree's children
            const tree3 = makeTree();
            const result3 = moveTreeNode(tree3, "A1", "C", "inside");

            const C3 = findNode(result3, "C")!;
            expect(C3.children!.length).toBe(1);
            expect(C3.children![0]!.id).toBe("A1");
            expect(C3.children![0]!.children!.length).toBe(2);
            expect(C3.children![0]!.children![0]!.id).toBe("A1a");
            expect(C3.children![0]!.children![1]!.id).toBe("A1b");

            // Move root node inside another root node
            const tree4 = makeTree();
            const result4 = moveTreeNode(tree4, "A", "B", "inside");

            expect(result4.length).toBe(2); // B and C at root
            const B4 = findNode(result4, "B")!;
            expect(B4.children![0]!.id).toBe("A");
            expect(B4.children![0]!.children!.length).toBe(2); // A1, A2 preserved
        });
    });

    describe("given ancestor-descendant pairs or invalid IDs", () => {
        it("when attempting to create cycles, then original tree is returned unchanged", () => {
            const tree = makeTree();

            // Self-drop is a no-op
            const selfDrop = moveTreeNode(tree, "A", "A", "above");
            expect(selfDrop).toBe(tree);

            // Moving a parent into its own child would create a cycle
            const parentToChild = moveTreeNode(tree, "A1", "A1a", "inside");
            expect(parentToChild).toBe(tree);

            // Moving a parent above its own descendant would create a cycle
            const parentAboveDesc = moveTreeNode(tree, "A1", "A1b", "above");
            expect(parentAboveDesc).toBe(tree);

            // Moving a root into its own grandchild would create a cycle
            const rootToGrandchild = moveTreeNode(tree, "A", "A1a", "inside");
            expect(rootToGrandchild).toBe(tree);
        });

        it("when moving with invalid node IDs, then original tree is returned", () => {
            const tree = makeTree();

            // Nonexistent dragged node ID
            const noSource = moveTreeNode(tree, "NONEXISTENT", "A", "above");
            expect(noSource).toBe(tree);

            // Nonexistent target node ID
            const noTarget = moveTreeNode(tree, "A", "NONEXISTENT", "above");
            expect(noTarget).toBe(tree);
        });
    });

    describe("given a move operation", () => {
        it("when complete, then original tree is not mutated and all node IDs are preserved", () => {
            const tree = makeTree();
            const originalIds = collectIds(tree);

            // Perform a move and verify original is untouched
            moveTreeNode(tree, "C", "A", "above");
            const afterIds = collectIds(tree);
            expect(afterIds).toEqual(originalIds);

            // Verify all IDs are preserved in the result (no data loss)
            const originalIdSet = new Set(collectIds(tree));
            const result = moveTreeNode(tree, "A1", "C", "inside");
            const resultIdSet = new Set(collectIds(result));
            expect(resultIdSet).toEqual(originalIdSet);
        });
    });

    describe("given edge case trees", () => {
        it("when moving nodes, then tree structure is correctly maintained", () => {
            // Empty children cleanup when last child is removed
            const singleChildTree: TreeNode<string>[] = [
                { id: "X", name: "X", children: [{ id: "X1", name: "X1" }] },
                { id: "Y", name: "Y" },
            ];

            const cleanupResult = moveTreeNode(singleChildTree, "X1", "Y", "below");
            const X = findNode(cleanupResult, "X")!;
            expect(X.children).toBeUndefined();

            // Moving first child to reorder within same parent
            const tree = makeTree();
            const reorderResult = moveTreeNode(tree, "A1a", "A1b", "below");

            const A1 = findNode(reorderResult, "A1")!;
            expect(A1.children![0]!.id).toBe("A1b");
            expect(A1.children![1]!.id).toBe("A1a");

            // Single-node tree: self-drop is no-op
            const singleTree: TreeNode<string>[] = [{ id: "only", name: "only" }];
            const singleResult = moveTreeNode(singleTree, "only", "only", "inside");
            expect(singleResult).toBe(singleTree);
        });
    });

    describe("given numeric IDs", () => {
        it("when moving nodes, then number-type IDs work correctly", () => {
            const tree: TreeNode<number>[] = [
                {
                    id: 1, name: "One", children: [
                        { id: 11, name: "OneOne" },
                        { id: 12, name: "OneTwo" },
                    ]
                },
                { id: 2, name: "Two" },
                { id: 3, name: "Three" },
            ];

            const result = moveTreeNode(tree, 3, 1, "inside");

            const one = findNode(result, 1)!;
            expect(one.children![0]!.id).toBe(3);
            expect(one.children![1]!.id).toBe(11);
            expect(result.length).toBe(2);
        });
    });

    describe("given multi-level trees", () => {
        it("when performing cross-level moves, then nodes relocate correctly", () => {
            // Deeply nested node to root level
            const tree1 = makeTree();
            const result1 = moveTreeNode(tree1, "A1a", "C", "below");

            expect(result1.length).toBe(4);
            expect(result1[3]!.id).toBe("A1a");

            // A1 should still have A1b
            const A1_1 = findNode(result1, "A1")!;
            expect(A1_1.children!.length).toBe(1);
            expect(A1_1.children![0]!.id).toBe("A1b");

            // Root node to become a deeply nested child
            const tree2 = makeTree();
            const result2 = moveTreeNode(tree2, "C", "A1a", "inside");

            expect(result2.length).toBe(2); // A, B at root
            const A1a_2 = findNode(result2, "A1a")!;
            expect(A1a_2.children!.length).toBe(1);
            expect(A1a_2.children![0]!.id).toBe("C");

            // Chain of moves preserves all IDs
            let tree3 = makeTree();
            const originalIds = new Set(collectIds(tree3));

            tree3 = moveTreeNode(tree3, "C", "A1", "inside");
            tree3 = moveTreeNode(tree3, "B1", "A", "above");
            tree3 = moveTreeNode(tree3, "A2", "B", "below");

            const finalIds = new Set(collectIds(tree3));
            expect(finalIds).toEqual(originalIds);
        });
    });
});
