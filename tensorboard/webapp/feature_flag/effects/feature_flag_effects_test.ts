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
import {ReplaySubject} from 'rxjs';

import {State} from '../store/feature_flag_types';
import {
  TBFeatureFlagTestingModule,
  TestingTBFeatureFlagDataSource,
} from '../../webapp_data_source/tb_feature_flag_testing';
import {FeatureFlagEffects} from './feature_flag_effects';
import {featuresLoaded} from '../actions/feature_flag_actions';

describe('feature_flag_effects', () => {
  let actions: ReplaySubject<Action>;
  let store: MockStore<State>;
  let dataSource: TestingTBFeatureFlagDataSource;
  let effects: FeatureFlagEffects;

  beforeEach(async () => {
    actions = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [TBFeatureFlagTestingModule],
      providers: [
        provideMockActions(actions),
        FeatureFlagEffects,
        provideMockStore(),
      ],
    }).compileComponents();
    effects = TestBed.inject(FeatureFlagEffects);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dataSource = TestBed.inject(TestingTBFeatureFlagDataSource);
  });

  describe('getFeatureFlags$', () => {
    let recordedActions: Action[];

    beforeEach(() => {
      recordedActions = [];
      effects.getFeatureFlags$.subscribe((action) => {
        recordedActions.push(action);
      });
    });

    it('loads features from the data source on init', () => {
      spyOn(dataSource, 'getFeatures').and.returnValue({
        enabledExperimentalPlugins: ['foo', 'bar'],
      });

      actions.next(effects.ngrxOnInitEffects());

      expect(recordedActions).toEqual([
        featuresLoaded({
          features: {
            enabledExperimentalPlugins: ['foo', 'bar'],
          },
        }),
      ]);
    });
  });
});
