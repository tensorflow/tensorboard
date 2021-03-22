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
import {ComponentType} from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import {
  formatNumber,
  formatRelativeTimeInMs,
} from '../../../util/value_formatter';
import {LineChartComponent} from '../../../widgets/line_chart/line_chart_component';
import {
  EvaluationPoint,
  Point,
  SeriesData,
  TooltipColumnSpec,
  XAxisType as ChartXAxisType,
  YAxisType,
} from '../../../widgets/line_chart/line_chart_types';
import {relativeTimeFormatter} from '../../../widgets/line_chart_v2/lib/formatter';
import {LineChartComponent as NewLineChartComponent} from '../../../widgets/line_chart_v2/line_chart_component';
import {
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {ScalarStepDatum} from '../../data_source';
import {TooltipSort, XAxisType} from '../../types';
import {
  ScalarCardDataSeries,
  ScalarCardSeriesMetadata,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';

const RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = 50;

interface Metadata {
  displayName: string;
}

type StepDatum = ScalarStepDatum;

export type SeriesPoint = Point<StepDatum>;

export type LegacySeriesDataList = Array<SeriesData<Metadata, StepDatum>>;

export type ScalarChartEvalPoint = EvaluationPoint<Metadata, StepDatum>;

export type TooltipColumns = Array<TooltipColumnSpec<Metadata, StepDatum>>;

type ScalarTooltipDatum = TooltipDatum<
  ScalarCardSeriesMetadata & {
    distSqToCursor: number;
    closest: boolean;
  }
>;

const DEFAULT_TOOLTIP_COLUMNS: TooltipColumns = [
  {
    title: 'Name',
    evaluate: (d: ScalarChartEvalPoint) => {
      return d.dataset.metadata().meta.displayName;
    },
  },
  {
    title: 'Value',
    evaluate: (d: ScalarChartEvalPoint) => {
      return formatNumber(d.datum.y);
    },
  },
  {
    title: 'Step',
    evaluate: (d: ScalarChartEvalPoint) => {
      return d.datum.step.toString();
    },
  },
  {
    title: 'Time',
    evaluate: (d: ScalarChartEvalPoint) => {
      // sec to ms.
      const date = new Date(d.datum.wallTime * 1000);
      return date.toLocaleString();
    },
  },
  {
    title: 'Relative',
    evaluate: (d: ScalarChartEvalPoint) => {
      const data = d.dataset.data();
      const firstTime = data.length > 0 ? data[0].wallTime : 0;
      const relativeTimeInMs = (d.datum.wallTime - firstTime) * 1000;
      return formatRelativeTimeInMs(relativeTimeInMs);
    },
  },
];

@Component({
  selector: 'scalar-card-component',
  templateUrl: 'scalar_card_component.ng.html',
  styleUrls: ['scalar_card_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardComponent<Downloader> {
  readonly RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS;
  readonly DataLoadState = DataLoadState;
  readonly RendererType = RendererType;

  @Input() cardId!: string;
  @Input() loadState!: DataLoadState;
  @Input() title!: string;
  @Input() tag!: string;
  @Input() tooltipSort!: TooltipSort;
  @Input() xAxisType!: XAxisType;
  @Input() showFullSize!: boolean;
  @Input() isPinned!: boolean;

  @Input() DataDownloadComponent!: ComponentType<Downloader>;
  @Input() newXScaleType!: ScaleType;

  // Legacy chart related; to be removed.
  @Input() runColorScale!: RunColorScale;
  @Input() ignoreOutliers!: boolean;
  @Input() scalarSmoothing!: number;
  @Input() seriesDataList!: LegacySeriesDataList;

  // gpu chart related props.
  @Input() isCardVisible!: boolean;
  @Input() smoothingEnabled!: boolean;
  @Input() gpuLineChartEnabled!: boolean;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() isEverVisible!: boolean;

  @Output() onFullSizeToggle = new EventEmitter<void>();
  @Output() onPinClicked = new EventEmitter<boolean>();

  // Line chart may not exist when no data is present (*ngIf).
  @ViewChild(LineChartComponent)
  lineChart?: LineChartComponent<Metadata, StepDatum>;

  // Line chart may not exist when no data is present (*ngIf).
  @ViewChild(NewLineChartComponent)
  newLineChart?: NewLineChartComponent;

  constructor(private readonly ref: ElementRef, private dialog: MatDialog) {}

  yAxisType = YAxisType.LINEAR;
  newYScaleType = ScaleType.LINEAR;

  readonly XAxisType = XAxisType;

  chartXAxisType() {
    switch (this.xAxisType) {
      case XAxisType.STEP:
        return ChartXAxisType.STEP;
      case XAxisType.WALL_TIME:
        return ChartXAxisType.WALL_TIME;
      case XAxisType.RELATIVE:
        return ChartXAxisType.RELATIVE;
      default:
        throw new Error('Invalid xAxisType for line chart.');
    }
  }

  tooltipColumns: Array<
    TooltipColumnSpec<Metadata, StepDatum>
  > = DEFAULT_TOOLTIP_COLUMNS;

  toggleYAxisType() {
    this.yAxisType =
      this.yAxisType === YAxisType.LINEAR ? YAxisType.LOG : YAxisType.LINEAR;
    this.newYScaleType =
      this.yAxisType === YAxisType.LINEAR ? ScaleType.LINEAR : ScaleType.LOG10;
  }

  resetDomain() {
    if (this.lineChart) {
      this.lineChart.resetDomain();
    }
    if (this.newLineChart) {
      this.newLineChart.viewBoxReset();
    }
  }

  redraw() {
    if (this.lineChart) {
      // Only redraw when it is visible (and thus have width and height).
      if (this.ref.nativeElement.clientWidth) {
        this.lineChart.redraw();
      }
    }
  }

  trackByTooltipDatum(index: number, datum: ScalarTooltipDatum) {
    return datum.id;
  }

  readonly relativeXFormatter = relativeTimeFormatter;

  getCursorAwareTooltipData(
    tooltipData: TooltipDatum<ScalarCardSeriesMetadata>[],
    cursorLoc: {x: number; y: number}
  ): ScalarTooltipDatum[] {
    const scalarTooltipData = tooltipData.map((datum) => {
      return {
        ...datum,
        metadata: {
          ...datum.metadata,
          closest: false,
          distSqToCursor: Math.hypot(
            datum.point.x - cursorLoc.x,
            datum.point.y - cursorLoc.y
          ),
        },
      };
    });

    let minDist = Infinity;
    let minIndex = 0;
    for (let index = 0; index < scalarTooltipData.length; index++) {
      if (minDist > scalarTooltipData[index].metadata.distSqToCursor) {
        minDist = scalarTooltipData[index].metadata.distSqToCursor;
        minIndex = index;
      }
    }

    if (scalarTooltipData.length) {
      scalarTooltipData[minIndex].metadata.closest = true;
    }

    switch (this.tooltipSort) {
      case TooltipSort.DEFAULT:
        return scalarTooltipData;
      case TooltipSort.ASCENDING:
        return scalarTooltipData.sort((a, b) => a.point.y - b.point.y);
      case TooltipSort.DESCENDING:
        return scalarTooltipData.sort((a, b) => b.point.y - a.point.y);
      case TooltipSort.NEAREST:
        return scalarTooltipData.sort((a, b) => {
          return a.metadata.distSqToCursor - b.metadata.distSqToCursor;
        });
    }
  }

  openDataDownloadDialog(): void {
    this.dialog.open(this.DataDownloadComponent, {
      data: {cardId: this.cardId},
    });
  }
}
