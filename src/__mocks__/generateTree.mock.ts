import { TreeNode, __FlattenedTreeNode__ } from "../types/treeView.types";

export const tree3d2b = [
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
                        "name": "node1.1.1"
                    },
                    {
                        "id": "1.1.2",
                        "name": "node1.1.2"
                    }
                ]
            },
            {
                "id": "1.2",
                "name": "node1.2",
                "children": [
                    {
                        "id": "1.2.1",
                        "name": "node1.2.1"
                    },
                    {
                        "id": "1.2.2",
                        "name": "node1.2.2"
                    }
                ]
            }
        ]
    },
    {
        "id": "2",
        "name": "node2",
        "children": [
            {
                "id": "2.1",
                "name": "node2.1",
                "children": [
                    {
                        "id": "2.1.1",
                        "name": "node2.1.1"
                    },
                    {
                        "id": "2.1.2",
                        "name": "node2.1.2"
                    }
                ]
            },
            {
                "id": "2.2",
                "name": "node2.2",
                "children": [
                    {
                        "id": "2.2.1",
                        "name": "node2.2.1"
                    },
                    {
                        "id": "2.2.2",
                        "name": "node2.2.2"
                    }
                ]
            }
        ]
    }
];

export function generateTree(
    depth: number,
    breadth: number,
    prefix: string = ''
): TreeNode[] {
    let nodes: TreeNode[] = [];

    for (let i = 1; i <= breadth; i++) {
        let node: TreeNode = {
            id: `${prefix}${i}`,
            name: `node${prefix}${i}`
        };

        if (depth > 1) {
            node.children = generateTree(depth - 1, breadth, `${prefix}${i}.`);
        }

        nodes.push(node);
    }

    return nodes;
}

export function generateExpectedFlatTree(
    nodes: TreeNode[],
    expandedIds: Set<string>,
    level: number = 0
): __FlattenedTreeNode__[] {
    let flattened: __FlattenedTreeNode__[] = [];
    for (let node of nodes) {
        flattened.push({ ...node, level: level });
        if (node.children && expandedIds.has(node.id)) {
            flattened = [
                ...flattened,
                ...generateExpectedFlatTree(node.children, expandedIds, level + 1)
            ];
        }
    }
    return flattened;
}

export function createRandomNumberSet() {
    let randomNumbers = new Set<string>();

    while (randomNumbers.size < 10) {
        // Random number between 0 and 99
        let randomNumber = Math.floor(Math.random() * 100);
        randomNumbers.add(randomNumber.toString());
    }

    return randomNumbers;
}
