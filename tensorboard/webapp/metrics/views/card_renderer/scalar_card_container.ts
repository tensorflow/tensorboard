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
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {DataLoadState} from '../../../types/data';
import {combineLatest, Observable, of} from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

import {State} from '../../../app_state';
import {
  getCardPinnedState,
  getCurrentRouteRunSelection,
  getExperimentIdForRunId,
  getExperimentIdToAliasMap,
  getRun,
} from '../../../selectors';
import {RunColorScale} from '../../../types/ui';
import {PluginType, ScalarStepDatum} from '../../data_source';
import {
  getCardLoadState,
  getCardMetadata,
  getCardTimeSeries,
  getMetricsIgnoreOutliers,
  getMetricsScalarSmoothing,
  getMetricsTooltipSort,
  getMetricsXAxisType,
  RunToSeries,
} from '../../store';
import {CardId, CardMetadata, XAxisType} from '../../types';
import {CardRenderer} from '../metrics_view_types';
import {getTagDisplayName} from '../utils';

import {SeriesDataList, SeriesPoint} from './scalar_card_component';
import {getDisplayNameForRun} from './utils';

type ScalarCardMetadata = CardMetadata & {
  plugin: PluginType.SCALARS;
};

function areSeriesDataListEqual(
  listA: SeriesDataList,
  listB: SeriesDataList
): boolean {
  if (listA.length !== listB.length) {
    return false;
  }
  return listA.every((listAVal, index) => {
    const listBVal = listB[index];
    const listAPoints = listAVal.points;
    const listBPoints = listBVal.points;
    return (
      listAVal.seriesId === listBVal.seriesId &&
      listAVal.metadata.displayName === listBVal.metadata.displayName &&
      listAVal.visible === listBVal.visible &&
      listAPoints.length === listBPoints.length &&
      listAPoints.every((listAPoint, index) => {
        const listBPoint = listBPoints[index];
        return listAPoint.x === listBPoint.x && listAPoint.y === listBPoint.y;
      })
    );
  });
}

