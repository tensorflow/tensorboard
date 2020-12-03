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
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

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
import {RendererType, ScaleType} from '../../../widgets/line_chart_v2/types';
import {ScalarStepDatum} from '../../data_source';
import {TooltipSort, XAxisType} from '../../types';
import {
  ScalarCardDataSeries,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';

const RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = 50;

interface Metadata {
  displayName: string;
}

type StepDatum = ScalarStepDatum;

export type SeriesPoint = Point<StepDatum>;

export type SeriesDataList = Array<SeriesData<Metadata, StepDatum>>;

export type ScalarChartEvalPoint = EvaluationPoint<Metadata, StepDatum>;

export type TooltipColumns = Array<TooltipColumnSpec<Metadata, StepDatum>>;

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
export class ScalarCardComponent {
  readonly RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS;
  readonly DataLoadState = DataLoadState;
  readonly RendererType = RendererType;

  @Input() loadState!: DataLoadState;
  @Input() title!: string;
  @Input() tag!: string;
  @Input() tooltipSort!: TooltipSort;
  @Input() xAxisType!: XAxisType;
  @Input() showFullSize!: boolean;
  @Input() isPinned!: boolean;

  // Legacy chart related; to be removed.
  @Input() runColorScale!: RunColorScale;
  @Input() ignoreOutliers!: boolean;
  @Input() scalarSmoothing!: number;
  @Input() seriesDataList!: SeriesDataList;

  // gpu chart related props.
  @Input() gpuLineChartEnabled!: boolean;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;

  @Output() onFullSizeToggle = new EventEmitter<void>();
  @Output() onPinClicked = new EventEmitter<boolean>();

  // Line chart may not exist when no data is present (*ngIf).
  @ViewChild(LineChartComponent)
  lineChart?: LineChartComponent<Metadata, StepDatum>;

  constructor(private readonly ref: ElementRef) {}

  yAxisType = YAxisType.LINEAR;
  newYAxisType = ScaleType.LINEAR;

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
    this.newYAxisType =
      this.yAxisType === YAxisType.LINEAR ? ScaleType.LINEAR : ScaleType.LOG10;
  }

  resetDomain() {
    if (this.lineChart) {
      this.lineChart.resetDomain();
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
}
