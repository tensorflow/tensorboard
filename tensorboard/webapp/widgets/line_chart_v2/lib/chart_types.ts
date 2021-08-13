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

import {
  DataSeries,
  DataSeriesMetadataMap,
  Dimension,
  Extent,
} from './internal_types';
import {RendererType} from './renderer/renderer_types';
import {ScaleType} from './scale_types';

export interface Chart {
  resize(dim: Dimension): void;

  setMetadata(metadataMap: DataSeriesMetadataMap): void;

  setViewBox(extent: Extent): void;

  setData(data: DataSeries[]): void;

  setXScaleType(type: ScaleType): void;

  setYScaleType(type: ScaleType): void;

  setUseDarkMode(useDarkMode: boolean): void;

  dispose(): void;
}

export interface ChartCallbacks {
  onDrawEnd(): void;
  onContextLost(): void;
}

export interface BaseChartOptions {
  callbacks: ChartCallbacks;
  domDimension: Dimension;
  useDarkMode: boolean;
}

export interface SvgChartOptions extends BaseChartOptions {
  type: RendererType.SVG;
  container: SVGElement;
}

export interface WebGlChartOptions extends BaseChartOptions {
  type: RendererType.WEBGL;
  devicePixelRatio: number;
  container: OffscreenCanvas | HTMLCanvasElement;
}

export type ChartOptions = SvgChartOptions | WebGlChartOptions;
