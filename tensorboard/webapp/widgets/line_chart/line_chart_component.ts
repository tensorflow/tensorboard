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
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

import {RunColorScale} from '../../types/ui';

import {Point, SeriesData, TooltipColumnSpec} from './line_chart_types';
import {
  AxisRange,
  NoReservedPointFields,
  TooltipPosition,
  TooltipSortingMethod,
  VzLineChart2,
  XAxisType,
  YAxisType,
} from './polymer_interop_types';

@Component({
  selector: 'tb-line-chart',
  template: ``,
  styles: [
    `
      tb-line-chart > vz-line-chart2 {
        height: 100%;
      }
    `,
  ],
  // Angular's emulated view encapsulation prevents component styles from
  // applying to DOM created outside of its template ('vz-line-chart2').
  encapsulation: ViewEncapsulation.None,
})
export class LineChartComponent<
  SeriesMetadata extends {} = {},
  ExtraPointData extends NoReservedPointFields = {}
> implements OnInit, OnChanges {
  private readonly element: VzLineChart2<SeriesMetadata, Point<ExtraPointData>>;

  /**
   * Directly forwarded properties.
   *
   * Note that `xComponentsCreationMethod` is not used. Passing `xType` causes
   * VzLineChart2 to ignore any `xComponentsCreationMethod`.
   *
   * For details on VzLineChart2 properties, see
   * tensorboard/components/vz_line_chart2/vz-line-chart2.ts
   */
  @Input() colorScale?: RunColorScale;
  @Input() defaultXRange?: AxisRange;
  @Input() defaultYRange?: AxisRange;
  @Input() ignoreYOutliers = false;
  @Input() smoothingEnabled = false;
  @Input() smoothingWeight = 0.6;
  @Input()
  tooltipColumns: Array<
    TooltipColumnSpec<SeriesMetadata, Point<ExtraPointData>>
  > = [];
  @Input() tooltipPosition = TooltipPosition.AUTO;
  @Input() tooltipSortingMethod = TooltipSortingMethod.DEFAULT;

  /**
   * Indirectly applied properties, without a 1:1 Polymer mapping.
   */
  @Input()
  seriesDataList: Array<SeriesData<SeriesMetadata, ExtraPointData>> = [];
  @Input() xAxisType: XAxisType = XAxisType.STEP;
  @Input() yAxisType: YAxisType = YAxisType.LINEAR;

  constructor(private readonly host: ElementRef) {
    this.element = document.createElement('vz-line-chart2') as VzLineChart2<
      SeriesMetadata,
      Point<ExtraPointData>
    >;
    this.element.yValueAccessor = (d: Point<ExtraPointData>) => d.y;

    // Must set optional input values here since they won't be part of the
    // ngOnChanges if the parent does not override the value.
    this.element.ignoreYOutliers = this.ignoreYOutliers;
    this.element.smoothingEnabled = this.smoothingEnabled;
    this.element.smoothingWeight = this.smoothingWeight;
    this.element.tooltipColumns = this.tooltipColumns;
    this.element.tooltipPosition = this.tooltipPosition;
    this.element.tooltipSortingMethod = this.tooltipSortingMethod;
    this.element.xType = this.xAxisType;
    this.element.yScaleType = this.yAxisType;
  }

  ngOnInit() {
    this.host.nativeElement.appendChild(this.element);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Record state before changing any values.
    const wasDomainFitToData = this.element.isDataFitToDomain();

    if (changes['colorScale'] && this.colorScale) {
      this.element.colorScale = {scale: this.colorScale};
    }
    if (changes['defaultXRange']) {
      this.element.defaultXRange = this.defaultXRange;
    }
    if (changes['defaultYRange']) {
      this.element.defaultYRange = this.defaultYRange;
    }
    if (changes['ignoreYOutliers']) {
      this.element.ignoreYOutliers = this.ignoreYOutliers;
    }
    if (changes['smoothingEnabled']) {
      this.element.smoothingEnabled = this.smoothingEnabled;
    }
    if (changes['smoothingWeight']) {
      this.element.smoothingWeight = this.smoothingWeight;
    }
    if (changes['tooltipColumns']) {
      this.element.tooltipColumns = this.tooltipColumns;
    }
    if (changes['tooltipPosition']) {
      this.element.tooltipPosition = this.tooltipPosition;
    }
    if (changes['tooltipSortingMethod']) {
      this.element.tooltipSortingMethod = this.tooltipSortingMethod;
    }
    if (changes['xAxisType']) {
      this.element.xType = this.xAxisType;
    }
    if (changes['yAxisType']) {
      this.element.yScaleType = this.yAxisType;
    }

    if (this.shouldUpdateSeriesData(changes)) {
      this.updateSeriesData();
    }

    // Preserve fit-to-domain if the data points may have changed.
    if (
      wasDomainFitToData &&
      (changes['seriesDataList'] ||
        changes['smoothingEnabled'] ||
        (changes['smoothingWeight'] && this.smoothingEnabled))
    ) {
      this.element.resetDomain();
    }

    this.element.redraw();
  }

  private shouldUpdateSeriesData(changes: SimpleChanges) {
    if (!!changes['seriesDataList']) {
      return true;
    }
    // The series data format expected by VzLineChart2 depends on the `xType`.
    const prevXAxisType = changes['xAxisType']
      ? changes['xAxisType'].previousValue
      : null;
    if (
      prevXAxisType &&
      this.isWallTimeBased(prevXAxisType) !==
        this.isWallTimeBased(this.xAxisType)
    ) {
      return true;
    }
    return false;
  }

  private updateSeriesData() {
    for (const seriesData of this.seriesDataList) {
      const {seriesId, metadata, points} = seriesData;
      const formattedPoints = this.formatByXAxisType(points);
      this.element.setSeriesData(seriesId, formattedPoints);
      this.element.setSeriesMetadata(seriesId, metadata);
    }

    const visibleSeries = this.seriesDataList
      .filter((seriesData) => seriesData.visible)
      .map(({seriesId}) => seriesId);
    this.element.setVisibleSeries(visibleSeries);
    this.element.commitChanges();
  }

  private isWallTimeBased(xAxisType: XAxisType) {
    return (
      xAxisType === XAxisType.WALL_TIME || xAxisType === XAxisType.RELATIVE
    );
  }

  private formatByXAxisType(seriesData: Point<ExtraPointData>[]) {
    return seriesData.map((datum) => {
      if (this.isWallTimeBased(this.xAxisType)) {
        return {...datum, wall_time: new Date(datum.x * 1000)};
      }
      return {...datum, step: datum.x};
    });
  }

  resetDomain() {
    this.element.resetDomain();
  }

  redraw() {
    this.element.redraw();
  }
}
