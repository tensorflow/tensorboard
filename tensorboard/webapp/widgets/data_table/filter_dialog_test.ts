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
import {DataTableModule} from './data_table_module';
import {FilterDialog} from './filter_dialog_component';
import {DiscreteFilter, DomainType, IntervalFilter} from './types';
import {By} from '@angular/platform-browser';
import {RangeInputComponent} from '../range_input/range_input_component';
import {RangeInputModule} from '../range_input/range_input_module';
import {MatLegacyCheckboxModule} from '@angular/material/legacy-checkbox';

describe('filter dialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilterDialog],
      imports: [DataTableModule, RangeInputModule, MatLegacyCheckboxModule],
    }).compileComponents();
  });

  function createComponent(input: {filter: DiscreteFilter | IntervalFilter}) {
    const fixture = TestBed.createComponent(FilterDialog);
    fixture.componentInstance.filter = input.filter;
    fixture.detectChanges();
    return fixture;
  }

  it('dispatches event when an interval filter value is changed', () => {
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
    });
    expect(intervalFilterChangedSpy).toHaveBeenCalled();

    const includeUndefinedSpy = spyOn(
      fixture.componentInstance.includeUndefinedToggled,
      'emit'
    );
    const includeUndefinedCheckbox = Array.from(
      fixture.debugElement.queryAll(By.css('mat-checkbox'))
    ).find((elem) =>
      elem.nativeElement.innerHTML.includes('Include Undefined')
    )!;
    includeUndefinedCheckbox.query(By.css('label')).nativeElement.click();
    expect(includeUndefinedSpy).toHaveBeenCalled();
  });

  it('dispatches event when an discrete filter value is changed', () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: [2, 4, 6, 8],
        filterValues: [2, 4, 6],
      },
    });
    const discreteFilterChagnedSpy = spyOn(
      fixture.componentInstance.discreteFilterChanged,
      'emit'
    );
    fixture.debugElement
      .query(By.css('mat-checkbox label'))
      .nativeElement.click();
    expect(discreteFilterChagnedSpy).toHaveBeenCalled();

    const includeUndefinedSpy = spyOn(
      fixture.componentInstance.includeUndefinedToggled,
      'emit'
    );
    const includeUndefinedCheckbox = Array.from(
      fixture.debugElement.queryAll(By.css('mat-checkbox'))
    ).find((elem) =>
      elem.nativeElement.innerHTML.includes('Include Undefined')
    )!;
    includeUndefinedCheckbox.query(By.css('label')).nativeElement.click();
    expect(includeUndefinedSpy).toHaveBeenCalled();
  });

  it('filters discrete values', () => {
    const fixture = createComponent({
      filter: {
        type: DomainType.DISCRETE,
        includeUndefined: false,
        possibleValues: ['foo', 'bar', 'baz', 'qaz'],
        filterValues: ['foo', 'bar', 'baz', 'qaz'],
      },
    });
    expect(
      fixture.debugElement.queryAll(By.css('mat-checkbox')).length
    ).toEqual(5); // 4 options + the include undefined checkbox

    fixture.componentInstance.discreteValueFilter = 'ba';
    fixture.detectChanges();
    expect(
      fixture.debugElement.queryAll(By.css('mat-checkbox')).length
    ).toEqual(3); // 2 options + the include undefined checkbox

    fixture.componentInstance.discreteValueFilter = 'nothing matches me';
    fixture.detectChanges();
    expect(
      fixture.debugElement.queryAll(By.css('mat-checkbox')).length
    ).toEqual(1); // 0 options + the include undefined checkbox
    expect(fixture.nativeElement.innerHTML).toContain('No Matching Values');
  });
});
