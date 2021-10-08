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
  name: 'Default',
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

// Default color scheme from Polymer-based TensorBoard.
// A colorblind-friendly palette designed for TensorBoard by Paul Tol
// (https://personal.sron.nl/~pault/).
export const classic: ColorPalette = {
  id: 'classic',
  name: 'Classic',
  colors: [
    {name: 'Orange', lightHex: '#ff7043', darkHex: '#ff7043'},
    {name: 'Blue', lightHex: '#0077bb', darkHex: '#0077bb'},
    {name: 'Red', lightHex: '#cc3311', darkHex: '#cc3311'},
    {name: 'Cyan', lightHex: '#33bbee', darkHex: '#33bbee'},
    {name: 'Magenta', lightHex: '#ee3377', darkHex: '#ee3377'},
    {name: 'Teal', lightHex: '#009988', darkHex: '#009988'},
    {name: 'Gray', lightHex: '#bbbbbb', darkHex: '#bbbbbb'},
  ],
  inactive: {
    name: 'Light gray',
    lightHex: '#e0e0e0', // Gray 300
    darkHex: '#3b3b3b',
  },
};

export const googleStandard: ColorPalette = {
  id: 'goog_standard',
  name: 'Google Standard',
  colors: [
    {name: 'Google Red 500', lightHex: '#db4437', darkHex: '#db4437'},
    {name: 'Deep Orange 400', lightHex: '#ff7043', darkHex: '#ff7043'},
    {name: 'Google Yellow 500', lightHex: '#f4b400', darkHex: '#f4b400'},
    {name: 'Google Green 500', lightHex: '#0f9d58', darkHex: '#0f9d58'},
    {name: 'Teal 700', lightHex: '#00796b', darkHex: '#00796b'},
    {name: 'Cyan 600', lightHex: '#00acc1', darkHex: '#00acc1'},
    {name: 'Google Blue 500', lightHex: '#4285f4', darkHex: '#4285f4'},
    {name: 'Indigo 400', lightHex: '#5c6bc0', darkHex: '#5c6bc0'},
    {name: 'Purple 400', lightHex: '#ab47bc', darkHex: '#ab47bc'},
  ],
  inactive: {
    name: 'Light gray',
    lightHex: '#e0e0e0', // Gray 300
    darkHex: '#3b3b3b',
  },
};

export const classicExtended: ColorPalette = {
  id: 'classic_extended',
  name: 'Classic Extended',
  colors: [
    {name: '#332288', lightHex: '#332288', darkHex: '#332288'},
    {name: '#6699cc', lightHex: '#6699cc', darkHex: '#6699cc'},
    {name: '#88ccee', lightHex: '#88ccee', darkHex: '#88ccee'},
    {name: '#44aa99', lightHex: '#44aa99', darkHex: '#44aa99'},
    {name: '#117733', lightHex: '#117733', darkHex: '#117733'},
    {name: '#999933', lightHex: '#999933', darkHex: '#999933'},
    {name: '#ddcc77', lightHex: '#ddcc77', darkHex: '#ddcc77'},
    {name: '#cc6677', lightHex: '#cc6677', darkHex: '#cc6677'},
    {name: '#aa4466', lightHex: '#aa4466', darkHex: '#aa4466'},
    {name: '#882255', lightHex: '#882255', darkHex: '#882255'},
    {name: '#661100', lightHex: '#661100', darkHex: '#661100'},
    {name: '#aa4499', lightHex: '#aa4499', darkHex: '#aa4499'},
  ],
  inactive: {
    name: 'Light gray',
    lightHex: '#e0e0e0', // Gray 300
    darkHex: '#3b3b3b',
  },
};

export const palettes = new Map<string, ColorPalette>([
  [DEFAULT_PALETTE.id, DEFAULT_PALETTE],
  [classic.id, classic],
  [classicExtended.id, classicExtended],
  [googleStandard.id, googleStandard],
]);
