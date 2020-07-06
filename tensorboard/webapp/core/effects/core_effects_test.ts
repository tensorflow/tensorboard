/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Subject, ReplaySubject, of} from 'rxjs';

import {CoreEffects} from './core_effects';
import * as coreActions from '../actions';
import {State} from '../../app_state';

import {
  createEnvironment,
  createPluginMetadata,
  createState,
  createCoreState,
} from '../testing';
import {Run} from '../types';

import {PluginsListing} from '../../types/api';
import {DataLoadState} from '../../types/data';
import {TBServerDataSource} from '../../webapp_data_source/tb_server_data_source';
import {getEnabledExperimentalPlugins} from '../../feature_flag/store/feature_flag_selectors';
import {
  TBHttpClientTestingModule,
  HttpTestingController,
} from '../../webapp_data_source/tb_http_client_testing';

describe('core_effects', () => {
  let httpMock: HttpTestingController;
  let coreEffects: CoreEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<Partial<State>>;
  let fetchEnvironment: jasmine.Spy;
  let fetchRunsSubjects: Array<Subject<Array<Run>>>;
  let recordedActions: Action[] = [];

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    const initialState = createState(
      createCoreState({
        pluginsListLoaded: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
      })
    );
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(action),
        CoreEffects,
        TBServerDataSource,
        provideMockStore({initialState}),
      ],
    }).compileComponents();
    coreEffects = TestBed.inject(CoreEffects);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });

    const dataSource = TestBed.inject(TBServerDataSource);
    fetchEnvironment = spyOn(dataSource, 'fetchEnvironment')
      .withArgs()
      .and.returnValue(of(createEnvironment()));
    fetchRunsSubjects = [];
    spyOn(dataSource, 'fetchRuns').and.callFake(() => {
      const fetchRunSubject = new Subject<Array<Run>>();
      fetchRunsSubjects.push(fetchRunSubject);
      return fetchRunSubject;
    });

    store.overrideSelector(getEnabledExperimentalPlugins, []);
  });

  afterEach(() => {
    httpMock.verify();
  });

  [
    {specSetName: '#coreLoaded', onAction: coreActions.coreLoaded()},
    {specSetName: '#reload', onAction: coreActions.reload()},
    {specSetName: '#manualReload', onAction: coreActions.manualReload()},
  ].forEach(({specSetName, onAction}) => {
    describe(specSetName, () => {
      beforeEach(() => {
        coreEffects.fetchWebAppData$.subscribe(() => {});
      });

      it('fetches webapp data and fires success action', () => {
        store.overrideSelector(getEnabledExperimentalPlugins, []);
        store.refreshState();

        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(onAction);

        fetchRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchRunsSubjects[0].complete();
        // Flushing the request response invokes above subscription sychronously.
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        expect(fetchEnvironment).toHaveBeenCalled();

        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.fetchRunSucceeded({
            runs: [{id: '1', name: 'Run 1'}],
          }),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
        ]);
      });

      it(
        'appends query params to the data/plugins_listing when ' +
          'getEnabledExperimentalPlugins is non-empty',
        () => {
          store.overrideSelector(getEnabledExperimentalPlugins, [
            'alpha',
            'beta',
          ]);
          store.refreshState();

          const pluginsListing: PluginsListing = {
            core: createPluginMetadata('Core'),
          };

          action.next(onAction);
          // Flushing the request response invokes above subscription sychronously.
          httpMock
            .expectOne(
              'data/plugins_listing?experimentalPlugin=alpha&' +
                'experimentalPlugin=beta'
            )
            .flush(pluginsListing);

          fetchRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
          fetchRunsSubjects[0].complete();
          expect(fetchEnvironment).toHaveBeenCalled();

          expect(recordedActions).toEqual([
            coreActions.pluginsListingRequested(),
            coreActions.environmentLoaded({
              environment: createEnvironment(),
            }),
            coreActions.fetchRunSucceeded({
              runs: [{id: '1', name: 'Run 1'}],
            }),
            coreActions.pluginsListingLoaded({
              plugins: pluginsListing,
            }),
          ]);
        }
      );

      it('ignores the action when loadState is loading', () => {
        store.setState(
          createState(
            createCoreState({
              pluginsListLoaded: {
                state: DataLoadState.LOADING,
                lastLoadedTimeInMs: null,
              },
            })
          )
        );
        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');

        expect(recordedActions).toEqual([]);

        store.setState(
          createState(
            createCoreState({
              pluginsListLoaded: {
                state: DataLoadState.FAILED,
                lastLoadedTimeInMs: null,
              },
            })
          )
        );

        action.next(onAction);
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);
        fetchRunsSubjects[0].next([{id: '1', name: 'Run 1'}]);
        fetchRunsSubjects[0].complete();
        expect(recordedActions).toEqual([
          coreActions.pluginsListingRequested(),
          coreActions.environmentLoaded({
            environment: createEnvironment(),
          }),
          coreActions.fetchRunSucceeded({
            runs: [{id: '1', name: 'Run 1'}],
          }),
          coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          }),
        ]);

        store.setState(
          createState(
            createCoreState({
              pluginsListLoaded: {
                state: DataLoadState.LOADING,
                lastLoadedTimeInMs: null,
              },
            })
          )
        );

        action.next(onAction);
        httpMock.expectNone('data/plugins_listing');
      });
    });
  });
});
