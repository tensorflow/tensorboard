/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Subject, throwError} from 'rxjs';
import {State} from '../../app_state';
import {provideMockTbStore} from '../../testing/utils';
import {TBHttpClientTestingModule} from '../../webapp_data_source/tb_http_client_testing';
import {
  NotificationCenterDataSource,
  NotificationCenterResponse,
} from '../_data_source';
import {
  buildNotificationResponse,
  provideTestingNotificationCenterDataSource,
} from '../_data_source/testing';
import * as actions from './notification_center_actions';
import {
  NotificationCenterEffects,
  TEST_ONLY,
} from './notification_center_effects';
import {CategoryEnum} from './notification_center_types';

describe('notification center effects', () => {
  let dataSource: NotificationCenterDataSource;
  let effects: NotificationCenterEffects;
  let store: MockStore<State>;
  let actions$: Subject<Action>;
  let actualActions: Action[] = [];
  let fetchNotificationsSpy: jasmine.Spy;
  let fetchNotificationSubject: Subject<NotificationCenterResponse>;
  let updateLastReadTimeStampToNowSpy: jasmine.Spy;

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    actualActions = [];

    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(actions$),
        provideTestingNotificationCenterDataSource(),
        NotificationCenterEffects,
        provideMockTbStore(),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(NotificationCenterEffects);
    dataSource = TestBed.inject(NotificationCenterDataSource);
    effects.initialNotificationFetch$.subscribe();

    fetchNotificationSubject = new Subject();
    fetchNotificationsSpy = spyOn(
      dataSource,
      'fetchNotifications'
    ).and.returnValue(fetchNotificationSubject);
  });

  it('fetches notifications on initial load', () => {
    actions$.next(TEST_ONLY.initAction());
    fetchNotificationsSpy.and.returnValue(fetchNotificationSubject);
    fetchNotificationSubject.next(buildNotificationResponse());

    expect(fetchNotificationsSpy).toHaveBeenCalled();
    expect(actualActions).toEqual([
      actions.fetchNotificationsLoaded({
        notifications: [
          {
            category: CategoryEnum.WHATS_NEW,
            dateInMs: 123,
            title: 'test title',
            content: 'random content',
          },
        ],
      }),
    ]);
  });

  it('dispatches failed action when notification fetch failed', () => {
    fetchNotificationsSpy.and.returnValue(
      throwError(new Error('Request failed'))
    );
    actions$.next(TEST_ONLY.initAction());

    expect(fetchNotificationsSpy).toHaveBeenCalled();
    expect(actualActions).toEqual([actions.fetchNotificationsFailed()]);
  });
});
