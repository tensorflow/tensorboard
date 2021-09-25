/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
export interface Color {
  name: string;
  lightHex: string;
  darkHex: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: Color[];
  inactive: Color;
}

export const DEFAULT_PALETTE: ColorPalette = {
  id: 'default',
  name: 'Defalt',
  colors: [
    {
      name: 'Slate',
      lightHex: '#425066', // Slate 800
      darkHex: '#8e98a3', // Slate 400
    },
    {
      name: 'Cyan',
      lightHex: '#12b5cb', // Cyan 600
      darkHex: '#12b5cb', // Cyan 600
    },
    {
      name: 'Pink',
      lightHex: '#e52592', // Pink 600
      darkHex: '#e52592', // Pink 600
    },
    {
      name: 'Yellow',
      lightHex: '#f9ab00', // Yellow 600
      darkHex: '#f9ab00', // Yellow 600
    },
    {
      name: 'Purple',
      lightHex: '#9334e6', // Purple 600
      darkHex: '#9334e6', // Purple 600
    },
    {
      name: 'Light Green',
      lightHex: '#7cb342', // Lt green 600
      darkHex: '#7cb342', // Lt green 600
    },
    {
      name: 'Orange',
      lightHex: '#e8710a', // Orange 600
      darkHex: '#e8710a', // Orange 600
    },
  ],
  inactive: {
    name: 'Gray',
    lightHex: '#e0e0e0', // Gray 300
    // Non-mat color. Close yet distinct from #303030, background color of
    // visualizations.
    darkHex: '#3b3b3b',
  },
};
