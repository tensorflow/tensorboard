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
import {createAction} from '@ngrx/store';
import * as alertActions from '../actions';
import * as alertReducers from './alert_reducers';
import {buildAlertState} from './testing';

const retryForTestAction = createAction('[Test] Action Retried');

describe('alert_reducers', () => {
  it('saves alerts with a timestamp', () => {
    spyOn(Date, 'now').and.returnValues(123, 234);
    const action1 = alertActions.alertReported({
      localizedMessage: 'Foo1 failed',
    });

    const followupActionGetter = async () => {
      return retryForTestAction();
    };
    const action2 = alertActions.alertReported({
      localizedMessage: 'Foo2 failed',
      followupAction: {
        localizedLabel: 'Retry Foo2?',
        getFollowupAction: followupActionGetter,
      },
    });
    const state1 = buildAlertState({latestAlert: null});

    const state2 = alertReducers.reducers(state1, action1);
    expect(state2.latestAlert!).toEqual({
      localizedMessage: 'Foo1 failed',
      created: 123,
    });

    const state3 = alertReducers.reducers(state2, action2);
    expect(state3.latestAlert!).toEqual({
      localizedMessage: 'Foo2 failed',
      followupAction: {
        localizedLabel: 'Retry Foo2?',
        getFollowupAction: followupActionGetter,
      },
      created: 234,
    });
  });

  it('updates state with a different alert if the report is the same', () => {
    const action1 = alertActions.alertReported({
      localizedMessage: 'Foo failed again',
    });
    const action2 = alertActions.alertReported({
      localizedMessage: 'Foo failed again',
    });
    const state1 = buildAlertState({latestAlert: null});

    const state2 = alertReducers.reducers(state1, action1);
    const state2LatestAlert = state2.latestAlert;

    const state3 = alertReducers.reducers(state2, action2);
    const state3LatestAlert = state3.latestAlert;

    expect(state2LatestAlert).not.toBe(state3LatestAlert);
  });
});
