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
import {of, Subject, throwError} from 'rxjs';
import {SettingsDataSource} from '../_data_source/settings_data_source';
import {SettingsDataSourceModule} from '../_data_source/settings_data_source_module';
import {changePageSize, changeReloadPeriod, fetchSavedSettingsFailed, fetchSavedSettingsRequested, fetchSavedSettingsSucceeded, toggleReloadEnabled} from './settings_actions';
import {SettingsEffects, TEST_ONLY} from './settings_effects';
import {getPageSize, getReloadEnabled, getReloadPeriodInMs} from './settings_selectors';
import {Settings} from './settings_types';

describe('SettingsEffects', () => {
  let store: MockStore;
  let actions: Subject<Action>;
  let dispatchedActions: Action[];
  let dataSource: SettingsDataSource;

  beforeEach(async () => {
    actions = new Subject<Action>();
    dispatchedActions = [];

    await TestBed.configureTestingModule({
      imports: [SettingsDataSourceModule],
      providers: [
        provideMockActions(actions),
        provideMockStore(),
        SettingsEffects,
      ],
    }).compileComponents();

    store = TestBed.inject<Store>(Store) as MockStore;
    store.overrideSelector(getReloadEnabled, false);
    store.overrideSelector(getReloadPeriodInMs, 30000);
    store.overrideSelector(getPageSize, 5);
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    const effects = TestBed.inject(SettingsEffects);
    effects.initialSavedSettingsFetch$.subscribe();
    effects.saveReloadEnabled$.subscribe();
    effects.saveReloadPeriodInMs$.subscribe();
    effects.savePageSize$.subscribe();
    dataSource = TestBed.inject(SettingsDataSource);
  });

  it('fetches saved settings on init and dispatches returned result', () => {
    const fetchSavedSettings = spyOn(dataSource, 'fetchSavedSettings');
    const subject = new Subject<Partial<Settings>>();
    fetchSavedSettings.and.returnValue(subject);

    actions.next(TEST_ONLY.initAction());
    // While waiting for the fetchSavedSettings function to return, a single
    // action has been emitted.
    expect(dispatchedActions).toEqual([
      fetchSavedSettingsRequested(),
    ]);
    // Simulate fetchSavedSettings returning.
    subject.next({reloadEnabled: true});
    // An additional action has been emitted.
    expect(dispatchedActions).toEqual([
      fetchSavedSettingsRequested(),
      fetchSavedSettingsSucceeded({savedSettings: {reloadEnabled: true}}),
    ]);
  });

  it('dispatches failure when fetch fails', () => {
    const fetchSavedSettings = spyOn(dataSource, 'fetchSavedSettings');
    fetchSavedSettings.and.returnValue(
      throwError(new Error('Request failed'))
    );

    actions.next(TEST_ONLY.initAction());
    expect(dispatchedActions).toEqual([
      fetchSavedSettingsRequested(),
      fetchSavedSettingsFailed(),
    ]);
  });

  it('saves reloadEnabled', () => {
    const saveReloadEnabled = spyOn(dataSource, 'saveReloadEnabled');

    store.overrideSelector(getReloadEnabled, false);
    store.refreshState();
    actions.next(toggleReloadEnabled());
    expect(saveReloadEnabled).toHaveBeenCalledWith(false);

    store.overrideSelector(getReloadEnabled, true);
    store.refreshState();
    actions.next(toggleReloadEnabled());
    expect(saveReloadEnabled).toHaveBeenCalledWith(true);
  });

  it('saves reloadPeriodInMs', () => {
    const saveReloadPeriodInMs = spyOn(dataSource, 'saveReloadPeriodInMs');

    store.overrideSelector(getReloadPeriodInMs, 1111);
    store.refreshState();
    actions.next(changeReloadPeriod({periodInMs: 2222}));
    expect(saveReloadPeriodInMs).toHaveBeenCalledWith(1111);
  });

  it('saves reloadPeriodInMs', () => {
    const savePageSize = spyOn(dataSource, 'savePageSize');

    store.overrideSelector(getPageSize, 1111);
    store.refreshState();
    actions.next(changePageSize({size: 2222}));
    expect(savePageSize).toHaveBeenCalledWith(1111);
  });
});
