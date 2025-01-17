import * as React from 'react';

import SmallDataScreen from './screens/SmallDataScreen';
import { ShowcaseApp } from '@gorhom/showcase-template';
import {
  ShowcaseExampleScreenSectionType
} from '@gorhom/showcase-template/lib/typescript/types';
import MediumDataScreen from './screens/MediumDataScreen';
import LargeDataScreen from './screens/LargeDataScreen';
import CustomCheckboxScreen from './screens/CustomCheckboxScreen';
import CustomArrowScreen from './screens/CustomArrowScreen';
import CustomNodeRowViewScreen from './screens/CustomNodeRowViewScreen';
import {
  OnlyToParentSmallDataScreen,
  OnlyToChildrenSmallDataScreen,
  NeitherToChildrenNorToParentSmallDataScreen
} from './screens/SelectionPropagationScreens';
import packageJson from '../../package.json';
import { TwoTreeViewsScreen } from "./screens/TwoTreeViewsScreen";
import CustomNodeID from './screens/CustomNodeIDScreen';

const data: ShowcaseExampleScreenSectionType[] = [
  {
    title: 'Default UI',
    data: [
      {
        name: 'Small Data',
        slug: 'small-data',
        getScreen: () => SmallDataScreen,
      },
      {
        name: 'Medium Data',
        slug: 'medium-data',
        getScreen: () => MediumDataScreen,
      },
      {
        name: 'Large Data',
        slug: 'large-data',
        getScreen: () => LargeDataScreen,
      }
    ],
  },
  {
    title: 'Customizations',
    data: [
      {
        name: 'Custom Checkbox',
        slug: 'custom-checkbox',
        getScreen: () => CustomCheckboxScreen,
      },
      {
        name: 'Custom Arrow',
        slug: 'custom-arrow',
        getScreen: () => CustomArrowScreen,
      },
      {
        name: 'Custom Row Item',
        slug: 'custom-row-item',
        getScreen: () => CustomNodeRowViewScreen,
      },
      {
        name: 'Custom Node ID',
        slug: 'custom-node-id',
        getScreen: () => CustomNodeID
      }
    ],
  },
  {
    title: 'Controlled Selection Propagation',
    data: [
      {
        name: 'Only to parent',
        slug: 'only-to-parent',
        getScreen: () => OnlyToParentSmallDataScreen,
      },
      {
        name: 'Only to children',
        slug: 'only-to-children',
        getScreen: () => OnlyToChildrenSmallDataScreen,
      },
      {
        name: 'Neither to children nor to parents',
        slug: 'neither-children-nor-parent',
        getScreen: () => NeitherToChildrenNorToParentSmallDataScreen,
      },
    ],
  },
  {
    title: 'Multiple Tree Views',
    data: [
      {
        name: 'Two Tree Views',
        slug: 'two-tree-views',
        getScreen: () => TwoTreeViewsScreen,
      },
    ],
  },
];

export default function App() {
  return (
    <ShowcaseApp
      version={packageJson.version}
      name="react-native-tree-multi-select"
      description="⚡️Super-fast tree view with multi-selection capabilities, using checkboxes and search filtering"
      author={{
        username: '@JairajJangle',
        url: 'https://github.com/JairajJangle',
      }}
      data={data}
    />
  );
}
