/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {OverlayContainer} from '@angular/cdk/overlay';
import {TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, createAction, props, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import * as selectors from '../../selectors';
import {State} from '../store';
import {buildAlertState, buildStateFromAlertState} from '../store/testing';
import {AlertDisplaySnackbarContainer} from './alert_display_snackbar_container';
import {AlertSnackbarContainer} from './alert_snackbar_container';

const testAction = createAction('[Test] Action Occurred');
const testActionWithProps = createAction(
  '[Test] Action With Props Occurred',
  props<{foo: boolean}>()
);

const Selectors = {
  SNACKBAR: 'alert-display-snackbar',
  FOLLOWUP_BUTTON: '.followup-button',
  DISMISS_BUTTON: '.dismiss-button',
};

describe('alert snackbar', () => {
  let store: MockStore<State>;
  let snackBarOpenSpy: jasmine.Spy;
  let recordedActions: Action[] = [];
  let overlayContainer: OverlayContainer;
  let snackbar: MatSnackBar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatButtonModule, MatSnackBarModule],
      providers: [
        provideMockStore({
          initialState: buildStateFromAlertState(buildAlertState({})),
        }),
      ],
      declarations: [AlertSnackbarContainer, AlertDisplaySnackbarContainer],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });
    overlayContainer = TestBed.inject(OverlayContainer);
    snackbar = TestBed.inject(MatSnackBar);
    snackBarOpenSpy = spyOn(snackbar, 'openFromComponent').and.callThrough();
  });

  afterEach(() => {
    snackbar.dismiss();
    store?.resetSelectors();
  });

  it('opens the snackbar on each alert', () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    expect(snackBarOpenSpy).not.toHaveBeenCalled();

    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      created: 0,
    });
    store.refreshState();

    expect(snackBarOpenSpy.calls.count()).toBe(1);
    expect(snackBarOpenSpy.calls.mostRecent().args[1].data).toEqual({
      localizedMessage: 'Foo failed',
      created: 0,
    });

    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo2 failed',
      created: 1,
    });
    store.refreshState();

    expect(snackBarOpenSpy.calls.count()).toBe(2);
    expect(snackBarOpenSpy.calls.mostRecent().args[1].data).toEqual({
      localizedMessage: 'Foo2 failed',
      created: 1,
    });
  });

  it('opens the snackbar again on receiving the same alert', () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    expect(snackBarOpenSpy).not.toHaveBeenCalled();

    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed again',
      created: 0,
    });
    store.refreshState();

    expect(snackBarOpenSpy.calls.count()).toBe(1);
    expect(snackBarOpenSpy.calls.mostRecent().args[1].data).toEqual({
      localizedMessage: 'Foo failed again',
      created: 0,
    });

    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed again',
      created: 1,
    });
    store.refreshState();

    expect(snackBarOpenSpy.calls.count()).toBe(2);
    expect(snackBarOpenSpy.calls.mostRecent().args[1].data).toEqual({
      localizedMessage: 'Foo failed again',
      created: 1,
    });
  });

  it('closes the snackbar on click', async () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      created: 0,
    });
    store.refreshState();

    const dismissEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.DISMISS_BUTTON);
    expect(dismissEl).toBeTruthy();
    (dismissEl as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const snackbarAfterEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.SNACKBAR);
    expect(snackbarAfterEl).not.toBeTruthy();
  });

  it('shows the followup action if needed', () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      followupAction: {
        localizedLabel: 'Try again?',
        getFollowupAction: async () => testAction(),
      },
      created: 0,
    });
    store.refreshState();

    expect(
      overlayContainer
        .getContainerElement()
        .querySelector(Selectors.FOLLOWUP_BUTTON)
    ).toBeTruthy();
  });

  it('does not show the followup button if there is no followup', () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      created: 0,
    });
    store.refreshState();

    const followupEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.FOLLOWUP_BUTTON);
    expect(followupEl).not.toBeTruthy();
  });

  it('dispatches a followup action and closes', async () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      followupAction: {
        localizedLabel: 'Try again?',
        getFollowupAction: async () => testAction(),
      },
      created: 0,
    });
    store.refreshState();

    const followupEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.FOLLOWUP_BUTTON);
    (followupEl as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(recordedActions).toEqual([testAction()]);
    const snackbarAfterEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.SNACKBAR);
    expect(snackbarAfterEl).not.toBeTruthy();
  });

  it('dispatches a followup action with payload and closes', async () => {
    const fixture = TestBed.createComponent(AlertSnackbarContainer);
    fixture.detectChanges();
    store.overrideSelector(selectors.getLatestAlert, {
      localizedMessage: 'Foo failed',
      followupAction: {
        localizedLabel: 'Try again?',
        getFollowupAction: async () => testActionWithProps({foo: true}),
      },
      created: 0,
    });
    store.refreshState();

    const followupEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.FOLLOWUP_BUTTON);
    (followupEl as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(recordedActions).toEqual([testActionWithProps({foo: true})]);
    const snackbarAfterEl = overlayContainer
      .getContainerElement()
      .querySelector(Selectors.SNACKBAR);
    expect(snackbarAfterEl).not.toBeTruthy();
  });
});
