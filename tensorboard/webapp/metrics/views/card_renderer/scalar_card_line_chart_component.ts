/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
  ChangeDetectorRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {DataLoadState} from '../../../types/data';
import {
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionToggleAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {
  Formatter,
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
  siNumberFormatter,
} from '../../../widgets/line_chart_v2/lib/formatter';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {LineChartComponent} from '../../../widgets/line_chart_v2/line_chart_component';
import {RendererType, ScaleType} from '../../../widgets/line_chart_v2/types';
import {XAxisType} from '../../types';
import {TooltipTemplate} from '../../../widgets/line_chart_v2/line_chart_component';
import {
  MinMaxStep,
  ScalarCardDataSeries,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';

@Component({
  standalone: false,
  selector: 'scalar-card-line-chart-component',
  templateUrl: 'scalar_card_line_chart_component.ng.html',
  styleUrls: ['scalar_card_line_chart_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardLineChartComponent {
  readonly DataLoadState = DataLoadState;
  readonly RendererType = RendererType;
  readonly ScaleType = ScaleType;

  @Input() seriesMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() seriesData!: ScalarCardDataSeries[];
  @Input() ignoreOutliers!: boolean;
  @Input() disableUpdate!: boolean;
  @Input() loadState!: DataLoadState;
  @Input() smoothingEnabled!: boolean;
  @Input() xAxisType!: XAxisType;
  @Input() xScaleType!: ScaleType;
  @Input() yScaleType!: ScaleType;
  @Input() useDarkMode!: boolean;
  @Input() forceSvg!: boolean;
  @Input() stepOrLinkedTimeSelection: TimeSelection | undefined;
  @Input() minMaxStep!: MinMaxStep;
  @Input() userViewBox!: Extent | null;
  @Input() tooltipTemplate!: TooltipTemplate | null;
  @Input() allowFobRemoval!: boolean;
  @Input() disableTooltip!: boolean;

  @Output()
  onTimeSelectionChanged = new EventEmitter<{
    timeSelection: TimeSelection;
    affordance?: TimeSelectionAffordance;
  }>();
  @Output()
  onStepSelectorToggled = new EventEmitter<TimeSelectionToggleAffordance>();

  @Output() onLineChartZoom = new EventEmitter<Extent | null>();

  @ViewChild(LineChartComponent) lineChart?: LineChartComponent;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  isViewBoxOverridden: boolean = false;

  resetDomain() {
    if (this.lineChart) {
      this.lineChart.viewBoxReset();
    }
  }

  readonly relativeXFormatter = relativeTimeFormatter;
  readonly valueFormatter = numberFormatter;
  readonly stepFormatter = intlNumberFormatter;

  getCustomXFormatter(): Formatter | undefined {
    switch (this.xAxisType) {
      case XAxisType.RELATIVE:
        return relativeTimeFormatter;
      case XAxisType.STEP:
        return siNumberFormatter;
      case XAxisType.WALL_TIME:
      default:
        return undefined;
    }
  }

  onFobRemoved() {
    this.onStepSelectorToggled.emit(TimeSelectionToggleAffordance.FOB_DESELECT);
  }

  showFobController() {
    return this.xAxisType === XAxisType.STEP && this.minMaxStep;
  }
}
