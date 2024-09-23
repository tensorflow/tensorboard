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
import {OverlayContainer} from '@angular/cdk/overlay';
import {Component, Input} from '@angular/core';
import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {KeyType, sendKey} from '../../testing/dom';
import {getAutocompleteOptions} from '../../testing/material';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {FilterInputModule} from './filter_input_module';

@Component({
  standalone: false,
  selector: 'test',
  template: `
    <tb-filter-input [value]="value" [matAutocomplete]="filterMatches">
    </tb-filter-input>

    <mat-autocomplete
      #filterMatches="matAutocomplete"
      (optionSelected)="onCompletionAccepted($event.option.value)"
    >
      <mat-option *ngFor="let completion of completions" [value]="completion">{{
        completion
      }}</mat-option>
    </mat-autocomplete>
  `,
})
class TestableInputWithCompletions {
  @Input() value?: string;
  @Input() completions: string[] = [];
}

@Component({
  standalone: false,
  selector: 'test',
  template: ` <tb-filter-input></tb-filter-input> `,
})
class TestableInputNoProps {
  @Input() value?: string;
}

describe('filter input widget', () => {
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatAutocompleteModule,
        MatIconTestingModule,
        FilterInputModule,
      ],
      declarations: [TestableInputNoProps, TestableInputWithCompletions],
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);
  });

  it('renders the value', () => {
    const fixture = TestBed.createComponent(TestableInputWithCompletions);
    fixture.componentInstance.value = 'foo';
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.value).toBe('foo');
  });

  it('renders with no value', () => {
    const fixture = TestBed.createComponent(TestableInputNoProps);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.value).toBe('');
    expect(input.nativeElement.placeholder).toBe('');
  });

  it('does not set matAutocomplete with an empty value', () => {
    const fixture = TestBed.createComponent(TestableInputNoProps);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const isAutocompleteDisabled =
      input.attributes['ng-reflect-autocomplete-disabled'] === 'true';
    const hasAutocomplete = !!input.attributes['ng-reflect-autocomplete'];
    expect(isAutocompleteDisabled || !hasAutocomplete).toBe(true);
  });

  it('shows autocomplete and closes on Enter', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestableInputWithCompletions);
    fixture.componentInstance.completions = ['a', 'b', 'c'];
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.focus();
    fixture.detectChanges();

    const options = getAutocompleteOptions(overlayContainer);
    expect(options.length).toBe(3);

    sendKey(fixture, input, {
      type: KeyType.SPECIAL,
      prevString: input.properties['value'],
      key: 'Enter',
      startingCursorIndex: input.properties['selectionStart'],
    });
    tick();

    const options2 = getAutocompleteOptions(overlayContainer);
    expect(options2.length).toBe(0);
  }));
});
