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
import {Component, Input} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ExperimentAlias} from '../../experiments/types';
import {sendKeys} from '../../testing/dom';
import {ContentWrappingInputModule} from '../content_wrapping_input/content_wrapping_input_module';
import {ExperimentAliasComponent} from './experiment_alias_component';

@Component({
  standalone: false,
  selector: 'testable',
  template: `<tb-experiment-alias
    [alias]="alias"
    [aliasEditable]="aliasEditable"
    [isAliasNameLegal]="isAliasNameLegal"
    (aliasChanged)="aliasChanged($event)"
  ></tb-experiment-alias>`,
})
class TestableComponent {
  @Input()
  alias!: ExperimentAlias;

  @Input()
  aliasEditable!: boolean;

  @Input()
  isAliasNameLegal?: boolean;

  @Input()
  aliasChanged: () => void = () => {};
}

describe('experiment alias widget', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentWrappingInputModule],
      declarations: [ExperimentAliasComponent, TestableComponent],
    }).compileComponents();
  });

  describe('non-edit mode', () => {
    it('renders the alias', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.alias = {aliasText: 'my_alias', aliasNumber: 1};
      fixture.detectChanges();

      const spans = fixture.debugElement.queryAll(By.css('span'));
      expect(spans[0].nativeElement.textContent).toBe('1');
      expect(spans[1].nativeElement.textContent).toBe('my_alias');
      const numberSpan = fixture.debugElement.queryAll(By.css('.alias-number'));
      expect(numberSpan[0].nativeElement.textContent).toBe('1');
    });

    it('puts class "illegal" if alias name is not legal', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.alias = {aliasText: '$', aliasNumber: 1};
      fixture.componentInstance.isAliasNameLegal = false;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.illegal'))).not.toBeNull();
    });
  });

  describe('edit mode', () => {
    it('renders content-wrapping-input', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.alias = {aliasText: 'tb rocks', aliasNumber: 1};
      fixture.componentInstance.aliasEditable = true;
      fixture.componentInstance.isAliasNameLegal = true;
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('content-wrapping-input'))
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('input')).nativeElement.value
      ).toBe('tb rocks');
    });

    it('renders input with error ui when alias name is not legal', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.alias = {aliasText: '$', aliasNumber: 1};
      fixture.componentInstance.aliasEditable = true;
      fixture.componentInstance.isAliasNameLegal = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(
        By.css('content-wrapping-input')
      );
      expect(input.componentInstance.style).not.toBe('error');

      fixture.componentInstance.isAliasNameLegal = false;
      fixture.detectChanges();
      expect(input.componentInstance.style).toBe('error');
    });

    it('bubbles up alias changes to via aliasChanged emitter', () => {
      const aliasChangedSpy = jasmine.createSpy();
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.alias = {aliasText: 'tb rocks', aliasNumber: 1};
      fixture.componentInstance.aliasEditable = true;
      fixture.componentInstance.aliasChanged = aliasChangedSpy;
      fixture.detectChanges();

      const debugEl = fixture.debugElement.query(By.css('input'));
      sendKeys(fixture, debugEl, 'ye');

      expect(aliasChangedSpy).toHaveBeenCalledWith({value: 'y'});
      expect(aliasChangedSpy).toHaveBeenCalledWith({value: 'ye'});
    });
  });
});
