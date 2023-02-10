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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {MetricsDashboardContainer} from './metrics_container';

describe('metrics view', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricsDashboardContainer],
      providers: [],
      // Ignore errors from components that are out-of-scope for this test:
      // 'runs-selector'.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('renders', () => {
    const fixture = TestBed.createComponent(MetricsDashboardContainer);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('runs-selector'))).not.toBeNull();
  });
});
