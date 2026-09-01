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
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {Observable, of, Subject} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {getForceSvgFeatureFlag} from '../../../feature_flag/store/feature_flag_selectors';
import {
  getDarkModeEnabled,
  getMetricsCardRangeSelectionEnabled,
  getMetricsCardTimeSelection,
  getMetricsCardUserViewBox,
} from '../../../selectors';
import {DataLoadState} from '../../../types/data';
import {
  TimeSelection,
  TimeSelectionToggleAffordance,
  TimeSelectionWithAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {TooltipTemplate} from '../../../widgets/line_chart_v2/line_chart_component';
import {ScaleType} from '../../../widgets/line_chart_v2/types';
import {
  cardViewBoxChanged,
  stepSelectorToggled,
  timeSelectionChanged,
} from '../../actions';
import {
  getCardLoadState,
  getMetricsIgnoreOutliers,
  getMetricsTooltipSort,
  getMetricsXAxisType,
} from '../../store';
import {CardId, XAxisType} from '../../types';
import {CardRenderer} from '../metrics_view_types';
import {ScalarCardLineChartComponent} from './scalar_card_line_chart_component';
import {
  MinMaxStep,
  ScalarCardDataSeries,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';
import {TimeSelectionView} from './utils';

@Component({
  standalone: false,
  selector: 'scalar-card-line-chart',
  template: `
    <scalar-card-line-chart-component
      [seriesMetadataMap]="seriesMetadataMap"
      [seriesData]="seriesData"
      [ignoreOutliers]="resolvedIgnoreOutliers()"
      [disableUpdate]="disableUpdate"
      [xAxisType]="resolvedXAxisType()"
      [xScaleType]="xScaleType()"
      [yScaleType]="yScaleType"
      [useDarkMode]="useDarkMode()"
      [tooltipTemplate]="tooltipTemplate"
      [minMaxStep]="minMaxStep"
      [stepOrLinkedTimeSelection]="stepOrLinkedTimeSelection"
      [forceSvg]="forceSvg()"
      [userViewBox]="userViewBox$ | async"
      [disableTooltip]="disableTooltip"
      [allowFobRemoval]="allowFobRemoval"
      (onTimeSelectionChanged)="onTimeSelectionChanged($event)"
      (onStepSelectorToggled)="onStepSelectorToggled($event)"
      (onLineChartZoom)="onLineChartZoom($event)"
    ></scalar-card-line-chart-component>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardLineChartContainer
  implements CardRenderer, OnInit, OnDestroy
{
  constructor(private readonly store: Store<State>) {
    this.useDarkMode = this.store.selectSignal(getDarkModeEnabled);
    this.tooltipSort$ = this.store.select(getMetricsTooltipSort);
    this.forceSvg = this.store.selectSignal(getForceSvgFeatureFlag);
    this.resolvedIgnoreOutliers = toSignal(
      this.ignoreOutliers
        ? of(this.ignoreOutliers)
        : this.store.select(getMetricsIgnoreOutliers),
      {requireSync: true}
    );
    this.resolvedXAxisType = toSignal(
      this.xAxisType
        ? of(this.xAxisType)
        : this.store.select(getMetricsXAxisType),
      {requireSync: true}
    );
    this.xScaleType = toSignal(
      this.xAxisType
        ? of(ScaleType.LINEAR)
        : this.store.select(getMetricsXAxisType).pipe(
            map((xAxisType) => {
              switch (xAxisType) {
                case XAxisType.STEP:
                case XAxisType.RELATIVE:
                  return ScaleType.LINEAR;
                case XAxisType.WALL_TIME:
                  return ScaleType.TIME;
                default:
                  const neverType = xAxisType as never;
                  throw new Error(
                    `Invalid xAxisType for line chart. ${neverType}`
                  );
              }
            })
          ),
      {requireSync: true}
    );
    this.ngUnsubscribe = new Subject<void>();
  }

  @Input() cardId!: CardId;
  @Input() seriesMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() seriesData!: ScalarCardDataSeries[];
  @Input() minMaxStep!: MinMaxStep;
  @Input() stepOrLinkedTimeSelection!: TimeSelection;

  @Input() xAxisType?: XAxisType;
  @Input() yScaleType?: ScaleType = ScaleType.LINEAR;
  @Input() ignoreOutliers?: boolean;
  @Input() disableUpdate?: boolean = false;
  @Input() tooltipTemplate?: TooltipTemplate;
  @Input() disableTooltip?: boolean = false;
  @Input() allowFobRemoval?: boolean = true;

  @ViewChild(ScalarCardLineChartComponent)
  scalarCardLineChart?: ScalarCardLineChartComponent;

  loadState$?: Observable<DataLoadState>;
  userViewBox$?: Observable<Extent | null>;
  rangeEnabled$?: Observable<boolean>;

  readonly useDarkMode;
  readonly tooltipSort$;
  readonly forceSvg;

  readonly resolvedIgnoreOutliers;

  readonly resolvedXAxisType;
  readonly xScaleType;

  private readonly ngUnsubscribe;

  ngOnInit() {
    this.userViewBox$ = this.store.select(
      getMetricsCardUserViewBox,
      this.cardId
    );

    this.loadState$ = this.store.select(getCardLoadState, this.cardId);

    this.rangeEnabled$ = this.store.select(
      getMetricsCardRangeSelectionEnabled(this.cardId)
    );
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onTimeSelectionChanged(
    newTimeSelectionWithAffordance: TimeSelectionWithAffordance
  ) {
    this.store.dispatch(
      timeSelectionChanged({
        ...newTimeSelectionWithAffordance,
        cardId: this.cardId,
      })
    );
  }

  onStepSelectorToggled(affordance: TimeSelectionToggleAffordance) {
    this.store.dispatch(stepSelectorToggled({affordance, cardId: this.cardId}));
  }

  onLineChartZoom(lineChartViewBox: Extent | null) {
    this.store.dispatch(
      cardViewBoxChanged({
        userViewBox: lineChartViewBox,
        cardId: this.cardId,
      })
    );
  }
}
