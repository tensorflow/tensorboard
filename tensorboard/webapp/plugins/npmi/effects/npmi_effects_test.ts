<<<<<<< HEAD
import {MetricListing} from './../store/npmi_types';
=======
>>>>>>> 7dcbfe1126cc9c49a6c9b9fede31bdb608beb2ff
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
import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {TBHttpClientTestingModule} from '../../../webapp_data_source/tb_http_client_testing';
import {Subject} from 'rxjs';

import {NpmiHttpServerDataSource} from '../data_source/npmi_data_source';
import {NpmiEffects} from '.';
import {createNpmiState} from '../testing';
import {State} from '../../../app_state';
import {
  DataLoadState,
  AnnotationListing,
  ValueListing,
} from '../store/npmi_types';
<<<<<<< HEAD
import {getPluginDataLoaded} from '../store/npmi_selectors';
=======
import {
  getAnnotationsLoaded,
  getMetricsAndValuesLoaded,
} from '../store/npmi_selectors';
>>>>>>> 7dcbfe1126cc9c49a6c9b9fede31bdb608beb2ff
import * as actions from '../actions';

describe('npmi effects', () => {
  let dataSource: NpmiHttpServerDataSource;
  let effects: NpmiEffects;
  let store: MockStore<State>;
  let actions$: Subject<Action>;
  let actualActions: Action[] = [];

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    actualActions = [];

    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(actions$),
        {
          provide: NpmiHttpServerDataSource,
        },
        NpmiEffects,
        provideMockStore({
          initialState: createNpmiState(),
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(NpmiEffects);
    dataSource = TestBed.inject(NpmiHttpServerDataSource);
<<<<<<< HEAD
    store.overrideSelector(getPluginDataLoaded, {
=======
    store.overrideSelector(getAnnotationsLoaded, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
    store.overrideSelector(getMetricsAndValuesLoaded, {
>>>>>>> 7dcbfe1126cc9c49a6c9b9fede31bdb608beb2ff
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
    effects.loadData$.subscribe();
  });

<<<<<<< HEAD
  describe('load Plugin Data', () => {
    let fetchDataSpy: jasmine.Spy;
    let fetchDataSubject: Subject<
      [AnnotationListing, MetricListing, ValueListing]
    >;

    beforeEach(() => {
      fetchDataSubject = new Subject();
      fetchDataSpy = spyOn(dataSource, 'fetchData').and.returnValue(
        fetchDataSubject
      );
    });

    it('loads Plugin Data on plugin open if data is not loaded', () => {
      expect(fetchDataSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchDataSubject.next([
        {run_1: ['annotation_1', 'annotation_2']},
        {run_1: ['count@test', 'npmi@test']},
        {run_1: [[0.001, 0.061], [-0.515, 0.15719]]},
      ]);

      expect(fetchDataSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiPluginDataRequested(),
        actions.npmiPluginDataLoaded({
          annotations: {run_1: ['annotation_1', 'annotation_2']},
=======
  describe('load Annotations', () => {
    let fetchAnnotationsSpy: jasmine.Spy;
    let fetchAnnotationsSubject: Subject<AnnotationListing>;

    beforeEach(() => {
      fetchAnnotationsSubject = new Subject();
      fetchAnnotationsSpy = spyOn(
        dataSource,
        'fetchAnnotations'
      ).and.returnValue(fetchAnnotationsSubject);
    });

    it('loads Annotations on plugin open if data is not loaded', () => {
      expect(fetchAnnotationsSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchAnnotationsSubject.next({run_1: ['test_1', 'test_2']});

      expect(fetchAnnotationsSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiAnnotationsRequested(),
        actions.npmiMetricsAndValuesRequested(),
        actions.npmiAnnotationsLoaded({
          annotations: {run_1: ['test_1', 'test_2']},
        }),
      ]);
    });

    it('fails to load Annotations on plugin open', () => {
      expect(fetchAnnotationsSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchAnnotationsSubject.error('loading failed');

      expect(fetchAnnotationsSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiAnnotationsRequested(),
        actions.npmiMetricsAndValuesRequested(),
        actions.npmiAnnotationsRequestFailed(),
      ]);
    });
  });

  describe('load Metrics and Values', () => {
    let fetchMetricsSpy: jasmine.Spy;
    let fetchMetricsSubject: Subject<AnnotationListing>;
    let fetchValuesSpy: jasmine.Spy;
    let fetchValuesSubject: Subject<ValueListing>;

    beforeEach(() => {
      fetchMetricsSubject = new Subject();
      fetchValuesSubject = new Subject();
      fetchMetricsSpy = spyOn(dataSource, 'fetchMetrics').and.returnValue(
        fetchMetricsSubject
      );
      fetchValuesSpy = spyOn(dataSource, 'fetchValues').and.returnValue(
        fetchValuesSubject
      );
    });

    it('loads Metrics and Values on plugin open if data is not loaded', () => {
      expect(fetchMetricsSpy).not.toHaveBeenCalled();
      expect(fetchValuesSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchMetricsSubject.next({run_1: ['count@test', 'npmi@test']});
      fetchMetricsSubject.complete();
      fetchValuesSubject.next({run_1: [[0.001, 0.061], [-0.515, 0.15719]]});
      fetchValuesSubject.complete();

      expect(fetchMetricsSpy).toHaveBeenCalled();
      expect(fetchValuesSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiAnnotationsRequested(),
        actions.npmiMetricsAndValuesRequested(),
        actions.npmiMetricsAndValuesLoaded({
>>>>>>> 7dcbfe1126cc9c49a6c9b9fede31bdb608beb2ff
          values: {run_1: [[0.001, 0.061], [-0.515, 0.15719]]},
          metrics: {run_1: ['count@test', 'npmi@test']},
        }),
      ]);
    });

    it('fails to load Metrics and Values on plugin open', () => {
<<<<<<< HEAD
      expect(fetchDataSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchDataSubject.error('loading failed');

      expect(fetchDataSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiPluginDataRequested(),
        actions.npmiPluginDataRequestFailed(),
=======
      expect(fetchMetricsSpy).not.toHaveBeenCalled();
      expect(fetchValuesSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchMetricsSubject.error('loading failed');
      fetchValuesSubject.complete();
      fetchValuesSubject.next({run_1: [[0.001, 0.061], [-0.515, 0.15719]]});
      fetchValuesSubject.complete();

      expect(fetchMetricsSpy).toHaveBeenCalled();
      expect(fetchValuesSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiAnnotationsRequested(),
        actions.npmiMetricsAndValuesRequested(),
        actions.npmiMetricsAndValuesRequestFailed(),
>>>>>>> 7dcbfe1126cc9c49a6c9b9fede31bdb608beb2ff
      ]);
    });
  });
});
