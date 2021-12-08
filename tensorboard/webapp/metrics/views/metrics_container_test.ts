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
import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {
  getIsTimeSeriesPromotionEnabled,
  getPromoteTimeSeries,
} from '../../selectors';
import {metricsPromoDismissed, metricsPromoGoToScalars} from '../actions';
import {MetricsDashboardContainer} from './metrics_container';
import {MetricsPromoNoticeComponent} from './metrics_promo_notice_component';
import {MetricsPromoNoticeContainer} from './metrics_promo_notice_container';

describe('metrics view', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [
        MetricsDashboardContainer,
        MetricsPromoNoticeContainer,
        MetricsPromoNoticeComponent,
      ],
      providers: [provideMockStore()],
      // Ignore errors from components that are out-of-scope for this test:
      // 'runs-selector'.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getIsTimeSeriesPromotionEnabled, false);
    store.overrideSelector(getPromoteTimeSeries, false);
  });

  it('renders', () => {
    const fixture = TestBed.createComponent(MetricsDashboardContainer);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('runs-selector'))).not.toBeNull();
  });

  it('renders notice when promotion is enabled and feature is not disabled by user', () => {
    store.overrideSelector(getIsTimeSeriesPromotionEnabled, true);
    store.overrideSelector(getPromoteTimeSeries, true);
    const fixture = TestBed.createComponent(MetricsDashboardContainer);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.notice'))).not.toBeNull();
  });

  describe('promotion', () => {
    let actions: Action[];

    function createComponent(): DebugElement {
      actions = [];
      spyOn(store, 'dispatch').and.callFake((action) => actions.push(action));

      store.overrideSelector(getIsTimeSeriesPromotionEnabled, true);
      store.overrideSelector(getPromoteTimeSeries, true);
      const fixture = TestBed.createComponent(MetricsDashboardContainer);
      fixture.detectChanges();

      return fixture.debugElement.query(By.css('metrics-promo-notice'));
    }

    it('dispatches action when clicking on dismiss', () => {
      const promoEl = createComponent();
      promoEl.query(By.css('.dismiss')).nativeElement.click();

      expect(actions).toEqual([metricsPromoDismissed()]);
    });

    it('dispatches action when clicking on "Go to scalars"', () => {
      const promoEl = createComponent();
      promoEl.query(By.css('.go-to-scalars')).nativeElement.click();

      expect(actions).toEqual([metricsPromoGoToScalars()]);
    });
  });
});
