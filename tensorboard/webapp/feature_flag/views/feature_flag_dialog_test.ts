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
import {CommonModule} from '@angular/common';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {
  allFeatureFlagOverridesReset,
  featureFlagOverrideChanged,
  featureFlagOverridesReset,
} from '../actions/feature_flag_actions';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
} from '../store/feature_flag_selectors';
import {buildFeatureFlagState, buildState} from '../store/testing';
import {FeatureFlags} from '../types';
import {FeatureFlagDialogModule} from './feature_flag_dialog_module';
import {FeatureFlagDialogComponent} from './feature_flag_dialog_component';
import {
  FeatureFlagDialogContainer,
  TEST_ONLY,
} from './feature_flag_dialog_container';
import {FeatureFlagOverrideStatus} from './types';

describe('feature_flag_dialog_container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;
  let fixture: ComponentFixture<FeatureFlagDialogContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeatureFlagDialogContainer],
      imports: [CommonModule, FeatureFlagDialogModule],
      providers: [
        provideMockStore({
          initialState: buildState(
            buildFeatureFlagState({
              defaultFlags: {} as FeatureFlags,
              flagOverrides: {},
            })
          ),
        }),
        FeatureFlagDialogContainer,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createComponent() {
    fixture = TestBed.createComponent(FeatureFlagDialogContainer);
    fixture.detectChanges();
  }

  function getComponent(): HTMLElement {
    return fixture.nativeElement.querySelector('feature-flag-dialog-component');
  }

  // Tests for feature_flag_dialog_container
  describe('onFlagChanged', () => {
    it('creates override status is set to enabled or disabled not set', () => {
      store.overrideSelector(getDefaultFeatureFlags, {
        inColab: false,
      } as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      createComponent();
      const matSelect = fixture.debugElement.query(By.css('mat-select'));
      matSelect.triggerEventHandler('selectionChange', {value: 'enabled'});

      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverrideChanged({
          flags: {
            inColab: true,
          },
        })
      );

      matSelect.triggerEventHandler('selectionChange', {value: 'disabled'});
      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverrideChanged({
          flags: {
            inColab: false,
          },
        })
      );
    });

    it('creates removes override when status is set to default', () => {
      store.overrideSelector(getDefaultFeatureFlags, {
        inColab: false,
      } as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      createComponent();
      const matSelect = fixture.debugElement.query(By.css('mat-select'));
      matSelect.triggerEventHandler('selectionChange', {value: 'default'});

      expect(dispatchSpy).toHaveBeenCalledWith(
        featureFlagOverridesReset({
          flags: ['inColab'],
        })
      );
    });
  });

  describe('onAllFlagsReset', () => {
    it('resets all feature flags', () => {
      store.overrideSelector(getDefaultFeatureFlags, {} as FeatureFlags);
      store.overrideSelector(getOverriddenFeatureFlags, {});
      createComponent();
      const button = fixture.debugElement.query(By.css('button'));
      button.triggerEventHandler('click', {});
      expect(dispatchSpy).toHaveBeenCalledWith(allFeatureFlagOverridesReset());
    });
  });

  describe('getFlagStatus', () => {
    it('returns default when flag is not overridden', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {});
      expect(status).toEqual(FeatureFlagOverrideStatus.DEFAULT);
    });

    it('returns enabled when flag is overridden to true', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {
        inColab: true,
      });
      expect(status).toEqual(FeatureFlagOverrideStatus.ENABLED);
    });

    it('returns disabled when flag is overridden to false', () => {
      const status = TEST_ONLY.getFlagStatus('inColab', {
        inColab: false,
      });
      expect(status).toEqual(FeatureFlagOverrideStatus.DISABLED);
    });
  });

  // Tests for feature_flag_dialog_component
  it('creates rows for each feature flag', () => {
    store.overrideSelector(getDefaultFeatureFlags, {
      inColab: false,
      enabledExperimentalPlugins: [] as string[],
    } as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {
      inColab: true,
    });
    createComponent();
    const component = getComponent();

    const rows = component.querySelectorAll('tr');
    expect(rows.length).toEqual(2);
  });

  it('creates table data for non editable flags and mat-selects for editable flags', () => {
    store.overrideSelector(getDefaultFeatureFlags, {
      inColab: false,
      enabledExperimentalPlugins: [] as string[],
    } as FeatureFlags);
    store.overrideSelector(getOverriddenFeatureFlags, {
      inColab: true,
    });
    createComponent();
    const component = getComponent();

    const dataCells = component.querySelectorAll('td');
    expect(dataCells.length).toEqual(3);
    const selectors = component.querySelectorAll('mat-select');
    expect(selectors.length).toEqual(1);
    expect(dataCells[2].innerText).toBe('Unsupported By UI - null');
  });

  describe('formatFlagValue', () => {
    it('converts true to "Enabled"', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue(true)).toEqual('- Enabled');
    });

    it('converts false to "Disabled"', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue(false)).toEqual('- Disabled');
    });

    it('converts null and undefined to "null"', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue(null)).toEqual('- null');
      expect(component.formatFlagValue(undefined)).toEqual('- null');
    });

    it('serializes arrays', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue([])).toEqual('- []');
    });

    it('serializes numbers and strings', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue(1)).toEqual('- 1');
      expect(component.formatFlagValue('foo')).toEqual('- foo');
    });

    it('does not include hyphen when value has length 0', () => {
      const component = TestBed.createComponent(
        FeatureFlagDialogComponent
      ).componentInstance;
      expect(component.formatFlagValue('')).toEqual('');
    });
  });

  describe('filters flags based on the value of showFlags feature', () => {
    beforeEach(() => {
      store.overrideSelector(getDefaultFeatureFlags, {
        defaultEnableDarkMode: true,
        enableSuggestedCards: true,
        inColab: false,
        forceSvg: true,
      } as FeatureFlags);
    });

    it('shows all flags when value is undefined', () => {
      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: undefined,
      });
      createComponent();
      const component = getComponent();

      const rows = component.querySelectorAll('tr');
      expect(rows.length).toEqual(4);
    });

    it('shows all flags when value is empty string', () => {
      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: '',
      });
      createComponent();
      const component = getComponent();

      const rows = component.querySelectorAll('tr');
      expect(rows.length).toEqual(4);
    });

    it('only shows flags whose name includes filter', () => {
      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: 'e',
      });
      createComponent();
      const component = getComponent();

      expect(component.querySelectorAll('tr').length).toEqual(3);

      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: 'Suggested',
      });
      store.refreshState();
      fixture.detectChanges();
      expect(component.querySelectorAll('tr').length).toEqual(1);
    });

    it('shows message when flags are filtered', () => {
      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: 'enable',
      });

      createComponent();
      const component = getComponent();
      expect(component.innerText).toContain(
        'Feature Flags are filtered to only show features containing'
      );
    });

    it('does not show message when flags are not filtered', () => {
      store.overrideSelector(getOverriddenFeatureFlags, {
        showFlags: undefined,
      });

      createComponent();
      const component = getComponent();
      expect(component.innerText).not.toContain(
        'Feature Flags are filtered to only show features containing'
      );
    });
  });
});
