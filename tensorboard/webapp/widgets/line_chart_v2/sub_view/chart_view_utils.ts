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
import {Dimension, Extent, Scale} from '../lib/public_types';

export interface XDimChartView {
  viewExtent: Extent;
  domDim: Dimension;
  xScale: Scale;
}

export interface YDimChartView {
  viewExtent: Extent;
  domDim: Dimension;
  yScale: Scale;
}

export function getDomX(chartView: XDimChartView, dataCoord: number): number {
  return chartView.xScale.forward(
    chartView.viewExtent.x,
    [0, chartView.domDim.width],
    dataCoord
  );
}

export function getDataX(chartView: XDimChartView, uiCoord: number): number {
  return chartView.xScale.reverse(
    chartView.viewExtent.x,
    [0, chartView.domDim.width],
    uiCoord
  );
}

export function getDomY(chartView: YDimChartView, dataCoord: number): number {
  return chartView.yScale.forward(
    chartView.viewExtent.y,
    [chartView.domDim.height, 0],
    dataCoord
  );
}

export function getDataY(chartView: YDimChartView, uiCoord: number): number {
  return chartView.yScale.reverse(
    chartView.viewExtent.y,
    [chartView.domDim.height, 0],
    uiCoord
  );
}
