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
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, from, Observable, of, Subject} from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import {ExperimentAlias} from '../../../experiments/types';
import {
  actions as hparamsActions,
  selectors as hparamsSelectors,
} from '../../../hparams';
import {
  getForceSvgFeatureFlag,
  getIsScalarColumnContextMenusEnabled,
  getIsScalarColumnCustomizationEnabled,
} from '../../../feature_flag/store/feature_flag_selectors';
import {
  getCardPinnedState,
  getCardStateMap,
  getDarkModeEnabled,
  getExperimentIdForRunId,
  getExperimentIdToExperimentAliasMap,
  getMetricsCardDataMinMax,
  getMetricsCardTimeSelection,
  getMetricsCardUserViewBox,
  getMetricsLinkedTimeEnabled,
  getMetricsLinkedTimeSelection,
  getMetricsCardRangeSelectionEnabled,
  getRun,
  getRunColorMap,
  getCurrentRouteRunSelection,
  getGroupedHeadersForCard,
  getRunToHparamMap,
} from '../../../selectors';
import {DataLoadState} from '../../../types/data';
import {
  TimeSelection,
  TimeSelectionToggleAffordance,
  TimeSelectionWithAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {classicSmoothing} from '../../../widgets/line_chart_v2/data_transformer';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {ScaleType} from '../../../widgets/line_chart_v2/types';
import {
  cardViewBoxChanged,
  metricsCardFullSizeToggled,
  metricsCardStateUpdated,
  sortingDataTable,
  stepSelectorToggled,
  timeSelectionChanged,
  metricsSlideoutMenuOpened,
  dataTableColumnOrderChanged,
  dataTableColumnToggled,
} from '../../actions';
import {PluginType, ScalarStepDatum} from '../../data_source';
import {
  CardState,
  getCardLoadState,
  getCardMetadata,
  getCardTimeSeries,
  getMetricsCardMinMax,
  getMetricsIgnoreOutliers,
  getMetricsScalarPartitionNonMonotonicX,
  getMetricsScalarSmoothing,
  getMetricsTooltipSort,
  getMetricsXAxisType,
  RunToSeries,
} from '../../store';
import {
  CardId,
  CardMetadata,
  HeaderEditInfo,
  HeaderToggleInfo,
  XAxisType,
} from '../../types';
import {RunToHparamMap} from '../../../runs/types';
import {
  getFilteredRenderableRunsIds,
  getCurrentColumnFilters,
  getSelectableColumns,
} from '../main_view/common_selectors';
import {CardRenderer} from '../metrics_view_types';
import {getTagDisplayName} from '../utils';
import {DataDownloadDialogContainer} from './data_download_dialog_container';
import {
  MinMaxStep,
  PartialSeries,
  PartitionedSeries,
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
  SeriesType,
} from './scalar_card_types';
import {
  ColumnHeader,
  DataTableMode,
  SortingInfo,
  FilterAddedEvent,
  AddColumnEvent,
} from '../../../widgets/data_table/types';
import {
  maybeClipTimeSelectionView,
  partitionSeries,
  TimeSelectionView,
} from './utils';

type ScalarCardMetadata = CardMetadata & {
  plugin: PluginType.SCALARS;
};

function areSeriesEqual(
  listA: PartialSeries[],
  listB: PartialSeries[]
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
  standalone: false,
  selector: 'scalar-card',
  template: `
    <scalar-card-component
      [cardId]="cardId"
      [chartMetadataMap]="chartMetadataMap$ | async"
      [DataDownloadComponent]="DataDownloadComponent"
      [dataSeries]="dataSeries$ | async"
      [ignoreOutliers]="ignoreOutliers$ | async"
      [isCardVisible]="isVisible"
      [isPinned]="isPinned$ | async"
      [loadState]="loadState$ | async"
      [showFullWidth]="showFullWidth$ | async"
      [smoothingEnabled]="smoothingEnabled$ | async"
      [tag]="tag$ | async"
      [title]="title$ | async"
      [cardState]="cardState$ | async"
      [tooltipSort]="tooltipSort$ | async"
      [xAxisType]="xAxisType$ | async"
      [xScaleType]="xScaleType$ | async"
      [useDarkMode]="useDarkMode$ | async"
      [linkedTimeSelection]="linkedTimeSelection$ | async"
      [stepOrLinkedTimeSelection]="stepOrLinkedTimeSelection$ | async"
      [forceSvg]="forceSvg$ | async"
      [columnCustomizationEnabled]="columnCustomizationEnabled$ | async"
      [columnContextMenusEnabled]="columnContextMenusEnabled$ | async"
      [minMaxStep]="minMaxSteps$ | async"
      [userViewBox]="userViewBox$ | async"
      [columnHeaders]="columnHeaders$ | async"
      [rangeEnabled]="rangeEnabled$ | async"
      [columnFilters]="columnFilters$ | async"
      [runToHparamMap]="runToHparamMap$ | async"
      [selectableColumns]="selectableColumns$ | async"
      [numColumnsLoaded]="numColumnsLoaded$ | async"
      [numColumnsToLoad]="numColumnsToLoad$ | async"
      (onFullSizeToggle)="onFullSizeToggle()"
      (onPinClicked)="pinStateChanged.emit($event)"
      observeIntersection
      (onVisibilityChange)="onVisibilityChange($event)"
      (onTimeSelectionChanged)="onTimeSelectionChanged($event)"
      (onStepSelectorToggled)="onStepSelectorToggled($event)"
      (onDataTableSorting)="onDataTableSorting($event)"
      (onLineChartZoom)="onLineChartZoom($event)"
      (editColumnHeaders)="editColumnHeaders($event)"
      (onCardStateChanged)="onCardStateChanged($event)"
      (openTableEditMenuToMode)="openTableEditMenuToMode($event)"
      (addColumn)="onAddColumn($event)"
      (removeColumn)="onRemoveColumn($event)"
      (addFilter)="addHparamFilter($event)"
      (loadAllColumns)="loadAllColumns()"
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
export class ScalarCardContainer implements CardRenderer, OnInit, OnDestroy {
  constructor(private readonly store: Store<State>) {
    this.columnFilters$ = this.store.select(getCurrentColumnFilters);
    this.numColumnsLoaded$ = this.store.select(
      hparamsSelectors.getNumDashboardHparamsLoaded
    );
    this.numColumnsToLoad$ = this.store.select(
      hparamsSelectors.getNumDashboardHparamsToLoad
    );
    this.useDarkMode$ = this.store.select(getDarkModeEnabled);
    this.ignoreOutliers$ = this.store.select(getMetricsIgnoreOutliers);
    this.tooltipSort$ = this.store.select(getMetricsTooltipSort);
    this.xAxisType$ = this.store.select(getMetricsXAxisType);
    this.forceSvg$ = this.store.select(getForceSvgFeatureFlag);
    this.columnCustomizationEnabled$ = this.store.select(
      getIsScalarColumnCustomizationEnabled
    );
    this.columnContextMenusEnabled$ = this.store.select(
      getIsScalarColumnContextMenusEnabled
    );
    this.xScaleType$ = this.store.select(getMetricsXAxisType).pipe(
      map((xAxisType) => {
        switch (xAxisType) {
          case XAxisType.STEP:
          case XAxisType.RELATIVE:
            return ScaleType.LINEAR;
          case XAxisType.WALL_TIME:
            return ScaleType.TIME;
          default:
            const neverType = xAxisType as never;
            throw new Error(`Invalid xAxisType for line chart. ${neverType}`);
        }
      })
    );
    this.scalarSmoothing$ = this.store.select(getMetricsScalarSmoothing);
    this.smoothingEnabled$ = this.store
      .select(getMetricsScalarSmoothing)
      .pipe(map((smoothing) => smoothing > 0));
    this.showFullWidth$ = this.store
      .select(getCardStateMap)
      .pipe(map((map) => map[this.cardId]?.fullWidth));
  }

  // Angular Component constructor for DataDownload dialog. It is customizable for
  // testability, without mocking out data for the component's internals, but defaults to
  // the DataDownloadDialogContainer.
  @Input() DataDownloadComponent: ComponentType<any> =
    DataDownloadDialogContainer;
  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Output() pinStateChanged = new EventEmitter<boolean>();

  isVisible: boolean = false;
  loadState$?: Observable<DataLoadState>;
  title$?: Observable<string>;
  tag$?: Observable<string>;
  isPinned$?: Observable<boolean>;
  dataSeries$?: Observable<ScalarCardDataSeries[]>;
  chartMetadataMap$?: Observable<ScalarCardSeriesMetadataMap>;
  linkedTimeSelection$?: Observable<TimeSelectionView | null>;
  columnHeaders$?: Observable<ColumnHeader[]>;
  minMaxSteps$?: Observable<MinMaxStep | undefined>;
  userViewBox$?: Observable<Extent | null>;
  stepOrLinkedTimeSelection$?: Observable<TimeSelection | undefined>;
  cardState$?: Observable<Partial<CardState>>;
  rangeEnabled$?: Observable<boolean>;
  hparamsEnabled$?: Observable<boolean>;
  columnFilters$;
  runToHparamMap$?: Observable<RunToHparamMap>;
  selectableColumns$?: Observable<ColumnHeader[]>;
  numColumnsLoaded$;
  numColumnsToLoad$;

  onVisibilityChange({visible}: {visible: boolean}) {
    this.isVisible = visible;
  }

  readonly useDarkMode$;
  readonly ignoreOutliers$;
  readonly tooltipSort$;
  readonly xAxisType$;
  readonly forceSvg$;
  readonly columnCustomizationEnabled$;
  readonly columnContextMenusEnabled$;
  readonly xScaleType$;

  readonly scalarSmoothing$;
  readonly smoothingEnabled$;

  readonly showFullWidth$;

  private readonly ngUnsubscribe = new Subject<void>();

  private isScalarCardMetadata(
    cardMetadata: CardMetadata
  ): cardMetadata is ScalarCardMetadata {
    const {plugin} = cardMetadata;
    return plugin === PluginType.SCALARS;
  }

  onFullSizeToggle() {
    this.store.dispatch(metricsCardFullSizeToggled({cardId: this.cardId}));
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

    const nonNullRunsToScalarSeries$ = this.store
      .select(getCardTimeSeries, this.cardId)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        filter((runToSeries) => Boolean(runToSeries)),
        map((runToSeries) => runToSeries as RunToSeries<PluginType.SCALARS>),
        shareReplay(1)
      );

    const partialSeries$ = nonNullRunsToScalarSeries$.pipe(
      combineLatestWith(this.store.select(getMetricsXAxisType)),
      map(([runToSeries, xAxisType]) => {
        const runIds = Object.keys(runToSeries);
        const results = runIds.map((runId) => {
          return {
            runId,
            points: this.stepSeriesToLineSeries(runToSeries[runId], xAxisType),
          };
        });
        return results;
      }),
      distinctUntilChanged(areSeriesEqual)
    );

    function getSmoothedSeriesId(seriesId: string): string {
      return JSON.stringify(['smoothed', seriesId]);
    }

    const partitionedSeries$ = partialSeries$.pipe(
      combineLatestWith(
        this.store.select(getMetricsScalarPartitionNonMonotonicX)
      ),
      takeUntil(this.ngUnsubscribe),
      map<[PartialSeries[], boolean], PartitionedSeries[]>(
        ([normalizedSeries, enablePartition]) => {
          if (enablePartition) return partitionSeries(normalizedSeries);

          return normalizedSeries.map((series) => {
            return {
              ...series,
              seriesId: series.runId,
              partitionIndex: 0,
              partitionSize: 1,
            };
          });
        }
      ),
      map((partitionedSeriesList) => {
        return partitionedSeriesList.map((partitionedSeries) => {
          const firstWallTime = partitionedSeries.points[0]?.wallTime;
          return {
            ...partitionedSeries,
            points: partitionedSeries.points.map((point) => {
              return {
                ...point,
                relativeTimeInMs: point.wallTime - firstWallTime,
              };
            }),
          };
        });
      }),
      combineLatestWith(this.store.select(getMetricsXAxisType)),
      map(([partitionedSeriesList, xAxisType]) => {
        return partitionedSeriesList.map((series) => {
          return {
            ...series,
            points: series.points.map((point) => {
              let x: number;
              switch (xAxisType) {
                case XAxisType.RELATIVE:
                  x = point.relativeTimeInMs;
                  break;
                case XAxisType.WALL_TIME:
                  x = point.wallTime;
                  break;
                case XAxisType.STEP:
                default:
                  x = point.step;
              }
              return {...point, x};
            }),
          };
        });
      }),
      shareReplay(1)
    );

    this.userViewBox$ = this.store.select(
      getMetricsCardUserViewBox,
      this.cardId
    );

    this.minMaxSteps$ = combineLatest([
      this.store.select(getMetricsCardMinMax, this.cardId),
      this.store.select(getMetricsCardDataMinMax, this.cardId),
    ]).pipe(
      map(([minMax, dataMinMax]) => {
        if (!minMax || !dataMinMax) {
          return;
        }
        return {
          minStep: Math.max(minMax?.minStep!, dataMinMax?.minStep!),
          maxStep: Math.min(minMax?.maxStep!, dataMinMax?.maxStep!),
        };
      })
    );

    this.dataSeries$ = partitionedSeries$.pipe(
      // Smooth
      combineLatestWith(this.store.select(getMetricsScalarSmoothing)),
      switchMap<
        [PartitionedSeries[], number],
        Observable<ScalarCardDataSeries[]>
      >(([runsData, smoothing]) => {
        const cleanedRunsData = runsData.map(({seriesId, points}) => ({
          id: seriesId,
          points,
        }));
        if (smoothing <= 0) {
          return of(cleanedRunsData);
        }

        return from(classicSmoothing(cleanedRunsData, smoothing)).pipe(
          map((smoothedDataSeriesList) => {
            const smoothedList = cleanedRunsData.map((dataSeries, index) => {
              return {
                id: getSmoothedSeriesId(dataSeries.id),
                points: smoothedDataSeriesList[index].points.map(
                  ({y}, pointIndex) => {
                    return {...dataSeries.points[pointIndex], y};
                  }
                ),
              };
            });
            return [...cleanedRunsData, ...smoothedList];
          })
        );
      }),
      startWith([] as ScalarCardDataSeries[])
    );

    this.linkedTimeSelection$ = combineLatest([
      this.minMaxSteps$,
      this.store.select(getMetricsLinkedTimeEnabled),
      this.store.select(getMetricsLinkedTimeSelection),
      this.store.select(getMetricsXAxisType),
    ]).pipe(
      map(([minMax, linkedTimeEnabled, timeSelection, xAxisType]) => {
        if (
          !minMax ||
          !linkedTimeEnabled ||
          xAxisType !== XAxisType.STEP ||
          !timeSelection
        ) {
          return null;
        }

        return maybeClipTimeSelectionView(
          timeSelection,
          minMax.minStep,
          minMax.maxStep
        );
      })
    );

    this.stepOrLinkedTimeSelection$ = this.store.select(
      getMetricsCardTimeSelection,
      this.cardId
    );

    this.columnHeaders$ = this.store.select(
      getGroupedHeadersForCard(this.cardId)
    );

    this.chartMetadataMap$ = partitionedSeries$.pipe(
      switchMap<
        PartitionedSeries[],
        Observable<
          Array<
            PartitionedSeries & {
              displayName: string;
              alias: ExperimentAlias | null;
            }
          >
        >
      >((partitioned) => {
        return combineLatest(
          partitioned.map((series) => {
            return this.getRunDisplayNameAndAlias(series.runId).pipe(
              map((displayNameAndAlias) => {
                return {...series, ...displayNameAndAlias};
              })
            );
          })
        );
      }),
      combineLatestWith(
        this.store.select(getCurrentRouteRunSelection),
        this.store.select(getFilteredRenderableRunsIds),
        this.store.select(getRunColorMap),
        this.store.select(getMetricsScalarSmoothing)
      ),
      // When the `fetchRunsSucceeded` action fires, the run selection
      // map and the metadata change. To prevent quick fire of changes,
      // debounce by a microtask to emit only single change for the runs
      // store change.
      debounceTime(0),
      map(
        ([
          namedPartitionedSeries,
          runSelectionMap,
          renderableRuns,
          colorMap,
          smoothing,
        ]) => {
          const metadataMap: ScalarCardSeriesMetadataMap = {};
          const shouldSmooth = smoothing > 0;

          for (const partitioned of namedPartitionedSeries) {
            const {
              seriesId,
              runId,
              displayName,
              alias,
              partitionIndex,
              partitionSize,
            } = partitioned;

            metadataMap[seriesId] = {
              type: SeriesType.ORIGINAL,
              id: seriesId,
              alias,
              displayName:
                partitionSize > 1
                  ? `${displayName}: ${partitionIndex}`
                  : displayName,
              visible: Boolean(
                runSelectionMap &&
                  runSelectionMap.get(runId) &&
                  renderableRuns.has(runId)
              ),
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
            };

            metadata.aux = true;
            metadata.opacity = 0.25;
          }

          return metadataMap;
        }
      ),
      startWith({} as ScalarCardSeriesMetadataMap)
    );

    this.loadState$ = this.store.select(getCardLoadState, this.cardId);

    this.tag$ = cardMetadata$.pipe(
      map((cardMetadata) => {
        return cardMetadata.tag;
      })
    );

    this.cardState$ = this.store.select(getCardStateMap).pipe(
      map((cardStateMap) => {
        return cardStateMap[this.cardId] || {};
      })
    );

    this.title$ = this.tag$.pipe(
      map((tag) => {
        return getTagDisplayName(tag, this.groupName);
      })
    );

    this.isPinned$ = this.store.select(getCardPinnedState, this.cardId);

    this.rangeEnabled$ = this.store.select(
      getMetricsCardRangeSelectionEnabled(this.cardId)
    );

    this.runToHparamMap$ = this.store.select(getRunToHparamMap);

    this.selectableColumns$ = this.store.select(getSelectableColumns);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private getRunDisplayNameAndAlias(
    runId: string
  ): Observable<{displayName: string; alias: ExperimentAlias | null}> {
    return combineLatest([
      this.store.select(getExperimentIdForRunId, {runId}),
      this.store.select(getExperimentIdToExperimentAliasMap),
      this.store.select(getRun, {runId}),
    ]).pipe(
      map(([experimentId, idToAlias, run]) => {
        const alias =
          experimentId !== null ? idToAlias[experimentId] ?? null : null;
        return {
          displayName: !run && !alias ? runId : run?.name ?? '...',
          alias: alias,
        };
      })
    );
  }

  private stepSeriesToLineSeries(
    stepSeries: ScalarStepDatum[],
    xAxisType: XAxisType
  ): ScalarCardPoint[] {
    const isStepBased = xAxisType === XAxisType.STEP;
    return stepSeries.map((stepDatum) => {
      // Normalize data and convert wallTime in seconds to milliseconds.
      // TODO(stephanwlee): when the legacy line chart is removed, do the conversion
      // at the effects.
      const wallTime = stepDatum.wallTime * 1000;
      return {
        ...stepDatum,
        x: isStepBased ? stepDatum.step : wallTime,
        y: stepDatum.value,
        wallTime,
        // Put a fake relative time so we can work around with types too much.
        // The real value would be set after we partition the timeseries so
        // we can have a relative time per partition.
        relativeTimeInMs: 0,
      };
    });
  }

  onDataTableSorting(sortingInfo: SortingInfo) {
    this.store.dispatch(sortingDataTable(sortingInfo));
  }

  onCardStateChanged(newSettings: Partial<CardState>) {
    this.store.dispatch(
      metricsCardStateUpdated({
        cardId: this.cardId,
        settings: newSettings,
      })
    );
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

  editColumnHeaders({
    source,
    destination,
    side,
    dataTableMode,
  }: HeaderEditInfo) {
    if (source.type === 'HPARAM') {
      this.store.dispatch(
        hparamsActions.dashboardHparamColumnOrderChanged({
          source,
          destination,
          side,
        })
      );
    } else {
      this.store.dispatch(
        dataTableColumnOrderChanged({source, destination, side, dataTableMode})
      );
    }
  }

  openTableEditMenuToMode(tableMode: DataTableMode) {
    this.store.dispatch(metricsSlideoutMenuOpened({mode: tableMode}));
  }

  onAddColumn(addColumnEvent: AddColumnEvent) {
    this.store.dispatch(
      hparamsActions.dashboardHparamColumnAdded(addColumnEvent)
    );
  }

  onRemoveColumn({header, dataTableMode}: HeaderToggleInfo) {
    if (header.type === 'HPARAM') {
      this.store.dispatch(
        hparamsActions.dashboardHparamColumnRemoved({column: header})
      );
    } else {
      this.store.dispatch(
        dataTableColumnToggled({header, cardId: this.cardId, dataTableMode})
      );
    }
  }

  addHparamFilter(event: FilterAddedEvent) {
    this.store.dispatch(
      hparamsActions.dashboardHparamFilterAdded({
        name: event.name,
        filter: event.value,
      })
    );
  }

  loadAllColumns() {
    this.store.dispatch(hparamsActions.loadAllDashboardHparams());
  }
}