@Component({
  selector: 'scalar-card',
  template: `
    <scalar-card-component
      [loadState]="loadState$ | async"
      [runColorScale]="runColorScale"
      [title]="title$ | async"
      [tag]="tag$ | async"
      [seriesDataList]="seriesDataList$ | async"
      [tooltipSort]="tooltipSort$ | async"
      [ignoreOutliers]="ignoreOutliers$ | async"
      [xAxisType]="xAxisType$ | async"
      [scalarSmoothing]="scalarSmoothing$ | async"
      [showFullSize]="showFullSize"
      [isPinned]="isPinned$ | async"
      (onFullSizeToggle)="onFullSizeToggle()"
      (onPinClicked)="pinStateChanged.emit($event)"
    ></scalar-card-component>
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
export class ScalarCardContainer implements CardRenderer, OnInit {
  constructor(private readonly store: Store<State>) {}

  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Input() runColorScale!: RunColorScale;
  @Output() fullWidthChanged = new EventEmitter<boolean>();
  @Output() fullHeightChanged = new EventEmitter<boolean>();
  @Output() pinStateChanged = new EventEmitter<boolean>();

  loadState$?: Observable<DataLoadState>;
  title$?: Observable<string>;
  tag$?: Observable<string>;
  seriesDataList$?: Observable<SeriesDataList> = of([]);
  isPinned$?: Observable<boolean>;
  readonly tooltipSort$ = this.store.select(getMetricsTooltipSort);
  readonly ignoreOutliers$ = this.store.select(getMetricsIgnoreOutliers);
  readonly xAxisType$ = this.store.select(getMetricsXAxisType);
  readonly scalarSmoothing$ = this.store.select(getMetricsScalarSmoothing);
  showFullSize = false;

  private isScalarCardMetadata(
    cardMetadata: CardMetadata
  ): cardMetadata is ScalarCardMetadata {
    const {plugin} = cardMetadata;
    return plugin === PluginType.SCALARS;
  }

  onFullSizeToggle() {
    this.showFullSize = !this.showFullSize;
    this.fullWidthChanged.emit(this.showFullSize);
    this.fullHeightChanged.emit(this.showFullSize);
  }

  /**
   * Build observables once cardId is defined (after onInit).
   */
  ngOnInit() {
    const selectCardMetadata$ = this.store.select(getCardMetadata, this.cardId);
    const cardMetadata$ = selectCardMetadata$.pipe(
      filter((cardMetadata) => {
        return !!cardMetadata && this.isScalarCardMetadata(cardMetadata);
      }),
      map((cardMetadata) => {
        return cardMetadata as ScalarCardMetadata;
      })
    );

    const settingsAndTimeSeries$ = combineLatest([
      this.store.select(getMetricsXAxisType),
      this.store.select(getCardTimeSeries, this.cardId),
    ]);
    const runIdAndPoints$ = settingsAndTimeSeries$.pipe(
      filter(([xAxisType, runToSeries]) => !!runToSeries),
      map(
        ([xAxisType, runToSeries]) =>
          ({xAxisType, runToSeries} as {
            xAxisType: XAxisType;
            runToSeries: RunToSeries<PluginType.SCALARS>;
          })
      ),
      map(({xAxisType, runToSeries}) => {
        const runIds = Object.keys(runToSeries);
        const results = runIds.map((runId) => {
          return {
            runId,
            points: this.stepSeriesToLineSeries(runToSeries[runId], xAxisType),
          };
        });
        return results;
      })
    );

    this.seriesDataList$ = runIdAndPoints$.pipe(
      switchMap((runIdAndPoints) => {
        if (!runIdAndPoints.length) {
          return of([]);
        }

        return combineLatest(
          runIdAndPoints.map((runIdAndPoint) => {
            return this.getRunDisplayNameAndPoints(runIdAndPoint);
          })
        );
      }),
      combineLatestWith(this.store.select(getCurrentRouteRunSelection)),
      // When the `fetchRunsSucceeded` action fires, the run selection
      // map and the metadata change. To prevent quick fire of changes,
      // debounce by a microtask to emit only single change for the runs
      // store change.
      debounceTime(0),
      map(([result, runSelectionMap]) => {
        return result.map(({runId, displayName, points}) => {
          return {
            seriesId: runId,
            metadata: {displayName},
            points,
            visible: Boolean(runSelectionMap && runSelectionMap.get(runId)),
          };
        });
      }),
      startWith([]),
      distinctUntilChanged(areSeriesDataListEqual)
    );

    this.loadState$ = this.store.select(getCardLoadState, this.cardId);

    this.tag$ = cardMetadata$.pipe(
      map((cardMetadata) => {
        return cardMetadata.tag;
      })
    );

    this.title$ = this.tag$.pipe(
      map((tag) => {
        return getTagDisplayName(tag, this.groupName);
      })
    );

    this.isPinned$ = this.store.select(getCardPinnedState, this.cardId);
  }

  private getRunDisplayNameAndPoints(runIdAndPoint: {
    runId: string;
    points: SeriesPoint[];
  }): Observable<{runId: string; displayName: string; points: SeriesPoint[]}> {
    const {runId, points} = runIdAndPoint;
    return combineLatest([
      this.store.select(getExperimentIdForRunId, {runId}),
      this.store.select(getExperimentIdToAliasMap),
      this.store.select(getRun, {runId}),
    ]).pipe(
      map(([experimentId, idToAlias, run]) => {
        const displayName = getDisplayNameForRun(
          runId,
          run,
          experimentId ? idToAlias[experimentId] : null
        );
        return {runId, displayName, points};
      })
    );
  }

  private stepSeriesToLineSeries(
    stepSeries: ScalarStepDatum[],
    xAxisType: XAxisType
  ) {
    const isStepBased = xAxisType === XAxisType.STEP;
    return stepSeries.map((stepDatum) => {
      return {
        ...stepDatum,
        x: isStepBased ? stepDatum.step : stepDatum.wallTime,
        y: stepDatum.value,
      };
    });
  }
}
