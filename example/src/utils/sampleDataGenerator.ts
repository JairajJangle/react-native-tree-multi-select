interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

// This function generates a TreeNode with a random number of children.
function generateNode(id: string, level: number, maxLevel: number, maxChildren: number): TreeNode {
    const node: TreeNode = {
        id: id,
        name: `Node ${id}`,
    };

    if (level < maxLevel) {
        const numChildren = Math.floor(Math.random() * maxChildren) + 1; // generates a random number between 1 and maxChildren
        node.children = [];
        for (let i = 1; i <= numChildren; i++) {
            node.children.push(generateNode(`${id}.${i}`, level + 1, maxLevel, maxChildren));
        }
    }

    return node;
}

// This function generates a list of TreeNodes
export function generateTreeList(num: number, maxLevel: number, maxChildren: number): TreeNode[] {
    let result: TreeNode[] = [];
    for (let i = 1; i <= num; i++) {
        result.push(generateNode(`${i}`, 1, maxLevel, maxChildren));
    }
    return result;
}  