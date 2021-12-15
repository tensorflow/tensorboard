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
import {TestBed} from '@angular/core/testing';
import {EffectsModule} from '@ngrx/effects';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, createAction, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {ReplaySubject} from 'rxjs';
import {State} from '../app_state';
import * as alertActions from './actions';
import {AlertActionModule} from './alert_action_module';
import {AlertEffects} from './effects';

const alertActionOccurred = createAction('[Test] Action Occurred (need alert)');
const noAlertActionOccurred = createAction('[Test] Action Occurred (no alert)');

describe('alert_effects', () => {
  let actions$: ReplaySubject<Action>;
  let store: MockStore<Partial<State>>;
  let recordedActions: Action[] = [];
  let shouldReportAlert: boolean;

  beforeEach(async () => {
    shouldReportAlert = false;
    actions$ = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      imports: [
        AlertActionModule.registerAlertActions(() => [
          {
            actionCreator: alertActionOccurred,
            alertFromAction: (action: Action) => {
              if (shouldReportAlert) {
                return {
                  localizedMessage: 'alert details',
                };
              }
              return null;
            },
          },
        ]),
        EffectsModule.forFeature([AlertEffects]),
        EffectsModule.forRoot([]),
      ],
      providers: [provideMockActions(actions$), provideMockStore({})],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });
  });

  it(`reports an alert when 'alertFromAction' returns a report`, () => {
    shouldReportAlert = true;
    actions$.next(alertActionOccurred);

    expect(recordedActions).toEqual([
      alertActions.alertReported({
        localizedMessage: 'alert details',
      }),
    ]);
  });

  it(`does not alert when 'alertFromAction' returns null`, () => {
    shouldReportAlert = false;
    actions$.next(alertActionOccurred);

    expect(recordedActions).toEqual([]);
  });

  it(`does not alert when a non-matching action is fired`, () => {
    shouldReportAlert = true;
    actions$.next(noAlertActionOccurred);

    expect(recordedActions).toEqual([]);
  });
});
