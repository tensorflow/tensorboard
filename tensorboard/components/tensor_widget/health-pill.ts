/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

import {isIntegerDType} from './dtype-helper';
import {BaseTensorHealthPill, IntOrFloatTensorHealthPill} from './health-pill-types';
import {numericValueToString} from './numeric-helper';
import {TensorSpec} from './types';

/** An entry of health pill in the GUI. */
export interface HealthPillEntry {
  backgroundColor: string;
  label: string;
  key: 'nanCount' | 'negativeInfinityCount' | 'negativeCount' | 'zeroCount' |
       'positiveCount' | 'positiveInfinityCount';
}

/** All types of of numeric values in health pills. */
export const healthPillEntries: HealthPillEntry[] = [
  {
    backgroundColor: '#CC2F2C',
    label: 'NaN',
    key: 'nanCount'
  },
  {
    backgroundColor: '#FF8D00',
    label: '-∞',
    key: 'negativeInfinityCount'
  },
  {
    backgroundColor: '#EAEAEA',
    label: '-',
    key: 'negativeCount'
  },
  {
    backgroundColor: '#A5A5A5',
    label: '0',
    key: 'zeroCount'
  },
  {
    backgroundColor: '#262626',
    label: '+',
    key: 'positiveCount'
  },
  {
    backgroundColor: '#003ED4',
    label: '+∞',
    key: 'positiveInfinityCount'
  },
];

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Draw the health pill in a designated div element
 * @param element The element in which the health pill will be rendered.
 * @param tensorSpec The basic immutable specs of the tensor, including its
 *  shape.
 * @param data Health-pill data to be rendered.
 */
export async function drawHealthPill(
  element: HTMLDivElement, tensorSpec: TensorSpec,
  data: BaseTensorHealthPill): Promise<void> {
  if (!(tensorSpec.dtype.startsWith('int') ||
        tensorSpec.dtype.startsWith('uint') ||
        tensorSpec.dtype.startsWith('float'))) {
    throw new Error(
        `drawHealthPill() is not implemented for dtype ` +
        `${tensorSpec.dtype} yet`);
  }

  const pillData = data as IntOrFloatTensorHealthPill;

  const box = element.getBoundingClientRect();
  const boxWidth = box.right - box.left;
  const boxHeight = box.bottom - box.top;
  const healthPillWidth = boxWidth * 0.8;
  const healthPillHeight = boxHeight * 0.4;
  const healthPillYOffset = 0;

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('z-index', '1000');
  const healthPillGroup = document.createElementNS(SVG_NAMESPACE, 'g');
  healthPillGroup.classList.add('health-pill');

  // Define the gradient for the health pill.
  const healthPillDefs = document.createElementNS(SVG_NAMESPACE, 'defs');
  healthPillGroup.appendChild(healthPillDefs);
  const healthPillGradient =
      document.createElementNS(SVG_NAMESPACE, 'linearGradient');

  const healthPillGradientId = `health-pill-gradient-${generateUUID()}`;
  healthPillGradient.setAttribute('id', healthPillGradientId);

  let cumulativeCount = 0;
  let previousOffset = '0%';
  healthPillEntries.forEach(entry => {
    const typeCount = pillData[entry.key];
    if (typeCount == null || typeCount === 0) {
      // Skip nonexistent category.
      return;
    }
    cumulativeCount += typeCount;
    // Create a color interval using 2 stop elements.
    const stopElement0 = document.createElementNS(SVG_NAMESPACE, 'stop');
    stopElement0.setAttribute('offset', previousOffset);
    stopElement0.setAttribute('stop-color', entry.backgroundColor);
    healthPillGradient.appendChild(stopElement0);

    const stopElement1 = document.createElementNS(SVG_NAMESPACE, 'stop');
    const percent = `${cumulativeCount * 100 / data.elementCount}%`;
    stopElement1.setAttribute('offset', percent);
    stopElement1.setAttribute('stop-color', entry.backgroundColor);
    healthPillGradient.appendChild(stopElement1);
    previousOffset = percent;
  });
  healthPillDefs.appendChild(healthPillGradient);

  const rect = document.createElementNS(SVG_NAMESPACE, 'rect');
  rect.setAttribute('fill', 'url(#' + healthPillGradientId + ')');
  rect.setAttribute('width', String(healthPillWidth));
  rect.setAttribute('height', String(healthPillHeight));
  rect.setAttribute('x', String(0));
  rect.setAttribute('y', String(healthPillYOffset));
  rect.setAttribute('rx', '7');  // Radius of rounded corners.
  healthPillGroup.appendChild(rect);

  // Show a title with specific counts on hover.
  const titleSvg = document.createElementNS(SVG_NAMESPACE, 'title');
  titleSvg.textContent = formatBreakdownText(pillData);
  titleSvg.setAttribute('font', 'bold 10px monospace;');
  healthPillGroup.appendChild(titleSvg);

  // Center this health pill just right above the node for the op.
  healthPillGroup.setAttribute('transform', `translate(0, ${boxHeight * 0.1})`);

  svg.appendChild(healthPillGroup);

  const text = document.createElementNS(SVG_NAMESPACE, 'text');
  const minMaxDecimalPlaces = isIntegerDType(tensorSpec.dtype) ? 0 : 2;
  const minMaxFormat = isIntegerDType(tensorSpec.dtype) ? 'fixed': undefined;
  text.textContent =
      `${numericValueToString(
          pillData.minimum, minMaxDecimalPlaces, minMaxFormat)}~` +
      `${numericValueToString(
          pillData.maximum, minMaxDecimalPlaces, minMaxFormat)}`;
  if (pillData.mean != null) {
    text.textContent += ` | mean:${numericValueToString(pillData.mean)}`;
  }
  if (pillData.stdDev != null) {
    text.textContent += ` | std:${numericValueToString(pillData.stdDev)}`;
  }
  text.setAttribute('fill', 'rgb(96, 96, 96)');
  text.setAttribute('transform', `translate(0, ${boxHeight * 0.8})`);
  svg.appendChild(text);

  element.appendChild(svg);
}

/**
 * Generate a multi-line text that summarizes the types of numeric values
 * in a tensor.
 * The types are categories such as NaN, -Infinity, zero etc.
 * @param pillData Health-pill data.
 * @return The formatted multi-line string.
 */
export function formatBreakdownText(
    pillData: IntOrFloatTensorHealthPill): string {
  let str = '';

  str += '-------------------------------\n';
  if (pillData.zeroCount > 0) {
    str += `#(zero): ${pillData.zeroCount}\n`;
  }
  if (pillData.negativeCount > 0) {
    str += `#(-): ${pillData.negativeCount}\n`;
  }
  if (pillData.positiveCount > 0) {
    str += `#(+): ${pillData.positiveCount}\n`;
  }
  if (pillData.negativeInfinityCount > 0) {
    str += `#(-∞): ${pillData.negativeInfinityCount}\n`;
  }
  if (pillData.positiveInfinityCount > 0) {
    str += `#(+∞): ${pillData.positiveInfinityCount}\n`;
  }
  if (pillData.nanCount > 0) {
    str += `#(NaN): ${pillData.nanCount}\n`;
  }
  str += '-------------------------------\n';
  str += `#(total): ${pillData.elementCount}`;
  return str;
}

function generateUUID(): string {
  // Public Domain/MIT
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' &&
      typeof performance.now === 'function') {
    d += performance.now();  // Use high-precision timer if available.
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // tslint:disable:no-bitwise
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
