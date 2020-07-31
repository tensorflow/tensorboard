import {
  State,
  AnnotationListing,
  MetricListing,
  ValueListing,
} from './../store/npmi_types';
import {
  getAnnotationsLoaded,
  getMetricsLoaded,
  getValuesLoaded,
  getMetricsData,
} from './../store/npmi_selectors';
import {
  npmiLoaded,
  annotationsRequested,
  annotationsLoaded,
  metricsRequested,
  metricsLoaded,
  valuesRequested,
  valuesLoaded,
} from './../actions';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {merge, Observable} from 'rxjs';
import {
  filter,
  map,
  mergeMap,
  tap,
  withLatestFrom,
  share,
} from 'rxjs/operators';
import {DataLoadState} from '../store/npmi_types';
import {NpmiHttpServerDataSource} from '../data_source/npmi_data_source';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

@Injectable()
export class NpmiEffects {
  /**
   * Observable that loads:
   * - runs list
   * - number of executions
   * - execution digest
   * - execution details
   */
  /** @export */
  readonly loadData$: Observable<{}>;

  private loadAnnotations() {
    return this.actions$.pipe(
      ofType(npmiLoaded),
      withLatestFrom(this.store.select(getAnnotationsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(annotationsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchAnnotations().pipe(
          tap((annotations: AnnotationListing) => {
            this.store.dispatch(annotationsLoaded({annotations: annotations}));
          }),
          map(() => void null)
        );
      })
    );
  }

  private loadMetrics() {
    return this.actions$.pipe(
      ofType(npmiLoaded),
      withLatestFrom(this.store.select(getMetricsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(metricsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchMetrics().pipe(
          tap((metrics: MetricListing) => {
            this.store.dispatch(metricsLoaded({metrics: metrics}));
          }),
          map(() => void null)
        );
      })
    );
  }

  private loadValues(prevStream$: Observable<unknown>) {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getMetricsData),
        this.store.select(getValuesLoaded)
      ),
      filter(([, , {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(valuesRequested())),
      mergeMap(([, metrics]) => {
        return this.dataSource.fetchValues().pipe(
          tap((values: ValueListing) => {
            this.store.dispatch(
              valuesLoaded({
                values: values,
                metrics: metrics,
              })
            );
          }),
          map(() => void null)
        );
      })
    );
  }

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private dataSource: NpmiHttpServerDataSource
  ) {
    this.loadData$ = createEffect(
      () => {
        const loadAnnogationsData$ = this.loadAnnotations();
        const loadMetricsData$ = this.loadMetrics().pipe(share());
        const loadValuesData$ = this.loadValues(loadMetricsData$);

        return merge(
          loadAnnogationsData$,
          loadMetricsData$,
          loadValuesData$
        ).pipe(map(() => ({})));
      },
      {dispatch: false}
    );
  }
}
