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

import {BaseCachedObjectRenderer} from './renderer';
import {LinePaintOption} from './renderer_types';
import {Polyline} from '../types';
import {arePolylinesEqual} from '../utils';

interface LineCache {
  type: 'line';
  data: Polyline;
  dom: SVGPathElement;
}

export class SvgRenderer extends BaseCachedObjectRenderer<LineCache> {
  constructor(private readonly svg: SVGElement) {
    super();
  }

  removeRenderObject(cachedValue: LineCache): void {
    this.svg.removeChild(cachedValue.dom);
  }

  private createPathDString(polyline: Polyline): string {
    if (!polyline.length) {
      return '';
    }

    const dBuilder: string[] = new Array(polyline.length / 2);
    dBuilder[0] = `M${polyline[0]},${polyline[1]}`;
    for (let index = 1; index < polyline.length / 2; index++) {
      dBuilder[index] = `L${polyline[index * 2]},${polyline[index * 2 + 1]}`;
    }
    return dBuilder.join('');
  }

  drawLine(cacheId: string, polyline: Polyline, paintOpt: LinePaintOption) {
    if (!polyline.length) {
      return;
    }

    super.drawLine(cacheId, polyline, paintOpt);

    const {color, visible, width, opacity} = paintOpt;
    const cssDisplayValue = visible ? '' : 'none';

    const cachedValue = this.getCachedValue(cacheId);
    let svgPath = cachedValue?.dom;

    if (!svgPath) {
      // Skip if it is not cached and is already invisible.
      if (!visible) return;

      svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svgPath.style.fill = 'none';
      this.svg.appendChild(svgPath);
      this.setCacheObject(cacheId, {
        type: 'line',
        dom: svgPath,
        data: polyline,
      });
    } else {
      if (!visible) {
        svgPath.style.display = cssDisplayValue;
        return;
      }
    }

    if (!cachedValue?.data || !arePolylinesEqual(polyline, cachedValue?.data)) {
      const data = this.createPathDString(polyline);
      svgPath.setAttribute('d', data);
      this.setCacheObject(cacheId, {
        type: 'line',
        dom: svgPath,
        data: polyline,
      });
    }

    svgPath.style.display = cssDisplayValue;
    svgPath.style.stroke = color;
    svgPath.style.opacity = String(opacity ?? 1);
    svgPath.style.strokeWidth = String(width);
  }

  flush() {}
}
