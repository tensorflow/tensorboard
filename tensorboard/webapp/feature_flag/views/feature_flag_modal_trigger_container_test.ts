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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import {MatDialogHarness} from '@angular/material/dialog/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
  getShowFlagsEnabled,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';
import {FeatureFlagModalTriggerContainer} from './feature_flag_modal_trigger_container';
import {FeatureFlagPageContainer} from './feature_flag_page_container';

describe('feature_flag_modal_trigger_container', () => {
  let actualActions: Action[];
  let dispatchSpy: jasmine.Spy;
  let store: MockStore<State>;

  let fixture: ComponentFixture<FeatureFlagModalTriggerContainer>;
  let loader: HarnessLoader;
  let rootLoader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      declarations: [FeatureFlagPageContainer],
      providers: [
        provideMockStore(),
        {provide: MatDialogRef, useValue: MatDialog},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    TestBed.overrideProvider(MAT_DIALOG_DATA, {useValue: {}});
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    actualActions = [];
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
  });

  function createComponent() {
    fixture = TestBed.createComponent(FeatureFlagModalTriggerContainer);
    loader = TestbedHarnessEnvironment.loader(fixture);
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  }

  it('creates modal when enableShowFlags is true', async () => {
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

  it('does not create modal when enableShowFlags is false', async () => {
    store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {});
    store.overrideSelector(getShowFlagsEnabled, false);
    createComponent();
    await expectAsync(rootLoader.getHarness(MatDialogHarness)).toBeRejected();
    expect(
      (fixture.componentInstance as any).featureFlagsDialog
    ).toBeUndefined();
  });
});
