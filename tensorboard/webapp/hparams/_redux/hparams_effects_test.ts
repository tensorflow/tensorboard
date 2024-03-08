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

import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';

import {HparamsEffects} from './hparams_effects';
import {State} from '../../app_state';
import {provideMockTbStore} from '../../testing/utils';
import {HparamsDataSource} from './hparams_data_source';
import {of, ReplaySubject} from 'rxjs';
import {buildHparamSpec} from './testing';
import {HparamSpec, RunStatus, SessionGroup} from '../types';
import * as selectors from '../../selectors';
import * as hparamsActions from './hparams_actions';
import * as hparamsSelectors from './hparams_selectors';
import * as appRoutingActions from '../../app_routing/actions';
import * as coreActions from '../../core/actions';
import {RouteKind} from '../../app_routing/types';

function mockHparamsDataSourceFactory() {
  return jasmine.createSpyObj<HparamsDataSource>('HparamsDataSource', [
    'fetchExperimentInfo',
    'fetchSessionGroups',
  ]);
}

describe('hparams effects', () => {
  let dataSource: jasmine.SpyObj<HparamsDataSource>;
  let store: MockStore<State>;
  let effects: HparamsEffects;
  let action: ReplaySubject<Action>;
  let dispatchSpy: jasmine.Spy;
  let actualActions: Action[];

  let mockHparamSpecs: HparamSpec[];
  let mockSessionGroups: SessionGroup[];

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      providers: [
        provideMockActions(action),
        HparamsEffects,
        provideMockTbStore(),
        {provide: HparamsDataSource, useFactory: mockHparamsDataSourceFactory},
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    actualActions = [];
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });

    effects = TestBed.inject(HparamsEffects);
    dataSource = TestBed.inject(
      HparamsDataSource
    ) as jasmine.SpyObj<HparamsDataSource>;

    mockHparamSpecs = [buildHparamSpec({name: 'h1'})];
    mockSessionGroups = [
      {
        name: 'session_group_1',
        hparams: {
          hparam1: 1,
          hparam2: 'abc',
        },
        sessions: [
          {
            name: 'exp1/run1',
            status: RunStatus.STATUS_UNKNOWN,
            metricValues: [] as any,
            modelUri: '',
            monitorUrl: '',
            startTimeSecs: 123,
            endTimeSecs: 456,
          },
        ],
      },
    ];

    dataSource.fetchExperimentInfo.and.returnValue(of(mockHparamSpecs));

    dataSource.fetchSessionGroups.and.returnValue(of(mockSessionGroups));
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('loadHparamsData$', () => {
    beforeEach(() => {
      effects.loadHparamsData$.subscribe((action) => {
        actualActions.push(action);
      });
      store.overrideSelector(selectors.getActiveRoute, {
        routeKind: RouteKind.EXPERIMENT,
        params: {},
      });
      store.overrideSelector(selectors.getExperimentIdsFromRoute, [
        'expFromRoute',
      ]);
      store.overrideSelector(
        hparamsSelectors.getNumDashboardHparamsToLoad,
        1111
      );
      store.refreshState();
    });

    it('does not dispatch requests when on experiments route', () => {
      store.overrideSelector(selectors.getActiveRoute, {
        routeKind: RouteKind.EXPERIMENTS,
        params: {},
      });
      store.refreshState();

      action.next(appRoutingActions.navigated({} as any));
      expect(dataSource.fetchExperimentInfo).not.toHaveBeenCalled();
      expect(dataSource.fetchSessionGroups).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);
    });

    it('fetches data after navigation', () => {
      action.next(appRoutingActions.navigated({} as any));
      expect(dataSource.fetchExperimentInfo).toHaveBeenCalledWith(
        ['expFromRoute'],
        1111
      );
      expect(dataSource.fetchSessionGroups).toHaveBeenCalledWith(
        ['expFromRoute'],
        [buildHparamSpec({name: 'h1'})]
      );
      expect(actualActions).toEqual([
        hparamsActions.hparamsFetchSessionGroupsSucceeded({
          hparamSpecs: mockHparamSpecs,
          sessionGroups: mockSessionGroups,
        }),
      ]);
    });

    it('does not fetch data when navigating to the same experiment', () => {
      action.next(appRoutingActions.navigated({} as any));
      action.next(appRoutingActions.navigated({} as any));
      expect(actualActions).toEqual([
        hparamsActions.hparamsFetchSessionGroupsSucceeded({
          hparamSpecs: mockHparamSpecs,
          sessionGroups: mockSessionGroups,
        }),
      ]);
    });

    for (const {actionName, actionInstance} of [
      {actionName: 'reload', actionInstance: coreActions.reload()},
      {actionName: 'manualReload', actionInstance: coreActions.manualReload()},
      {
        actionName: 'loadAllDashboardHparams',
        actionInstance: hparamsActions.loadAllDashboardHparams(),
      },
    ]) {
      it(`fetches data on ${actionName}`, () => {
        action.next(actionInstance);
        expect(dataSource.fetchExperimentInfo).toHaveBeenCalledWith(
          ['expFromRoute'],
          1111
        );
        expect(dataSource.fetchSessionGroups).toHaveBeenCalledWith(
          ['expFromRoute'],
          [buildHparamSpec({name: 'h1'})]
        );
        expect(actualActions).toEqual([
          hparamsActions.hparamsFetchSessionGroupsSucceeded({
            hparamSpecs: mockHparamSpecs,
            sessionGroups: mockSessionGroups,
          }),
        ]);
      });
    }

    it('does not attempt to load hparams when experiment ids are null', () => {
      store.overrideSelector(selectors.getExperimentIdsFromRoute, null);
      store.refreshState();

      action.next(coreActions.reload());

      expect(dataSource.fetchExperimentInfo).not.toHaveBeenCalled();
      expect(dataSource.fetchSessionGroups).not.toHaveBeenCalled();
      expect(actualActions).toEqual([]);
    });
  });
});
