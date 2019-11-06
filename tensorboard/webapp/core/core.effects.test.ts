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
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {ReplaySubject, of} from 'rxjs';

import {CoreEffects} from './core.effects';
import * as coreActions from './core.actions';
import {CoreService} from './core.service';
import {State, getPluginsListLoaded, LoadState} from './core.reducers';

import {createPluginMetadata, createState, createCoreState} from './testing';

import {PluginsListing, LoadState as DataLoadState} from '../types/api';

describe('core.effects', () => {
  let httpMock: HttpTestingController;
  let coreEffects: CoreEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<State>;
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
      imports: [HttpClientTestingModule],
      providers: [
        provideMockActions(action),
        CoreEffects,
        CoreService,
        provideMockStore({initialState}),
      ],
    }).compileComponents();
    coreEffects = TestBed.get(CoreEffects);
    httpMock = TestBed.get(HttpTestingController);
    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch');

    const coreService = TestBed.get(CoreService);
    fetchRuns = spyOn(coreService, 'fetchRuns')
      .withArgs()
      .and.returnValue(of(null));
    fetchEnvironments = spyOn(coreService, 'fetchEnvironments')
      .withArgs()
      .and.returnValue(of(null));
  });

  afterEach(() => {
    httpMock.verify();
  });

  [
    {specSetName: '#coreLoaded', onAction: coreActions.coreLoaded()},
    {specSetName: '#reload', onAction: coreActions.reload()},
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
