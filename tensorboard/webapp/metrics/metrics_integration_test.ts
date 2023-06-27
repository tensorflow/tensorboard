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
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {IntegrationTestSetupModule} from '../testing/integration_test_module';
import {MetricsModule} from './metrics_module';
import {METRICS_INITIAL_SETTINGS} from './store/metrics_initial_state_provider';
import {METRICS_SETTINGS_DEFAULT} from './store/metrics_types';
import {MetricsDashboardContainer} from './views/metrics_container';

describe('metrics integration test', () => {
  const ByCss = {
    SCALARS_SMOOTHING_INPUT: By.css('.scalars-smoothing input'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        IntegrationTestSetupModule,
        NoopAnimationsModule,
        MetricsModule,
      ],
    });
  });

  describe('dependency injection', () => {
    it('populates correct default settings', async () => {
      await TestBed.compileComponents();
      const fixture = TestBed.createComponent(MetricsDashboardContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(ByCss.SCALARS_SMOOTHING_INPUT);
      expect(input.nativeElement.value).toBe('0.6');
    });

    it('permits overriding default settings with DI', async () => {
      TestBed.overrideProvider(METRICS_INITIAL_SETTINGS, {
        useValue: {
          ...METRICS_SETTINGS_DEFAULT,
          scalarSmoothing: 0.3,
        },
      });
      await TestBed.compileComponents();
      const fixture = TestBed.createComponent(MetricsDashboardContainer);

      fixture.detectChanges();

      const input = fixture.debugElement.query(ByCss.SCALARS_SMOOTHING_INPUT);
      expect(input.nativeElement.value).toBe('0.3');
    });
  });
});
