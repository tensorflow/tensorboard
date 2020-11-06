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

import {Polyline, Rect} from '../internal_types';
import {arePolylinesEqual} from '../utils';
import {LinePaintOption, ObjectRenderer} from './renderer_types';

interface LineCacheValue {
  type: 'line';
  data: Polyline;
  dom: SVGPathElement;
}

type CacheValue = LineCacheValue;

export class SvgRenderer implements ObjectRenderer<CacheValue> {
  constructor(private readonly svg: SVGElement) {}

  flush() {
    // Svg can update the DOM right away when creating the object. No need to flush.
  }

  onResize(domRect: Rect): void {
    // Svg viewBox does not need to change with the container size.
  }

  destroyObject(cachedValue: CacheValue): void {
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

  createOrUpdateLineObject(
    cachedLine: CacheValue | null,
    polyline: Polyline,
    paintOpt: LinePaintOption
  ): CacheValue | null {
    const {color, visible, width, opacity} = paintOpt;
    const cssDisplayValue = visible ? '' : 'none';

    let svgPath = cachedLine?.dom;

    if (!svgPath) {
      // Skip if it is not cached and is already invisible.
      if (!visible) return null;

      svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svgPath.style.fill = 'none';
      this.svg.appendChild(svgPath);
    } else {
      if (!visible) {
        svgPath.style.display = cssDisplayValue;
        return cachedLine;
      }
    }

    if (!cachedLine?.data || !arePolylinesEqual(polyline, cachedLine?.data)) {
      const data = this.createPathDString(polyline);
      svgPath.setAttribute('d', data);
    }

    svgPath.style.display = cssDisplayValue;
    svgPath.style.stroke = color;
    svgPath.style.opacity = String(opacity ?? 1);
    svgPath.style.strokeWidth = String(width);

    return {
      type: 'line',
      dom: svgPath,
      data: polyline,
    };
  }
}
