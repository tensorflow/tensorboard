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
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialogModule} from '@angular/material/dialog';
import {MatDialogHarness} from '@angular/material/dialog/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {provideMockTbStore} from '../../testing/utils';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
  getShowFlagsEnabled,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';
import {
  FeatureFlagModalTriggerContainer,
  TEST_ONLY,
} from './feature_flag_modal_trigger_container';

@Component({
  standalone: false,
  selector: 'testable-feature-flag-dialog-container',
  template: '<div>Test</div>',
  jit: true,
})
class TestableFeatureFlagDialogContainer {}

describe('feature_flag_modal_trigger_container', () => {
  let store: MockStore<State>;
  let fixture: ComponentFixture<FeatureFlagModalTriggerContainer>;
  let rootLoader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [provideMockTbStore()],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    spyOn(store, 'dispatch').and.stub();

    // Fake out window.location.reload so it doesn't do anything.
    TEST_ONLY.util.reloadWindow = () => {};
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createComponent() {
    fixture = TestBed.createComponent(FeatureFlagModalTriggerContainer);
    // Override the dialog component to something that does not require a
    // working store. The dialog component sometimes completes initialization
    // after the test is torn down and the selectors have been reset.
    fixture.componentInstance.featureFlagDialogType =
      TestableFeatureFlagDialogContainer;
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  }

  it('creates modal when showFlags is true', async () => {
    store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {});
    store.overrideSelector(getShowFlagsEnabled, true);
    createComponent();
    const dialog = await rootLoader.getHarness(MatDialogHarness);
    expect(
      (fixture.componentInstance as any).featureFlagsDialog
    ).not.toBeUndefined();

    expect(dialog).toBeDefined();
  });

  it('does not create modal when showFlags is false', async () => {
    store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {});
    store.overrideSelector(getShowFlagsEnabled, false);
    createComponent();
    expect(
      (fixture.componentInstance as any).featureFlagsDialog
    ).toBeUndefined();
  });
});
