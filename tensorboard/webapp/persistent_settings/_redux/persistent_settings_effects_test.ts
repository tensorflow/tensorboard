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
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, createSelector, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {EMPTY, of, ReplaySubject} from 'rxjs';
import {PersistentSettingsConfigModule} from '../persistent_settings_config_module';
import {
  PersistentSettingsTestingDataSource,
  PersistentSettingsTestingDataSourceModule,
} from '../_data_source/testing';
import {globalSettingsLoaded} from './persistent_settings_actions';
import {
  PersistentSettingsEffects,
  TEST_ONLY,
} from './persistent_settings_effects';

describe('persistent_settings effects test', () => {
  let action: ReplaySubject<Action>;
  let dispatchSpy: jasmine.Spy;
  let store: MockStore<any>;
  let effects: PersistentSettingsEffects;
  let actualActions: Action[];
  let getSettingsSpy: jasmine.Spy;
  let setSettingsSpy: jasmine.Spy;

  const setSmoothingSelector = createSelector(
    (s: any) => s,
    () => ({scalarSmoothing: 0.5})
  );
  const setIgnoreOutliers = createSelector(
    (s: any) => s,
    () => ({ignoreOutliers: false})
  );

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    actualActions = [];

    await TestBed.configureTestingModule({
      imports: [
        PersistentSettingsTestingDataSourceModule,
        PersistentSettingsConfigModule.defineGlobalSetting(
          () => setSmoothingSelector
        ),
        PersistentSettingsConfigModule.defineGlobalSetting(
          () => setIgnoreOutliers
        ),
      ],
      providers: [
        provideMockActions(action),
        provideMockStore(),
        PersistentSettingsEffects,
        PersistentSettingsConfigModule,
      ],
    }).compileComponents();

    store = TestBed.inject<Store<any>>(Store) as MockStore<any>;
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    effects = TestBed.inject(PersistentSettingsEffects);
    const dataSource = TestBed.inject(PersistentSettingsTestingDataSource);
    getSettingsSpy = spyOn(dataSource, 'getSettings').and.returnValue(of({}));
    setSettingsSpy = spyOn(dataSource, 'setSettings').and.returnValue(EMPTY);
  });

  afterEach(fakeAsync(() => {
    discardPeriodicTasks();
    store?.resetSelectors();
  }));

  describe('#initializeAndUpdateSettings$', () => {
    beforeEach(() => {
      effects.initializeAndUpdateSettings$.subscribe();
    });

    describe('on init', () => {
      it('fetches user settings and emits an aciton', () => {
        getSettingsSpy.and.returnValue(
          of({
            ignoreOutliers: false,
          })
        );
        action.next(TEST_ONLY.initAction());

        expect(actualActions).toEqual([
          globalSettingsLoaded({
            partialSettings: {
              ignoreOutliers: false,
            },
          }),
        ]);
      });

      it('subscribes to selector changes after initial setting is read', fakeAsync(() => {
        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.1});
        const getSettingsSubject = new ReplaySubject(1);

        getSettingsSpy.and.returnValue(getSettingsSubject);
        action.next(TEST_ONLY.initAction());

        tick();
        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.3});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS * 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        getSettingsSubject.next({ignoreOutliers: false});
        getSettingsSubject.complete();
        tick();
        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.5});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS * 2);
        expect(setSettingsSpy).toHaveBeenCalledOnceWith({
          scalarSmoothing: 0.5,
        });
      }));

      it('ignores value emitted from initial subscription', fakeAsync(() => {
        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.1});

        getSettingsSpy.and.returnValue(of({}));
        action.next(TEST_ONLY.initAction());

        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS * 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();
      }));
    });

    describe('on store changes', () => {
      function initializeAndSubscribe() {
        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.1});
        store.overrideSelector(setIgnoreOutliers, {ignoreOutliers: false});
        getSettingsSpy.and.returnValue(of({}));
        action.next(TEST_ONLY.initAction());
        tick();
      }

      it('ignores no value changes', fakeAsync(() => {
        initializeAndSubscribe();

        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.1});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS * 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.1});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS * 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();
      }));

      it('debounces frequent changes', fakeAsync(() => {
        initializeAndSubscribe();

        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.3});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.5});
        store.refreshState();

        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).toHaveBeenCalledTimes(1);
      }));

      it('debounces all selectors and sets settings once with everything', fakeAsync(() => {
        initializeAndSubscribe();

        store.overrideSelector(setSmoothingSelector, {scalarSmoothing: 0.3});
        store.refreshState();
        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        store.overrideSelector(setIgnoreOutliers, {ignoreOutliers: true});
        store.refreshState();

        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).not.toHaveBeenCalled();

        tick(TEST_ONLY.DEBOUNCE_PERIOD_IN_MS / 2);
        expect(setSettingsSpy).toHaveBeenCalledOnceWith({
          scalarSmoothing: 0.3,
          ignoreOutliers: true,
        });
      }));
    });
  });
});
