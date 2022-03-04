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
import {Component, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {MatSelectModule} from '@angular/material/select';
import {DropdownOption, DropdownComponent} from './dropdown_component';

/**
 * Test class that uses the <tb-dropdown> component.
 */
@Component({
  selector: 'testing-component',
  template: `
    <tb-dropdown
      [value]="expId"
      [options]="configOptions"
      (selectionChange)="expChanged($event)"
    ></tb-dropdown>
  `,
})
class TestableComponent {
  @Input() expId!: string;
  @Input() configOptions!: DropdownOption[];
  @Input() expChanged!: (event: {value: string}) => void;
}

describe('tb-dropdown', () => {
  let expChangedSpy: jasmine.Spy;

  const byCss = {
    DROPDOWN: By.directive(DropdownComponent),
    OPTION: By.css('.mat-option-text'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatSelectModule],
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
    expChangedSpy = jasmine.createSpy();
    fixture.componentInstance.expChanged = expChangedSpy;
    return fixture;
  }

  describe('renders options', () => {
    it(' with no aliases', () => {
      let fixture = createTestableComponent({
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
    });

    it(' with valid aliases', () => {
      let fixture = createTestableComponent({
        expId: '2',
        configOptions: [
          {
            value: '2',
            displayText: 'loooonnnnngggggg',
            disabled: false,
            displayAlias: 'long',
          },
        ],
      });
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(byCss.DROPDOWN);
      expect(dropdown.componentInstance.value).toEqual('2');
      expect(dropdown.componentInstance.options).toEqual([
        jasmine.objectContaining({
          value: '2',
          displayText: 'loooonnnnngggggg',
          displayAlias: 'long',
        }),
      ]);
    });
  });
});
