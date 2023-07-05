import type { TreeNode } from "react-native-tree-multi-select";

export const sampleData1: TreeNode[] = [
  {
    id: '1',
    name: 'Parent 1',
    children: [
      {
        id: '1.1',
        name: 'Child 1.1',
      },
      {
        id: '1.2',
        name: 'Child 1.2',
      },
    ],
  },
  {
    id: '2',
    name: 'Parent 2',
    children: [
      {
        id: '2.1',
        name: 'Child 2.1',
        children: [
          {
            id: '2.1.1',
            name: 'Child 2.1.1',
            children: [
              {
                id: '2.1.1.1',
                name: 'Child 2.1.1.1',
                children: [
                  {
                    id: '2.1.1.1.1',
                    name: 'Child 2.1.1.1.1',
                  },
                  {
                    id: '2.1.1.1.2',
                    name: 'Child 2.1.1.1.2',
                  },
                ],
              },
              {
                id: '2.1.1.2',
                name: 'Child 2.1.1.2',
              },
            ],
          },
          {
            id: '2.1.2',
            name: 'Child 2.1.2',
          },
        ],
      },
      {
        id: '2.2',
        name: 'Child 2.2',
        children: [
          {
            id: '2.2.1',
            name: 'Child 2.2.2',
          },
        ],
      },
      {
        id: '2.3',
        name: 'Child 2.3',
      },
    ],
  },
  {
    id: '3',
    name: 'Parent 3',
  },
];