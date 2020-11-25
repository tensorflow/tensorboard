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
const CHART_COLOR_PALLETE = [
  '#425066', // Slate 1
  '#12b5cb', // Cyan 600
  '#e52592', // Pink 600
  '#f9ab00', // Yellow 600
  '#9334e6', // Purple 600
  '#7cb342', // Lt green 600
  '#e8710a', // Orange 600
];

let colorIndex = 0;

/**
 * Returns hex color for charts.
 */
export function getNextChartColor(): string {
  const color = CHART_COLOR_PALLETE[colorIndex];
  colorIndex = (colorIndex + 1) % CHART_COLOR_PALLETE.length;
  return color;
}
