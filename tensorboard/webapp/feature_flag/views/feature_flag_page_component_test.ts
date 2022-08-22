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
import {Component, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FeatureFlags} from '../types';
import {FeatureFlagPageComponent} from './feature_flag_page_component';
import {FeatureFlagOverrideStatus, FeatureFlagStatus} from './types';

describe('feature_flag_page_component', () => {
  async function createComponent(
    featureFlagStatuses: FeatureFlagStatus<keyof FeatureFlags>[]
  ) {
    @Component({
      selector: 'testable-component',
      template: `<feature-flag-page-component
        [featureFlagStatuses]="featureFlagStatuses"
      >
      </feature-flag-page-component>`,
    })
    class TestableComponent {
      get featureFlagStatuses(): FeatureFlagStatus<keyof FeatureFlags>[] {
        return featureFlagStatuses;
      }
    }

    await TestBed.configureTestingModule({
      declarations: [TestableComponent, FeatureFlagPageComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('feature-flag-page-component');
  }

  it('creates rows for each feature flag', async () => {
    const component = await createComponent([
      {
        flag: 'inColab',
        defaultValue: false,
        status: FeatureFlagOverrideStatus.ENABLED,
      },
      {
        flag: 'enabledExperimentalPlugins',
        defaultValue: [],
        status: FeatureFlagOverrideStatus.DEFAULT,
      },
    ]);

    const rows = component.querySelectorAll('.feature-flag-table tr');
    expect(rows.length).toEqual(2);
  });

  it('creates table data for non editable flags and mat-selects for editable flags', async () => {
    const component = await createComponent([
      {
        flag: 'inColab',
        defaultValue: false,
        status: FeatureFlagOverrideStatus.ENABLED,
      },
      {
        flag: 'enabledExperimentalPlugins',
        defaultValue: [],
        status: FeatureFlagOverrideStatus.DEFAULT,
      },
    ]);

    const dataCells = component.querySelectorAll('td');
    expect(dataCells.length).toEqual(3);
    const selectors = component.querySelectorAll('mat-select');
    expect(selectors.length).toEqual(1);
  });

  describe('formatFlagValue', () => {
    it('converts true to "Enabled"', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue(true)).toEqual('- Enabled');
    });

    it('converts false to "Disabled"', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue(false)).toEqual('- Disabled');
    });

    it('converts null and undefined to "null"', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue(null)).toEqual('- null');
      expect(component.formatFlagValue(undefined)).toEqual('- null');
    });

    it('serializes arrays', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue([])).toEqual('- []');
    });

    it('serializes numbers and strings', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue(1)).toEqual('- 1');
      expect(component.formatFlagValue('foo')).toEqual('- foo');
    });

    it('does not include hyphen when value has length 0', () => {
      const component = new FeatureFlagPageComponent();
      expect(component.formatFlagValue('')).toEqual('');
    });
  });
});
