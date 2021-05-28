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

import {Injectable, NgModule} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action} from '@ngrx/store';
import {ReplaySubject} from 'rxjs';

import {
  TBFeatureFlagDataSource,
  TbFeatureFlagDataSources,
  TBFeatureFlagTestingModule,
  TestingTBFeatureFlagDataSource,
} from '../../webapp_data_source/tb_feature_flag_testing';
import {partialFeatureFlagsLoaded} from '../actions/feature_flag_actions';
import {buildFeatureFlag} from '../testing';
import {FeatureFlags} from '../types';
import {FeatureFlagEffects} from './feature_flag_effects';

@Injectable()
export class OneFeatureFlagDataSource extends TBFeatureFlagDataSource {
  getFeatures(): Partial<FeatureFlags> {
    return buildFeatureFlag();
  }
}

@Injectable()
export class TwoFeatureFlagDataSource extends TBFeatureFlagDataSource {
  getFeatures(): Partial<FeatureFlags> {
    return buildFeatureFlag();
  }
}

@NgModule({
  providers: [
    OneFeatureFlagDataSource,
    {
      provide: TbFeatureFlagDataSources,
      useExisting: OneFeatureFlagDataSource,
      multi: true,
    },
    TwoFeatureFlagDataSource,
    {
      provide: TbFeatureFlagDataSources,
      useExisting: TwoFeatureFlagDataSource,
      multi: true,
    },
  ],
})
export class MutliFeatureFlagProvider {}

describe('feature_flag_effects', () => {
  let actions: ReplaySubject<Action>;
  let dataSource: TestingTBFeatureFlagDataSource;
  let effects: FeatureFlagEffects;
  let recordedActions: Action[];

  beforeEach(async () => {
    recordedActions = [];
    actions = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      providers: [provideMockActions(actions), FeatureFlagEffects],
    }).compileComponents();
  });

  describe('getFeatureFlags$', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TBFeatureFlagTestingModule],
      });

      effects = TestBed.inject(FeatureFlagEffects);
      dataSource = TestBed.inject(TestingTBFeatureFlagDataSource);
      effects.getFeatureFlags$.subscribe((action) => {
        recordedActions.push(action);
      });
    });

    it('loads features from the data source on init', () => {
      spyOn(dataSource, 'getFeatures').and.returnValue(
        buildFeatureFlag({
          enabledExperimentalPlugins: ['foo', 'bar'],
          inColab: false,
        })
      );

      actions.next(effects.ngrxOnInitEffects());

      expect(recordedActions).toEqual([
        partialFeatureFlagsLoaded({
          features: buildFeatureFlag({
            enabledExperimentalPlugins: ['foo', 'bar'],
            inColab: false,
          }),
        }),
      ]);
    });
  });

  describe('multi data sources', () => {
    let dataSourceOne: OneFeatureFlagDataSource;
    let dataSourceTwo: TwoFeatureFlagDataSource;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MutliFeatureFlagProvider],
      });

      effects = TestBed.inject(FeatureFlagEffects);
      dataSourceOne = TestBed.inject(OneFeatureFlagDataSource);
      dataSourceTwo = TestBed.inject(TwoFeatureFlagDataSource);
    });

    describe('getFeatureFlags$', () => {
      beforeEach(() => {
        effects.getFeatureFlags$.subscribe((action) => {
          recordedActions.push(action);
        });
      });

      it(
        'loads features from multiple sources but in order (later ones ' +
          'override preceding ones)',
        () => {
          spyOn(dataSourceOne, 'getFeatures').and.returnValue({
            inColab: false,
            enabledColorGroup: true,
          });
          spyOn(dataSourceTwo, 'getFeatures').and.returnValue({
            // DataSourceTwo appears second in the provider list so this should
            // override the first one.
            inColab: true,
            enableDarkMode: false,
          });

          actions.next(effects.ngrxOnInitEffects());

          expect(recordedActions).toEqual([
            partialFeatureFlagsLoaded({
              features: {
                inColab: true,
                enabledColorGroup: true,
                enableDarkMode: false,
              },
            }),
          ]);
        }
      );
    });
  });

  describe('multi data sources + single data source', () => {
    let dataSourceOne: OneFeatureFlagDataSource;
    let dataSourceTwo: TwoFeatureFlagDataSource;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MutliFeatureFlagProvider, TBFeatureFlagTestingModule],
      });

      effects = TestBed.inject(FeatureFlagEffects);
      dataSourceOne = TestBed.inject(OneFeatureFlagDataSource);
      dataSourceTwo = TestBed.inject(TwoFeatureFlagDataSource);
    });

    describe('getFeatureFlags$', () => {
      beforeEach(() => {
        effects.getFeatureFlags$.subscribe((action) => {
          recordedActions.push(action);
        });
      });

      it('honors the multi data source over the single one', () => {
        spyOn(dataSourceOne, 'getFeatures').and.returnValue({
          inColab: false,
          enabledColorGroup: true,
        });
        spyOn(dataSourceTwo, 'getFeatures').and.returnValue({
          // DataSourceTwo appears second in the provider list so this should
          // override the first one.
          inColab: true,
          enableDarkMode: false,
        });

        actions.next(effects.ngrxOnInitEffects());

        expect(recordedActions).toEqual([
          partialFeatureFlagsLoaded({
            features: {
              inColab: true,
              enabledColorGroup: true,
              enableDarkMode: false,
            },
          }),
        ]);
      });
    });
  });
});
