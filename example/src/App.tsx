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
    ],
  },
];

export default function App() {
  return (
    <ShowcaseApp
      version="1.0.0"
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