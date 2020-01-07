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
import {Store, Action, MemoizedSelector} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {ReplaySubject} from 'rxjs';

import {changePlugin} from '../core/actions';
import {getActivePlugin} from '../core/store';
import {State} from '../core/store';
import {AnalyticsLogger} from './analytics_logger';
import {AnalyticsEffects} from './effects';
import {createState, createCoreState} from '../core/testing';

describe('changing plugins', () => {
  let logger: AnalyticsLogger;
  let action: ReplaySubject<Action>;
  let store: MockStore<State>;
  let recordedActions: Action[];
  let recordedAnalyticsEvents: string[];
  let analyticsEffects: AnalyticsEffects;
  let activePluginSelector: MemoizedSelector<State, string | null>;

  class MockAnalyticsLogger extends AnalyticsLogger {
    sendPageView(plugin: string) {
      recordedAnalyticsEvents.push(`PageView: ${plugin}`);
    }
  }

  function mockPluginChange(plugin: string) {
    activePluginSelector.setResult(plugin);
    store.refreshState();
    action.next(changePlugin({plugin}));
  }

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      providers: [
        provideMockActions(action),
        provideMockStore({initialState: createState(createCoreState())}),
        AnalyticsEffects,
        {provide: AnalyticsLogger, useClass: MockAnalyticsLogger},
      ],
    }).compileComponents();
    store = TestBed.get(Store);
    activePluginSelector = store.overrideSelector(getActivePlugin, null);

    logger = TestBed.get(AnalyticsLogger);
    analyticsEffects = TestBed.get(AnalyticsEffects);

    recordedActions = [];
    analyticsEffects.actions$.subscribe((action: Action) => {
      recordedActions.push(action);
    });

    recordedAnalyticsEvents = [];
    analyticsEffects.analytics$.subscribe();
  });

  it('fires upon changing active plugin', () => {
    mockPluginChange('scalars');
    mockPluginChange('debugger');
    mockPluginChange('scalars');
    mockPluginChange('images');

    expect(recordedActions.length).toBe(4);
    expect(recordedAnalyticsEvents).toEqual([
      'PageView: scalars',
      'PageView: debugger',
      'PageView: scalars',
      'PageView: images',
    ]);
  });

  it('does not fire multiple times on the same plugin', () => {
    mockPluginChange('scalars');
    mockPluginChange('scalars');

    expect(recordedActions.length).toBe(2);
    expect(recordedAnalyticsEvents).toEqual(['PageView: scalars']);
  });
});
