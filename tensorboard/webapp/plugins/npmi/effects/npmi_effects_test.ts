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
import {Subject} from 'rxjs';
import {NpmiEffects} from '.';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {TBHttpClientTestingModule} from '../../../webapp_data_source/tb_http_client_testing';
import * as actions from '../actions';
import {NpmiHttpServerDataSource} from '../data_source/npmi_data_source';
import {getPluginDataLoaded} from '../store/npmi_selectors';
import {
  AnnotationDataListing,
  DataLoadState,
  EmbeddingDataSet,
  MetricListing,
} from '../store/npmi_types';
import {createNpmiState, createSampleEmbeddingData} from '../testing';

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
    store.overrideSelector(getPluginDataLoaded, DataLoadState.NOT_LOADED);
    store.overrideSelector(selectors.getExperimentIdsFromRoute, ['exp1']);
    effects.loadData$.subscribe();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('load Plugin Data', () => {
    let fetchDataSpy: jasmine.Spy;
    let fetchDataSubject: Subject<{
      annotationData: AnnotationDataListing;
      metrics: MetricListing;
      embeddingDataSet: EmbeddingDataSet;
    }>;

    beforeEach(() => {
      fetchDataSubject = new Subject();
      fetchDataSpy = spyOn(dataSource, 'fetchData').and.returnValue(
        fetchDataSubject
      );
    });

    it('loads Plugin Data on plugin open if data is not loaded', () => {
      expect(fetchDataSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);
      const embeddingDataSet = createSampleEmbeddingData();

      actions$.next(actions.npmiLoaded());
      fetchDataSubject.next({
        annotationData: {
          annotation_new_1: [
            {
              nPMIValue: 0.1687,
              countValue: 1671,
              annotation: 'annotation_1',
              metric: 'newtest1',
              run: 'run_1',
            },
          ],
          annotation_new_2: [
            {
              nPMIValue: 0.68761,
              countValue: 189,
              annotation: 'annotation_1',
              metric: 'newtest1',
              run: 'run_1',
            },
          ],
        },
        metrics: {run_1: ['count@test', 'npmi@test']},
        embeddingDataSet,
      });

      expect(fetchDataSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiPluginDataRequested(),
        actions.npmiPluginDataLoaded({
          annotationData: {
            annotation_new_1: [
              {
                nPMIValue: 0.1687,
                countValue: 1671,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
            ],
            annotation_new_2: [
              {
                nPMIValue: 0.68761,
                countValue: 189,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
            ],
          },
          metrics: {run_1: ['count@test', 'npmi@test']},
          embeddingDataSet,
        }),
      ]);
    });

    it('fails to load Metrics and Values on plugin open', () => {
      expect(fetchDataSpy).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);

      actions$.next(actions.npmiLoaded());
      fetchDataSubject.error('loading failed');

      expect(fetchDataSpy).toHaveBeenCalled();
      expect(actualActions).toEqual([
        actions.npmiPluginDataRequested(),
        actions.npmiPluginDataRequestFailed(),
      ]);
    });
  });
});
