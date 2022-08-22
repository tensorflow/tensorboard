/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {
  allFeatureFlagOverridesReset,
  featureFlagOverrideChanged,
  featureFlagOverridesReset,
} from '../actions/feature_flag_actions';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';
import {FeatureFlagPageModule} from './feature_flag_module';
import {
  FeatureFlagPageContainer,
  TEST_ONLY,
} from './feature_flag_page_container';
import {FeatureFlagOverrideStatus} from './types';

describe('feature_flag_page_container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeatureFlagPageContainer],
      imports: [CommonModule, FeatureFlagPageModule],
      providers: [provideMockStore(), FeatureFlagPageContainer],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  function getComponent() {
    return new FeatureFlagPageContainer(store);
  }

  describe('onFlagChanged', () => {
    //     featureFlagOverrideChanged
    //     featureFlagOverridesReset
    // allFeatureFlagOverridesReset
    it('creates override status is set to enabled or disabled not set', () => {
      store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      const component = getComponent();
      component.onFlagChanged({
        flag: 'inColab',
        status: FeatureFlagOverrideStatus.ENABLED,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverrideChanged({
          flags: {
            inColab: true,
          },
        })
      );
      component.onFlagChanged({
        flag: 'inColab',
        status: FeatureFlagOverrideStatus.DISABLED,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverrideChanged({
          flags: {
            inColab: false,
          },
        })
      );
    });

    it('creates removes override when status is set to default', () => {
      store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      const component = getComponent();
      component.onFlagChanged({
        flag: 'inColab',
        status: FeatureFlagOverrideStatus.DEFAULT,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverridesReset({
          flags: ['inColab'],
        })
      );
    });
  });

  describe('onAllFlagsReset', () => {
    it('resets all feature flags', () => {
      store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      const component = getComponent();
      component.onAllFlagsReset();
      expect(dispatchSpy).toHaveBeenCalledWith(allFeatureFlagOverridesReset());
    });
  });

  describe('getFlagStatus', () => {
    it('returns default when flag is not overridden', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {});
      expect(status).toEqual(FeatureFlagOverrideStatus.DEFAULT);
    });

    it('returns enabled when flag is overridden to true', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {
        inColab: true,
      });
      expect(status).toEqual(FeatureFlagOverrideStatus.ENABLED);
    });

    it('returns disabled when flag is overridden to false', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {
        inColab: false,
      });
      expect(status).toEqual(FeatureFlagOverrideStatus.DISABLED);
    });
  });
});
