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
import {combineLatest, from, Observable, of} from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';

import {State} from '../../../app_state';
import {
  getCardPinnedState,
  getCurrentRouteRunSelection,
  getExperimentIdForRunId,
  getExperimentIdToAliasMap,
  getIsGpuChartEnabled,
  getRun,
  getRunColorMap,
} from '../../../selectors';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import {classicSmoothing} from '../../../widgets/line_chart_v2/data_transformer';
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
import {
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
  SeriesType,
} from './scalar_card_types';
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

interface RunIdAndPoints {
  runId: string;
  points: ScalarCardPoint[];
}

function areSeriesEqual(
  listA: RunIdAndPoints[],
  listB: RunIdAndPoints[]
): boolean {
  if (listA.length !== listB.length) {
    return false;
  }
  return listA.every((listAVal, index) => {
    const listBVal = listB[index];
    const listAPoints = listAVal.points;
    const listBPoints = listBVal.points;
    return (
      listAVal.runId === listBVal.runId &&
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
      [dataSeries]="(gpuLineChartEnabled$ | async) ? (dataSeries$ | async) : []"
      [chartMetadataMap]="
        (gpuLineChartEnabled$ | async) ? (chartMetadataMap$ | async) : {}
      "
      [gpuLineChartEnabled]="gpuLineChartEnabled$ | async"
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
  dataSeries$?: Observable<ScalarCardDataSeries[]>;
  chartMetadataMap$?: Observable<ScalarCardSeriesMetadataMap>;

  readonly tooltipSort$ = this.store.select(getMetricsTooltipSort);
  readonly ignoreOutliers$ = this.store.select(getMetricsIgnoreOutliers);
  readonly xAxisType$ = this.store.select(getMetricsXAxisType);
  readonly scalarSmoothing$ = this.store.select(getMetricsScalarSmoothing);
  readonly gpuLineChartEnabled$ = this.store.select(getIsGpuChartEnabled);
  readonly smoothingEnabled$ = this.store
    .select(getMetricsScalarSmoothing)
    .pipe(map((smoothing) => smoothing > 0));

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
      }),
      distinctUntilChanged(areSeriesEqual),
      shareReplay(1)
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

    function getSmoothedSeriesId(seriesId: string): string {
      return JSON.stringify(['smoothed', seriesId]);
    }

    this.dataSeries$ = runIdAndPoints$.pipe(
      combineLatestWith(this.store.select(getMetricsScalarSmoothing)),
      switchMap(([runsData, smoothing]) => {
        const dataSeriesList = runsData.map(({runId, points}) => {
          return {id: runId, points};
        });

        if (smoothing === 0) {
          return of(dataSeriesList);
        }

        return from(classicSmoothing(dataSeriesList, smoothing)).pipe(
          map((smoothedDataSeriesList) => {
            const smoothedList = dataSeriesList.map((dataSeries, index) => {
              return {
                id: getSmoothedSeriesId(dataSeries.id),
                points: smoothedDataSeriesList[index].points.map(
                  ({y}, pointIndex) => {
                    return {...dataSeries.points[pointIndex], y};
                  }
                ),
              };
            });
            return [...dataSeriesList, ...smoothedList];
          })
        );
      }),
      startWith([])
    );

    this.chartMetadataMap$ = runIdAndPoints$.pipe(
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
      combineLatestWith(
        this.store.select(getCurrentRouteRunSelection),
        this.store.select(getRunColorMap),
        this.store.select(getMetricsScalarSmoothing)
      ),
      // When the `fetchRunsSucceeded` action fires, the run selection
      // map and the metadata change. To prevent quick fire of changes,
      // debounce by a microtask to emit only single change for the runs
      // store change.
      debounceTime(0),
      map(([displayNameAndPoints, runSelectionMap, colorMap, smoothing]) => {
        const metadataMap: ScalarCardSeriesMetadataMap = {};
        const shouldSmooth = smoothing > 0;

        for (const {displayName, runId} of displayNameAndPoints) {
          metadataMap[runId] = {
            type: SeriesType.ORIGINAL,
            id: runId,
            displayName,
            visible: Boolean(runSelectionMap && runSelectionMap.get(runId)),
            color: colorMap[runId] ?? '#fff',
            aux: false,
            opacity: 1,
          };
        }

        if (!shouldSmooth) {
          return metadataMap;
        }

        for (const [id, metadata] of Object.entries(metadataMap)) {
          const smoothedSeriesId = getSmoothedSeriesId(id);
          metadataMap[smoothedSeriesId] = {
            ...metadata,
            id: smoothedSeriesId,
            type: SeriesType.DERIVED,
            aux: false,
            originalSeriesId: id,
            opacity: 1,
          };

          metadata.aux = true;
          metadata.opacity = 0.4;
        }
        return metadataMap;
      }),
      startWith({})
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
  ): ScalarCardPoint[] {
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
