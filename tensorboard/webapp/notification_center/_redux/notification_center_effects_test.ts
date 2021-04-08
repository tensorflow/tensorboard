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
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {Subject} from 'rxjs';
import {State} from '../../app_state';
import {TBHttpClientTestingModule} from '../../webapp_data_source/tb_http_client_testing';
import {NotificationCenterDataSource} from '../_data_source';
import {
  NotificationCenterEffects,
  TEST_ONLY,
} from './notification_center_effects';
import * as selectors from './notification_center_selectors';
import {provideTestingNotificationCenterDataSource} from './testing';

describe('notification center effects', () => {
  let dataSource: NotificationCenterDataSource;
  let effects: NotificationCenterEffects;
  let store: MockStore<State>;
  let actions$: Subject<Action>;
  let actualActions: Action[] = [];
  let fetchNotificationsSpy: jasmine.Spy;

  beforeEach(async () => {
    actions$ = new Subject<Action>();
    actualActions = [];

    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(actions$),
        provideTestingNotificationCenterDataSource(),
        NotificationCenterEffects,
        provideMockStore({
          initialState: {
            notifications: [],
            lastReadTimestampInMs: -1,
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(NotificationCenterEffects);
    dataSource = TestBed.inject(NotificationCenterDataSource);
    store.overrideSelector(selectors.getNotifications, []);
    store.overrideSelector(selectors.getLastReadTime, 0);
    effects.initialNotificaitonFetch$.subscribe();

    fetchNotificationSubject = new Subject();
    fetchNotificationsSpy = spyOn(
      dataSource,
      'fetchNotification'
    ).and.returnValue(fetchNotificationSubject);
  });

  it('fetch initial notifications', () => {
    // store.overrideSelector(
    //   getMetricsNotificationLoaded,
    //   DataLoadState.LOADING
    // );
    // store.overrideSelector(getActivePlugin, METRICS_PLUGIN_ID);
    // store.refreshState();
    actions$.next(TEST_ONLY.initAction());
    fetchNotificationSubject.next(buildDataSourceNotification());
    expect(fetchTagMetadataSpy).toHaveBeenCalled();
    expect(actualActions).toEqual([]);
  });
});
