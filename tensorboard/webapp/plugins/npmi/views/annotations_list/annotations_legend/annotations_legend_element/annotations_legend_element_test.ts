/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {TestBed, ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {AnnotationsLegendElementComponent} from './annotations_legend_element_component';

describe('Npmi Annotations Legend Element Container', () => {
  let fixture: ComponentFixture<AnnotationsLegendElementComponent>;
  const css = {
    GLYPH: 'svg',
    TITLE: '.legend-element-title',
    CIRCLE: 'circle',
    BAR: 'rect',
    RUN: 'path',
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsLegendElementComponent],
      imports: [],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnotationsLegendElementComponent);
    fixture.componentInstance.text = 'test';
    fixture.componentInstance.color = 'red';
  });

  it('renders circle', () => {
    fixture.componentInstance.shape = 'circle';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const circle = fixture.debugElement.query(By.css(css.CIRCLE));
    expect(circle).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });

  it('renders bar', () => {
    fixture.componentInstance.shape = 'bar';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const bar = fixture.debugElement.query(By.css(css.BAR));
    expect(bar).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });

  it('renders run glyph', () => {
    fixture.componentInstance.shape = 'runIndicator';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const run = fixture.debugElement.query(By.css(css.RUN));
    expect(run).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });
});
