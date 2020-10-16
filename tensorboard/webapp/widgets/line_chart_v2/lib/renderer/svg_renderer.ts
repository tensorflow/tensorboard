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

import {Renderer} from './renderer';
import {LineSpec} from './renderer_types';
import {Paths} from '../types';
import {arePathsEqual} from '../utils';

export class SvgRenderer extends Renderer<SVGPathElement> {
  constructor(private readonly svg: SVGElement) {
    super();
  }

  removeCacheable(cacheable: SVGPathElement): void {
    this.svg.removeChild(cacheable);
  }

  private createPathDString(paths: Paths): string {
    if (!paths.length) {
      return '';
    }

    const dBuilder: string[] = new Array(paths.length / 2);
    dBuilder[0] = `M${paths[0]},${paths[1]}`;
    for (let index = 1; index < paths.length / 2; index++) {
      dBuilder[index] = `L${paths[index * 2]},${paths[index * 2 + 1]}`;
    }
    return dBuilder.join('');
  }

  drawLine(cacheId: string, paths: Paths, spec: LineSpec) {
    if (!paths.length) {
      return;
    }

    super.drawLine(cacheId, paths, spec);

    const renderCache = this.getRenderCache();
    const {color, visible, width, opacity} = spec;
    const cssDisplayValue = visible ? '' : 'none';

    const cache = renderCache.get(cacheId);
    let svgPath = cache?.cacheable;

    if (!svgPath) {
      // Skip if it is not cached and is already invisible.
      if (!visible) return;

      svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svgPath.style.fill = 'none';
      this.svg.appendChild(svgPath);
      renderCache.set(cacheId, {cacheable: svgPath, data: paths});
    } else {
      if (!visible) {
        svgPath.style.display = cssDisplayValue;
        return;
      }
    }

    if (!cache?.data || !arePathsEqual(paths, cache?.data)) {
      const data = this.createPathDString(paths);
      svgPath.setAttribute('d', data);
      renderCache.set(cacheId, {cacheable: svgPath, data: paths});
    }

    svgPath.style.display = cssDisplayValue;
    svgPath.style.stroke = color;
    svgPath.style.opacity = String(opacity ?? 1);
    svgPath.style.strokeWidth = String(width);
  }

  flush() {}
}
