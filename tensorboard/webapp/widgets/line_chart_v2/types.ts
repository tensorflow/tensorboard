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

import {InjectionToken} from '@angular/core';
import {RendererType} from './lib/public_types';

// Only selectively export types that would be used by the user of the line chart.
export {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  Point,
  RendererType,
  ScaleType,
} from './lib/public_types';
export {TooltipDatum} from './sub_view/line_chart_interactive_view';

/**
 * Line chart by default prefers WEBGL implementation but this flag lets application
 * tweak the default renderer.
 */
export const PREFERRED_RENDERER = new InjectionToken<RendererType>(
  '[Line Chart] Default Preferred Renderer'
);

/**
 * Line chart, when using WEBGL renderer, uses a worker thread when OffscreenCanvas is
 * supported by the browser. This injection token lets application globally disable the
 * worker renderering when the value is true.
 */
export const FORCE_DISABLE_WORKER = new InjectionToken<boolean>(
  '[Line Chart] Disable Worker'
);
