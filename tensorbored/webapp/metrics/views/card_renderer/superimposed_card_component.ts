/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {
  Formatter,
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
  siNumberFormatter,
} from '../../../widgets/line_chart_v2/lib/formatter';
import {LineChartComponent} from '../../../widgets/line_chart_v2/line_chart_component';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {TooltipSort, XAxisType, SuperimposedCardId} from '../../types';
import {
  ScalarCardDataSeries,
  ScalarCardSeriesMetadata,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';

type ScalarTooltipDatum = TooltipDatum<
  ScalarCardSeriesMetadata & {
    closest: boolean;
  }
>;

const MAX_TOOLTIP_ITEMS = 5;

@Component({
  standalone: false,
  selector: 'superimposed-card-component',
  templateUrl: 'superimposed_card_component.ng.html',
  styleUrls: ['superimposed_card_component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperimposedCardComponent {
  readonly DataLoadState = DataLoadState;
  readonly RendererType = RendererType;
  readonly ScaleType = ScaleType;

  @Input() superimposedCardId!: SuperimposedCardId;
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() ignoreOutliers!: boolean;
  @Input() isCardVisible!: boolean;
  @Input() loadState!: DataLoadState;
  @Input() smoothingEnabled!: boolean;
  @Input() tags!: string[];
  @Input() title!: string;
  @Input() tooltipSort!: TooltipSort;
  @Input() xAxisType!: XAxisType;
  @Input() xScaleType!: ScaleType;
  @Input() yAxisScale!: ScaleType;
  @Input() xAxisScale!: ScaleType;
  @Input() symlogLinearThreshold: number = 1;
  @Input() useDarkMode!: boolean;
  @Input() forceSvg!: boolean;
  @Input() userViewBox: Extent | null = null;

  @Output() onDeleteCard = new EventEmitter<void>();
  @Output() onRemoveTag = new EventEmitter<string>();
  @Output() onViewBoxChange = new EventEmitter<Extent | null>();
  @Output() onFullWidthChanged = new EventEmitter<boolean>();
  @Output() onFullHeightChanged = new EventEmitter<boolean>();
  @Output()
  onSymlogLinearThresholdChanged = new EventEmitter<number>();
  @Output() onYAxisScaleChanged = new EventEmitter<ScaleType>();
  @Output() onXAxisScaleChanged = new EventEmitter<ScaleType>();

  showFullWidth = false;
  showFullHeight = false;

  toggleFullWidth() {
    this.showFullWidth = !this.showFullWidth;
    this.onFullWidthChanged.emit(this.showFullWidth);
  }

  toggleFullHeight() {
    this.showFullHeight = !this.showFullHeight;
    this.onFullHeightChanged.emit(this.showFullHeight);
  }

  @ViewChild(LineChartComponent)
  lineChart?: LineChartComponent;

  constructor(private readonly ref: ElementRef) {}

  isViewBoxOverridden = false;
  additionalItemsCount = 0;

  private static nextScale(current: ScaleType): ScaleType {
    switch (current) {
      case ScaleType.LINEAR:
        return ScaleType.LOG10;
      case ScaleType.LOG10:
        return ScaleType.SYMLOG10;
      default:
        return ScaleType.LINEAR;
    }
  }

  private static scaleLabel(scaleType: ScaleType): string {
    switch (scaleType) {
      case ScaleType.LOG10:
        return 'Log';
      case ScaleType.SYMLOG10:
        return 'SymLog';
      case ScaleType.TIME:
        return 'Time';
      default:
        return 'Linear';
    }
  }

  toggleYScaleType() {
    this.onYAxisScaleChanged.emit(
      SuperimposedCardComponent.nextScale(this.yAxisScale)
    );
  }

  toggleXScaleType() {
    this.onXAxisScaleChanged.emit(
      SuperimposedCardComponent.nextScale(this.getEffectiveXScaleType())
    );
  }

  getEffectiveXScaleType(): ScaleType {
    if (this.xScaleType === ScaleType.TIME) {
      return ScaleType.TIME;
    }
    return this.xAxisScale;
  }

  getYScaleLabel(): string {
    return SuperimposedCardComponent.scaleLabel(this.yAxisScale);
  }

  getXScaleLabel(): string {
    return SuperimposedCardComponent.scaleLabel(this.getEffectiveXScaleType());
  }

  canToggleXScaleType(): boolean {
    return (
      this.xAxisType === XAxisType.STEP || this.xAxisType === XAxisType.RELATIVE
    );
  }

  onSymlogLinearThresholdInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.value) {
      return;
    }
    const value = parseFloat(input.value);
    if (value > 0) {
      this.onSymlogLinearThresholdChanged.emit(value);
    }
  }

  resetDomain() {
    if (this.lineChart) {
      this.lineChart.viewBoxReset();
    }
  }

  onViewBoxChanged(viewBox: Extent | null) {
    this.onViewBoxChange.emit(viewBox);
  }

  trackByTooltipDatum(index: number, datum: ScalarTooltipDatum) {
    return datum.id;
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

  getCursorAwareTooltipData(
    tooltipData: TooltipDatum<ScalarCardSeriesMetadata>[],
    cursorLocationInDataCoord: {x: number; y: number},
    cursorLocation: {x: number; y: number}
  ): ScalarTooltipDatum[] {
    const scalarTooltipData = tooltipData.map((datum) => {
      return {
        ...datum,
        metadata: {
          ...datum.metadata,
          closest: false,
          distToCursorPixels: Math.hypot(
            datum.domPoint.x - cursorLocation.x,
            datum.domPoint.y - cursorLocation.y
          ),
          distToCursorX: datum.dataPoint.x - cursorLocationInDataCoord.x,
          distToCursorY: datum.dataPoint.y - cursorLocationInDataCoord.y,
        },
      };
    });

    let minDist = Infinity;
    let minIndex = 0;
    for (let index = 0; index < scalarTooltipData.length; index++) {
      if (minDist > scalarTooltipData[index].metadata.distToCursorPixels) {
        minDist = scalarTooltipData[index].metadata.distToCursorPixels;
        minIndex = index;
      }
    }

    if (scalarTooltipData.length) {
      scalarTooltipData[minIndex].metadata.closest = true;
    }

    switch (this.tooltipSort) {
      case TooltipSort.ASCENDING:
        scalarTooltipData.sort((a, b) => a.dataPoint.y - b.dataPoint.y);
        break;
      case TooltipSort.DESCENDING:
        scalarTooltipData.sort((a, b) => b.dataPoint.y - a.dataPoint.y);
        break;
      case TooltipSort.NEAREST:
        scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorPixels - b.metadata.distToCursorPixels;
        });
        break;
      case TooltipSort.NEAREST_Y:
        scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorY - b.metadata.distToCursorY;
        });
        break;
      case TooltipSort.DEFAULT:
      case TooltipSort.ALPHABETICAL:
        scalarTooltipData.sort((a, b) => {
          if (a.metadata.displayName < b.metadata.displayName) {
            return -1;
          }
          if (a.metadata.displayName > b.metadata.displayName) {
            return 1;
          }
          return 0;
        });
        break;
    }

    this.additionalItemsCount = Math.max(
      0,
      scalarTooltipData.length - MAX_TOOLTIP_ITEMS
    );
    return scalarTooltipData.slice(0, MAX_TOOLTIP_ITEMS);
  }

  onRemoveTagClick(tag: string, event: Event) {
    event.stopPropagation();
    this.onRemoveTag.emit(tag);
  }
}
