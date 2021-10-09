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
import {By} from '@angular/platform-browser';

import {ExperimentAliasComponent} from './experiment_alias_component';

describe('experiment alias widget', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [ExperimentAliasComponent],
    }).compileComponents();
  });

  it('renders the alias', () => {
    const fixture = TestBed.createComponent(ExperimentAliasComponent);
    fixture.componentInstance.alias = {aliasText: 'my_alias', aliasNumber: 1};
    fixture.detectChanges();

    const spans = fixture.debugElement.queryAll(By.css('span'));
    expect(spans[0].nativeElement.textContent).toBe('1');
    expect(spans[1].nativeElement.textContent).toBe('my_alias');
    const numberSpan = fixture.debugElement.queryAll(By.css('.alias-number'));
    expect(numberSpan[0].nativeElement.textContent).toBe('1');
  });

  it('renders nothing no value', () => {
    const fixture = TestBed.createComponent(ExperimentAliasComponent);
    fixture.detectChanges();

    const input = fixture.debugElement.queryAll(By.css('span'));
    expect(input.length).toBe(0);
  });
});
