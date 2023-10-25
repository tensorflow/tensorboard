/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {DataTableModule} from './data_table_module';
import {FilterDialog} from './filter_dialog_component';
import {
  DiscreteFilter,
  DomainType,
  IntervalFilter,
  DiscreteFilterValue,
} from './types';
import {By} from '@angular/platform-browser';
import {RangeInputComponent} from '../range_input/range_input_component';
import {RangeInputModule} from '../range_input/range_input_module';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatCheckboxHarness} from '@angular/material/checkbox/testing';
import {RangeInputSource} from '../range_input/types';

describe('filter dialog', () => {
  let rootLoader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilterDialog],
      imports: [DataTableModule, RangeInputModule, MatCheckboxModule],
    }).compileComponents();
  });

  function createComponent(input: {filter: DiscreteFilter | IntervalFilter}) {
    const fixture = TestBed.createComponent(FilterDialog);
    fixture.componentInstance.filter = input.filter;
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    fixture.detectChanges();
    return fixture;
  }

  it('renders interval filters', () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.INTERVAL,
        includeUndefined: false,
        minValue: 6,
        maxValue: 20,
        filterLowerValue: 7,
        filterUpperValue: 18,
      },
    });

    const rangeInput = fixture.debugElement.query(
      By.directive(RangeInputComponent)
    );
    expect(rangeInput).toBeTruthy();
    const [lower, upper, ...rest] = rangeInput.queryAll(By.css('input'));
    // There should be two other input fields: one for each thumb in the slider.
    expect(rest.length).toEqual(2);
    expect(lower.nativeElement.value).toEqual('7');
    expect(upper.nativeElement.value).toEqual('18');
  });

  it('dispatches event when an interval filter value is changed', async () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.INTERVAL,
        includeUndefined: false,
        minValue: 6,
        maxValue: 20,
        filterLowerValue: 7,
        filterUpperValue: 18,
      },
    });

    const intervalFilterChangedSpy = spyOn(
      fixture.componentInstance.intervalFilterChanged,
      'emit'
    );

    const rangeInput = fixture.debugElement.query(
      By.directive(RangeInputComponent)
    );
    rangeInput.componentInstance.rangeValuesChanged.emit({
      lowerValue: 7,
      upperValue: 17,
      source: RangeInputSource.TEXT,
    });
    expect(intervalFilterChangedSpy).toHaveBeenCalledOnceWith({
      lowerValue: 7,
      upperValue: 17,
      source: RangeInputSource.TEXT,
    });
  });

  it('dispatches an event when include undefined is changed while viewing an interval filter', async () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.INTERVAL,
        includeUndefined: false,
        minValue: 6,
        maxValue: 20,
        filterLowerValue: 7,
        filterUpperValue: 18,
      },
    });
    const includeUndefinedSpy = spyOn(
      fixture.componentInstance.includeUndefinedToggled,
      'emit'
    );

    const includeUndefinedCheckbox = await rootLoader.getHarness(
      MatCheckboxHarness.with({label: 'Include Undefined'})
    );
    await includeUndefinedCheckbox.check();
    expect(includeUndefinedSpy).toHaveBeenCalled();
  });

  it('renders discrete values', async () => {
    createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [2, 4, 6, 8],
        filterValues: [2, 4, 6],
      },
    });
    const checkboxes = await rootLoader.getAllHarnesses(MatCheckboxHarness);

    const checkboxLabels = await Promise.all(
      checkboxes.map((checkbox) => checkbox.getLabelText())
    );
    expect(checkboxLabels).toEqual(['2', '4', '6', '8', 'Include Undefined']);
  });

  it('dispatches event when an discrete filter value is changed', async () => {
    const possibleValues = [2, 4, 6, 8];
    const fixture = createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues,
        filterValues: [2, 4, 6],
      },
    });
    const filterValues: DiscreteFilterValue[] = [];
    spyOn(fixture.componentInstance.discreteFilterChanged, 'emit').and.callFake(
      (value: DiscreteFilterValue) => filterValues.push(value)
    );

    for (const value of possibleValues) {
      const checkbox = await rootLoader.getHarness(
        MatCheckboxHarness.with({label: `${value}`})
      );
      await checkbox.uncheck();
    }
    expect(filterValues).toEqual([2, 4, 6]);

    // Unchecking an unchecked box should not trigger an event.
    for (const value of possibleValues) {
      const checkbox = await rootLoader.getHarness(
        MatCheckboxHarness.with({label: `${value}`})
      );
      await checkbox.uncheck();
    }
    expect(filterValues).toEqual([2, 4, 6]);

    for (const value of possibleValues) {
      const checkbox = await rootLoader.getHarness(
        MatCheckboxHarness.with({label: `${value}`})
      );
      await checkbox.check();
    }
    expect(filterValues).toEqual([2, 4, 6, 2, 4, 6, 8]);

    // Checking a checked box should not trigger an event.
    for (const value of possibleValues) {
      const checkbox = await rootLoader.getHarness(
        MatCheckboxHarness.with({label: `${value}`})
      );
      await checkbox.check();
    }
    expect(filterValues).toEqual([2, 4, 6, 2, 4, 6, 8]);
  });

  it('dispatches an event when include undefined is changed while viewing a discrete filter', async () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [2, 4, 6, 8],
        filterValues: [2, 4, 6],
      },
    });
    const includeUndefinedSpy = spyOn(
      fixture.componentInstance.includeUndefinedToggled,
      'emit'
    );

    const includeUndefinedCheckbox = await rootLoader.getHarness(
      MatCheckboxHarness.with({label: 'Include Undefined'})
    );
    await includeUndefinedCheckbox.check();
    expect(includeUndefinedSpy).toHaveBeenCalled();
  });

  it('filters discrete values', async () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: ['foo', 'bar', 'baz', 'qaz'],
        filterValues: ['foo', 'bar', 'baz', 'qaz'],
      },
    });
    expect(await getCheckboxLabels()).toEqual([
      'foo',
      'bar',
      'baz',
      'qaz',
      'Include Undefined',
    ]); // 4 options + the include undefined checkbox

    fixture.componentInstance.discreteValueKeyUp(
      // A mock of a keyboard input event.
      {
        target: {
          value: 'ba',
        },
      } as any
    );
    fixture.detectChanges();
    expect(await getCheckboxLabels()).toEqual([
      'bar',
      'baz',
      'Include Undefined',
    ]); // 2 options + the include undefined checkbox

    fixture.componentInstance.discreteValueKeyUp(
      // A mock of a keyboard input event.
      {
        target: {
          value: 'nothing matches me',
        },
      } as any
    );
    fixture.detectChanges();
    expect(await getCheckboxLabels()).toEqual(['Include Undefined']); // 0 options + the include undefined checkbox
    expect(fixture.nativeElement.innerHTML).toContain('No Matching Values');

    async function getCheckboxLabels() {
      const checkboxes = await rootLoader.getAllHarnesses(MatCheckboxHarness);
      return Promise.all(checkboxes.map((checkbox) => checkbox.getLabelText()));
    }
  });
});
