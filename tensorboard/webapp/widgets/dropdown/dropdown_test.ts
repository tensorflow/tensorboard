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
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatSelectModule} from '@angular/material/select';
import {MatSelectHarness} from '@angular/material/select/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {DropdownComponent, DropdownOption} from './dropdown_component';

/**
 * Test class that uses the <tb-dropdown> component.
 */
@Component({
  standalone: false,
  selector: 'testing-component',
  template: `
    <tb-dropdown
      [value]="expId"
      [options]="configOptions"
      (selectionChange)="onSelectionChange($event)"
    ></tb-dropdown>
  `,
})
class TestableComponent {
  @Input() expId!: string;
  @Input() configOptions!: DropdownOption[];
  @Input() onSelectionChange!: (event: {value: string}) => void;
}

describe('tb-dropdown', () => {
  let selectionChangeSpy: jasmine.Spy;

  const byCss = {
    DROPDOWN: By.directive(DropdownComponent),
    MAT_SELECT: By.css('mat-select'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatSelectModule, NoopAnimationsModule],
      declarations: [DropdownComponent, TestableComponent],
    }).compileComponents();
  });

  function createTestableComponent(input: {
    expId?: string;
    configOptions?: DropdownOption[];
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.expId = input.expId || '';
    fixture.componentInstance.configOptions = input.configOptions || [];
    selectionChangeSpy = jasmine.createSpy();
    fixture.componentInstance.onSelectionChange = selectionChangeSpy;
    return fixture;
  }

  it('renders options with no aliases', async () => {
    const fixture = createTestableComponent({
      expId: '1',
      configOptions: [
        {
          value: '',
          displayText: 'none',
          disabled: true,
        },
        {
          value: '1',
          displayText: 'abc',
          disabled: false,
          displayAlias: '', // empty aliases will be ignored
        },
      ],
    });
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const dropdown = fixture.debugElement.query(byCss.DROPDOWN);
    expect(dropdown.componentInstance.value).toEqual('1');
    expect(dropdown.componentInstance.options).toEqual([
      jasmine.objectContaining({
        value: '',
        displayText: 'none',
        disabled: true,
      }),
      jasmine.objectContaining({value: '1', displayText: 'abc'}),
    ]);

    // Test DOM content.
    const selectHarness = await loader.getHarness(MatSelectHarness);
    await selectHarness.open();

    const options = await selectHarness.getOptions();
    expect(options.length).toBe(2);

    expect(await options[0].getText()).toBe('none');
    expect(await options[0].isDisabled()).toBeTrue();

    expect(await options[1].getText()).toBe('abc');
    expect(await options[1].isDisabled()).toBeFalsy();
  });

  it('renders options with valid aliases', async () => {
    const fixture = createTestableComponent({
      expId: '2',
      configOptions: [
        {
          value: '2',
          displayText: 'test experiment name',
          displayAlias: 'test alias',
        },
      ],
    });
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const dropdown = fixture.debugElement.query(byCss.DROPDOWN);
    expect(dropdown.componentInstance.value).toEqual('2');
    expect(dropdown.componentInstance.options).toEqual([
      jasmine.objectContaining({
        value: '2',
        displayText: 'test experiment name',
        displayAlias: 'test alias',
      }),
    ]);

    // Test DOM content.
    const selectHarness = await loader.getHarness(MatSelectHarness);
    await selectHarness.open();

    const options = await selectHarness.getOptions();
    expect(options.length).toBe(1);

    expect(await options[0].getText()).toBe('test alias: test experiment name');
    expect(await options[0].isDisabled()).toBeFalsy();
  });

  it('changes selection', async () => {
    const fixture = createTestableComponent({
      expId: '1',
      configOptions: [
        {
          value: '1',
          displayText: 'abc',
        },
        {
          value: '2',
          displayText: 'efg',
        },
      ],
    });
    fixture.detectChanges();

    // Triggers selection change event.
    const matSelect = fixture.debugElement.query(byCss.MAT_SELECT);
    matSelect.triggerEventHandler('selectionChange', {value: '2'});
    fixture.detectChanges();

    expect(selectionChangeSpy).toHaveBeenCalledOnceWith('2');
  });
});
