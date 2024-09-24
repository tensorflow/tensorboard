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
import {
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {CardState} from '../../store';
import {
  HeaderEditInfo,
  HeaderToggleInfo,
  TooltipSort,
  XAxisType,
} from '../../types';
import {
  MinMaxStep,
  ScalarCardDataSeries,
  ScalarCardSeriesMetadata,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';
import {
  ColumnHeader,
  DataTableMode,
  SortingInfo,
  SortingOrder,
  DiscreteFilter,
  IntervalFilter,
  FilterAddedEvent,
  AddColumnEvent,
} from '../../../widgets/data_table/types';
import {isDatumVisible, TimeSelectionView} from './utils';
import {RunToHparamMap} from '../../../runs/types';

type ScalarTooltipDatum = TooltipDatum<
  ScalarCardSeriesMetadata & {
    closest: boolean;
  }
>;

@Component({
  standalone: false,
  selector: 'scalar-card-component',
  templateUrl: 'scalar_card_component.ng.html',
  styleUrls: ['scalar_card_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardComponent<Downloader> {
  readonly DataLoadState = DataLoadState;
  readonly RendererType = RendererType;
  readonly ScaleType = ScaleType;

  @Input() cardId!: string;
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() cardState?: CardState;
  @Input() DataDownloadComponent!: ComponentType<Downloader>;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() ignoreOutliers!: boolean;
  @Input() isCardVisible!: boolean;
  @Input() isPinned!: boolean;
  @Input() loadState!: DataLoadState;
  @Input() showFullWidth!: boolean;
  @Input() smoothingEnabled!: boolean;
  @Input() tag!: string;
  @Input() title!: string;
  @Input() tooltipSort!: TooltipSort;
  @Input() xAxisType!: XAxisType;
  @Input() xScaleType!: ScaleType;
  @Input() useDarkMode!: boolean;
  @Input() forceSvg!: boolean;
  @Input() columnCustomizationEnabled!: boolean;
  @Input() columnContextMenusEnabled!: boolean;
  @Input() linkedTimeSelection: TimeSelectionView | undefined;
  @Input() stepOrLinkedTimeSelection: TimeSelection | undefined;
  @Input() minMaxStep!: MinMaxStep;
  @Input() userViewBox!: Extent | null;
  @Input() columnHeaders!: ColumnHeader[];
  @Input() rangeEnabled!: boolean;
  @Input() columnFilters!: Map<string, DiscreteFilter | IntervalFilter>;
  @Input() selectableColumns!: ColumnHeader[];
  @Input() numColumnsLoaded!: number;
  @Input() numColumnsToLoad!: number;
  @Input() runToHparamMap!: RunToHparamMap;

  @Output() onFullSizeToggle = new EventEmitter<void>();
  @Output() onPinClicked = new EventEmitter<boolean>();
  @Output() onTimeSelectionChanged = new EventEmitter<{
    timeSelection: TimeSelection;
    affordance?: TimeSelectionAffordance;
  }>();
  @Output() onStepSelectorToggled =
    new EventEmitter<TimeSelectionToggleAffordance>();
  @Output() onDataTableSorting = new EventEmitter<SortingInfo>();
  @Output() editColumnHeaders = new EventEmitter<HeaderEditInfo>();
  @Output() openTableEditMenuToMode = new EventEmitter<DataTableMode>();
  @Output() addColumn = new EventEmitter<AddColumnEvent>();
  @Output() removeColumn = new EventEmitter<HeaderToggleInfo>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();
  @Output() loadAllColumns = new EventEmitter<null>();

  @Output() onLineChartZoom = new EventEmitter<Extent | null>();
  @Output() onCardStateChanged = new EventEmitter<Partial<CardState>>();

  // Line chart may not exist when was never visible (*ngIf).
  @ViewChild(LineChartComponent)
  lineChart?: LineChartComponent;
  sortingInfo: SortingInfo = {
    name: 'run',
    order: SortingOrder.ASCENDING,
  };

  @ViewChild('dataTableContainer')
  dataTableContainer?: ElementRef;

  constructor(private readonly ref: ElementRef, private dialog: MatDialog) {}

  yScaleType = ScaleType.LINEAR;
  isViewBoxOverridden: boolean = false;

  toggleYScaleType() {
    this.yScaleType =
      this.yScaleType === ScaleType.LINEAR ? ScaleType.LOG10 : ScaleType.LINEAR;
  }

  sortDataBy(sortingInfo: SortingInfo) {
    this.sortingInfo = sortingInfo;
    this.onDataTableSorting.emit(sortingInfo);
  }

  resetDomain() {
    if (this.lineChart) {
      this.lineChart.viewBoxReset();
    }
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
        return scalarTooltipData.sort((a, b) => a.dataPoint.y - b.dataPoint.y);
      case TooltipSort.DESCENDING:
        return scalarTooltipData.sort((a, b) => b.dataPoint.y - a.dataPoint.y);
      case TooltipSort.NEAREST:
        return scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorPixels - b.metadata.distToCursorPixels;
        });
      case TooltipSort.NEAREST_Y:
        return scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorY - b.metadata.distToCursorY;
        });
      case TooltipSort.DEFAULT:
      case TooltipSort.ALPHABETICAL:
        return scalarTooltipData.sort((a, b) => {
          if (a.metadata.displayName < b.metadata.displayName) {
            return -1;
          }
          if (a.metadata.displayName > b.metadata.displayName) {
            return 1;
          }
          return 0;
        });
    }
  }

  openDataDownloadDialog(): void {
    this.dialog.open(this.DataDownloadComponent, {
      data: {cardId: this.cardId},
    });
  }

  onFobRemoved() {
    this.onStepSelectorToggled.emit(TimeSelectionToggleAffordance.FOB_DESELECT);
  }

  showDataTable() {
    return this.xAxisType === XAxisType.STEP && this.stepOrLinkedTimeSelection;
  }

  showFobController() {
    return this.xAxisType === XAxisType.STEP && this.minMaxStep;
  }

  canExpandTable() {
    const visbleRuns = this.dataSeries.filter((datum) => {
      return isDatumVisible(datum, this.chartMetadataMap);
    });

    // 3 is the maximum number of runs that can be shown before
    // the height of the table exceeds $_data_table_initial_height.
    return visbleRuns.length > 3;
  }

  shouldExpandTable() {
    // If the user has resized the data table a height style will be set.
    // If the data table has been resized we always want to expand the table.
    // Otherwise the table should be toggled.
    return Boolean(
      this.dataTableContainer?.nativeElement.style.height ||
        !this.cardState?.tableExpanded
    );
  }

  toggleTableExpanded() {
    this.onCardStateChanged.emit({
      ...this.cardState,
      tableExpanded: this.shouldExpandTable(),
    });
    // Manually resizing an element sets a style value on the element which takes
    // precedence over any classes the element may have. This value must be removed
    // for the table to expand or collapse correctly.
    if (this.dataTableContainer) {
      this.dataTableContainer.nativeElement.style.height = '';
    }
  }

  openTableEditMenu() {
    const currentTableMode = this.rangeEnabled
      ? DataTableMode.RANGE
      : DataTableMode.SINGLE;
    this.openTableEditMenuToMode.emit(currentTableMode);
  }
}
