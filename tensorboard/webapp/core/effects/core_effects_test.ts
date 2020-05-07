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
import {ReplaySubject, of} from 'rxjs';

import {CoreEffects} from './core_effects';
import * as coreActions from '../actions';
import {State} from '../../app_state';

import {createPluginMetadata, createState, createCoreState} from '../testing';

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
  let fetchRuns: jasmine.Spy;
  let fetchEnvironments: jasmine.Spy;
  let dispatchSpy: jasmine.Spy;

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
    dispatchSpy = spyOn(store, 'dispatch');

    const dataSource = TestBed.inject(TBServerDataSource);
    fetchRuns = spyOn(dataSource, 'fetchRuns')
      .withArgs()
      .and.returnValue(of(null));
    fetchEnvironments = spyOn(dataSource, 'fetchEnvironments')
      .withArgs()
      .and.returnValue(of(null));

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
      let recordedActions: Action[] = [];

      beforeEach(() => {
        recordedActions = [];
        coreEffects.loadPluginsListing$.subscribe((action: Action) => {
          recordedActions.push(action);
        });
      });

      it('fetches plugins listing and fires success action', () => {
        store.overrideSelector(getEnabledExperimentalPlugins, []);
        store.refreshState();

        const pluginsListing: PluginsListing = {
          core: createPluginMetadata('Core'),
        };

        action.next(onAction);
        // Flushing the request response invokes above subscription sychronously.
        httpMock.expectOne('data/plugins_listing').flush(pluginsListing);

        expect(fetchRuns).toHaveBeenCalled();
        expect(fetchEnvironments).toHaveBeenCalled();

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalledWith(
          coreActions.pluginsListingRequested()
        );

        const expected = coreActions.pluginsListingLoaded({
          plugins: pluginsListing,
        });
        expect(recordedActions).toEqual([expected]);
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

          expect(fetchRuns).toHaveBeenCalled();
          expect(fetchEnvironments).toHaveBeenCalled();

          expect(dispatchSpy).toHaveBeenCalledTimes(1);
          expect(dispatchSpy).toHaveBeenCalledWith(
            coreActions.pluginsListingRequested()
          );

          const expected = coreActions.pluginsListingLoaded({
            plugins: pluginsListing,
          });
          expect(recordedActions).toEqual([expected]);
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

        expect(dispatchSpy).not.toHaveBeenCalled();

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

        const expected = coreActions.pluginsListingLoaded({
          plugins: pluginsListing,
        });
        expect(recordedActions).toEqual([expected]);

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
