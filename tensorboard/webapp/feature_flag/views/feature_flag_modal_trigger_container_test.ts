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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {Observable, Subscriber} from 'rxjs';
import {State} from '../../app_state';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
  getShowFlagsEnabled,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';
import {FeatureFlagModalTriggerContainer} from './feature_flag_modal_trigger_container';
import {FeatureFlagPageContainer} from './feature_flag_page_container';

class MatDialogMock {
  private onCloseSubscriptions: Subscriber<void>[] = [];
  private afterCloseObserable = new Observable<void>((subscriber) => {
    this.onCloseSubscriptions.push(subscriber);
  });

  isOpen = false;
  open(_component: any) {
    this.isOpen = true;
    return this;
  }

  afterClosed(): Observable<void> {
    return this.afterCloseObserable;
  }

  close() {
    this.isOpen = false;
    this.onCloseSubscriptions.forEach((subscriber) => {
      subscriber.next();
    });
  }
}

describe('feature_flag_modal_trigger_container', () => {
  let actualActions: Action[];
  let dispatchSpy: jasmine.Spy;
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      declarations: [FeatureFlagPageContainer],
      providers: [
        provideMockStore(),
        {provide: MatDialogRef, useValue: MatDialogMock},
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

  it('creates modal when enableShowFlags is true', () => {
    store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {});
    store.overrideSelector(getShowFlagsEnabled, true);
    const dialogMock = new MatDialogMock();
    new FeatureFlagModalTriggerContainer(store, dialogMock as any);
    expect(dialogMock.isOpen).toBeTrue();
  });

  it('does not create modal when enableShowFlags is false', () => {
    store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {});
    store.overrideSelector(getShowFlagsEnabled, false);
    const dialogMock = new MatDialogMock();
    new FeatureFlagModalTriggerContainer(store, dialogMock as any);
    expect(dialogMock.isOpen).toBeFalse();
  });
});
