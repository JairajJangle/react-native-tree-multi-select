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
    // =====================
    // POSITION: "above"
    // =====================
    describe("position: \"above\"", () => {
        it("moves a leaf node above a root sibling", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "C", "A", "above");

            expect(result[0]!.id).toBe("C");
            expect(result[1]!.id).toBe("A");
            expect(result[2]!.id).toBe("B");
            expect(result.length).toBe(3);
        });

        it("moves a deep node above another deep node", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A1b", "B1", "above");

            const B = findNode(result, "B")!;
            expect(B.children![0]!.id).toBe("A1b");
            expect(B.children![1]!.id).toBe("B1");
            expect(B.children![2]!.id).toBe("B2");

            // A1b should be gone from A1
            const A1 = findNode(result, "A1")!;
            expect(A1.children!.length).toBe(1);
            expect(A1.children![0]!.id).toBe("A1a");
        });

        it("moves a parent node (with children) above a root node", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A1", "B", "above");

            expect(result[0]!.id).toBe("A");
            expect(result[1]!.id).toBe("A1");
            expect(result[1]!.children!.length).toBe(2); // A1a, A1b preserved
            expect(result[2]!.id).toBe("B");

            // A should no longer have A1 as a child
            const A = result[0]!;
            expect(A.children!.length).toBe(1);
            expect(A.children![0]!.id).toBe("A2");
        });
    });

    // =====================
    // POSITION: "below"
    // =====================
    describe("position: \"below\"", () => {
        it("moves a leaf node below a root node", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "C", "A", "below");

            expect(result[0]!.id).toBe("A");
            expect(result[1]!.id).toBe("C");
            expect(result[2]!.id).toBe("B");
        });

        it("moves a node below the last root node", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A2", "C", "below");

            expect(result.length).toBe(4); // A, B, C, A2 at root
            expect(result[3]!.id).toBe("A2");
        });

        it("moves a deep child below another deep child", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "B2", "A1a", "below");

            const A1 = findNode(result, "A1")!;
            expect(A1.children![0]!.id).toBe("A1a");
            expect(A1.children![1]!.id).toBe("B2");
            expect(A1.children![2]!.id).toBe("A1b");

            // B should have lost B2
            const B = findNode(result, "B")!;
            expect(B.children!.length).toBe(1);
            expect(B.children![0]!.id).toBe("B1");
        });
    });

    // =====================
    // POSITION: "inside"
    // =====================
    describe("position: \"inside\"", () => {
        it("moves a node inside a leaf node (creates children)", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "B1", "C", "inside");

            const C = findNode(result, "C")!;
            expect(C.children).toBeDefined();
            expect(C.children!.length).toBe(1);
            expect(C.children![0]!.id).toBe("B1");
        });

        it("moves a node inside a parent (prepends as first child)", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "C", "B", "inside");

            const B = findNode(result, "B")!;
            expect(B.children![0]!.id).toBe("C");
            expect(B.children![1]!.id).toBe("B1");
            expect(B.children![2]!.id).toBe("B2");

            // C removed from root
            expect(result.length).toBe(2);
        });

        it("moves a subtree inside another node, preserving the subtree's children", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A1", "C", "inside");

            const C = findNode(result, "C")!;
            expect(C.children!.length).toBe(1);
            expect(C.children![0]!.id).toBe("A1");
            expect(C.children![0]!.children!.length).toBe(2);
            expect(C.children![0]!.children![0]!.id).toBe("A1a");
            expect(C.children![0]!.children![1]!.id).toBe("A1b");
        });
    });

    // =====================
    // EDGE CASES
    // =====================
    describe("edge cases", () => {
        it("returns original data when dragging onto self", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A", "A", "above");
            expect(result).toBe(tree); // Same reference = no-op
        });

        it("does not mutate the original tree", () => {
            const tree = makeTree();
            const originalIds = collectIds(tree);

            moveTreeNode(tree, "C", "A", "above");

            const afterIds = collectIds(tree);
            expect(afterIds).toEqual(originalIds);
        });

        it("preserves all node IDs after move (no data loss)", () => {
            const tree = makeTree();
            const originalIds = new Set(collectIds(tree));

            const result = moveTreeNode(tree, "A1", "C", "inside");
            const resultIds = new Set(collectIds(result));

            expect(resultIds).toEqual(originalIds);
        });

        it("returns original data when dragged node ID doesn't exist", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "NONEXISTENT", "A", "above");
            expect(result).toBe(tree);
        });

        it("returns original data when target node ID doesn't exist", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A", "NONEXISTENT", "above");
            expect(result).toBe(tree);
        });

        it("cleans up empty children array when last child is removed", () => {
            // Tree with single child: X -> X1
            const tree: TreeNode<string>[] = [
                { id: "X", name: "X", children: [{ id: "X1", name: "X1" }] },
                { id: "Y", name: "Y" },
            ];

            const result = moveTreeNode(tree, "X1", "Y", "below");

            const X = findNode(result, "X")!;
            expect(X.children).toBeUndefined();
        });

        it("handles moving first child to a different position", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A1a", "A1b", "below");

            const A1 = findNode(result, "A1")!;
            expect(A1.children![0]!.id).toBe("A1b");
            expect(A1.children![1]!.id).toBe("A1a");
        });

        it("handles single-node tree", () => {
            const tree: TreeNode<string>[] = [{ id: "only", name: "only" }];
            const result = moveTreeNode(tree, "only", "only", "inside");
            expect(result).toBe(tree); // Self-drop is no-op
        });

        it("handles moving root node to inside another root node", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A", "B", "inside");

            expect(result.length).toBe(2); // B and C at root
            const B = findNode(result, "B")!;
            expect(B.children![0]!.id).toBe("A");
            expect(B.children![0]!.children!.length).toBe(2); // A1, A2 preserved
        });
    });

    // =====================
    // NUMERIC IDs
    // =====================
    describe("numeric IDs", () => {
        it("works with number-type IDs", () => {
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

    // =====================
    // COMPLEX MOVES
    // =====================
    describe("complex multi-level moves", () => {
        it("moves a deeply nested node to root level", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "A1a", "C", "below");

            expect(result.length).toBe(4);
            expect(result[3]!.id).toBe("A1a");

            // A1 should still have A1b
            const A1 = findNode(result, "A1")!;
            expect(A1.children!.length).toBe(1);
            expect(A1.children![0]!.id).toBe("A1b");
        });

        it("moves a root node to become a deeply nested child", () => {
            const tree = makeTree();
            const result = moveTreeNode(tree, "C", "A1a", "inside");

            expect(result.length).toBe(2); // A, B at root
            const A1a = findNode(result, "A1a")!;
            expect(A1a.children!.length).toBe(1);
            expect(A1a.children![0]!.id).toBe("C");
        });

        it("preserves all IDs through a chain of moves", () => {
            let tree = makeTree();
            const originalIds = new Set(collectIds(tree));

            // Move C inside A1
            tree = moveTreeNode(tree, "C", "A1", "inside");
            // Move B1 above A
            tree = moveTreeNode(tree, "B1", "A", "above");
            // Move A2 below B
            tree = moveTreeNode(tree, "A2", "B", "below");

            const finalIds = new Set(collectIds(tree));
            expect(finalIds).toEqual(originalIds);
        });
    });
});
