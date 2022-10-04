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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {
  TimeSelectionAffordance,
  TimeSelectionToggleAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {DropdownModule} from '../../../widgets/dropdown/dropdown_module';
import {RangeInputSource} from '../../../widgets/range_input/types';
import * as actions from '../../actions';
import {HistogramMode, TooltipSort, XAxisType} from '../../types';
import {RightPaneComponent} from './right_pane_component';
import {SettingsViewComponent, TEST_ONLY} from './settings_view_component';
import {SettingsViewContainer} from './settings_view_container';

describe('metrics right_pane', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        DropdownModule,
        MatButtonToggleModule,
        MatCheckboxModule,
        MatSelectModule,
        MatSliderModule,
      ],
      declarations: [
        RightPaneComponent,
        SettingsViewComponent,
        SettingsViewContainer,
      ],
      providers: [provideMockStore()],
      // Ignore errors from components that are out-of-scope for this test:
      // 'runs-selector'.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  describe('settings pane', () => {
    beforeEach(() => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.ALPHABETICAL
      );
      store.overrideSelector(selectors.getMetricsIgnoreOutliers, false);
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.2);
      store.overrideSelector(
        selectors.getMetricsScalarPartitionNonMonotonicX,
        false
      );
      store.overrideSelector(selectors.getMetricsImageBrightnessInMilli, 200);
      store.overrideSelector(selectors.getMetricsImageContrastInMilli, 10);
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);
      store.overrideSelector(
        selectors.getMetricsHistogramMode,
        HistogramMode.OFFSET
      );
      store.overrideSelector(selectors.getIsFeatureFlagsLoaded, true);
      store.overrideSelector(selectors.getIsMetricsImageSupportEnabled, true);
      store.overrideSelector(selectors.getIsLinkedTimeEnabled, false);
      store.overrideSelector(selectors.getIsDataTableEnabled, false);
      store.overrideSelector(selectors.getMetricsCardMinWidth, null);
      store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, false);
      store.overrideSelector(selectors.getMetricsStepSelectorEnabled, false);
      store.overrideSelector(
        selectors.getMetricsStepSelectorRangeEnabled,
        false
      );
      store.overrideSelector(selectors.getAllowRangeSelection, false);
      store.overrideSelector(selectors.getMetricsLinkedTimeSelectionSetting, {
        start: {step: 0},
        end: {step: 1000},
      });
      store.overrideSelector(selectors.getMetricsStepMinMax, {
        min: 0,
        max: 5000,
      });
    });

    function getMatSliderValue(el: DebugElement): string {
      return el.query(By.css('.mat-slider-thumb-label-text')).nativeElement
        .textContent;
    }

    function select(
      fixture: ComponentFixture<SettingsViewContainer>,
      cssSelector: string
    ): DebugElement {
      return fixture.debugElement.query(By.css(cssSelector));
    }

    it('renders', () => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.ALPHABETICAL
      );
      store.overrideSelector(selectors.getMetricsIgnoreOutliers, false);
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.3);
      store.overrideSelector(
        selectors.getMetricsScalarPartitionNonMonotonicX,
        true
      );
      store.overrideSelector(selectors.getMetricsImageBrightnessInMilli, 100);
      store.overrideSelector(selectors.getMetricsImageContrastInMilli, 200);
      store.overrideSelector(selectors.getMetricsImageShowActualSize, true);

      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const tooltipSortSelect = select(fixture, '.tooltip-sort tb-dropdown');
      // In the test setting, material component's DOM does not reflect the
      // value.
      expect(tooltipSortSelect.componentInstance.value).toBe(
        TooltipSort.ALPHABETICAL
      );

      expect(
        select(fixture, '.scalars-ignore-outliers input').attributes[
          'aria-checked'
        ]
      ).toBe('false');

      expect(
        select(fixture, '.scalars-partition-x input').attributes['aria-checked']
      ).toBe('true');

      const xAxisTypeSelect = select(fixture, '.x-axis-type tb-dropdown');
      expect(xAxisTypeSelect.componentInstance.value).toBe(XAxisType.STEP);

      const histogramModeSelect = select(
        fixture,
        '.histogram-mode tb-dropdown'
      );
      expect(histogramModeSelect.componentInstance.value).toBe(
        HistogramMode.OFFSET
      );

      const scalarSmoothingInput = select(
        fixture,
        '.scalars-smoothing .slider-input'
      );
      expect(scalarSmoothingInput.nativeElement.value).toBe('0.3');
      expect(
        getMatSliderValue(select(fixture, '.scalars-smoothing mat-slider'))
      ).toBe('0.30');

      expect(
        getMatSliderValue(select(fixture, '.image-brightness mat-slider'))
      ).toBe('0.1');

      expect(
        getMatSliderValue(select(fixture, '.image-contrast mat-slider'))
      ).toBe('0.2');

      expect(
        select(fixture, '.image-show-actual-size input').attributes[
          'aria-checked'
        ]
      ).toBe('true');
    });

    it('hides settings if images are not supported', () => {
      store.overrideSelector(selectors.getIsMetricsImageSupportEnabled, false);
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.image-brightness'))
      ).not.toBeTruthy();
      expect(
        fixture.debugElement.query(By.css('.image-contrast'))
      ).not.toBeTruthy();
      expect(
        fixture.debugElement.query(By.css('.image-show-actual-size'))
      ).not.toBeTruthy();
    });

    it('dispatches smoothing changed action on input', fakeAsync(() => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const scalarSmoothingInput = select(
        fixture,
        '.scalars-smoothing .slider-input'
      );
      scalarSmoothingInput.nativeElement.value = '0.3';
      scalarSmoothingInput.nativeElement.dispatchEvent(new Event('input'));
      tick(TEST_ONLY.SLIDER_AUDIT_TIME_MS);
      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsChangeScalarSmoothing({smoothing: 0.3})
      );
    }));

    it('dispatches corrected smoothing values on input', fakeAsync(() => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const scalarSmoothingInput = select(
        fixture,
        '.scalars-smoothing .slider-input'
      );
      scalarSmoothingInput.nativeElement.value = '-0.3';
      scalarSmoothingInput.nativeElement.dispatchEvent(new Event('input'));
      tick(TEST_ONLY.SLIDER_AUDIT_TIME_MS);

      expect(scalarSmoothingInput.nativeElement.value).toBe('0');
      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsChangeScalarSmoothing({smoothing: 0})
      );

      scalarSmoothingInput.nativeElement.value = '1.3';
      scalarSmoothingInput.nativeElement.dispatchEvent(new Event('input'));
      tick(TEST_ONLY.SLIDER_AUDIT_TIME_MS);

      expect(scalarSmoothingInput.nativeElement.value).toBe(
        TEST_ONLY.MAX_SMOOTHING_VALUE.toString()
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsChangeScalarSmoothing({
          smoothing: TEST_ONLY.MAX_SMOOTHING_VALUE,
        })
      );
    }));

    it('does not dispatch values on invalid input', fakeAsync(() => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      // Value can be empty string when invalid.
      const scalarSmoothingInput = select(
        fixture,
        '.scalars-smoothing .slider-input'
      );
      scalarSmoothingInput.nativeElement.value = '';
      scalarSmoothingInput.nativeElement.dispatchEvent(new Event('input'));
      tick(TEST_ONLY.SLIDER_AUDIT_TIME_MS);

      expect(scalarSmoothingInput.nativeElement.value).toBe('');
      expect(dispatchSpy).not.toHaveBeenCalled();
    }));

    it('dispatches metricsScalarPartitionNonMonotonicXToggled on toggle', () => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const checkbox = select(fixture, '.scalars-partition-x input');
      checkbox.nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsScalarPartitionNonMonotonicXToggled()
      );
    });

    it('dispatches metricsToggleIgnoreOutliers on toggle', () => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      select(fixture, '.scalars-ignore-outliers input').nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsToggleIgnoreOutliers()
      );
    });

    it('dispatches metricsToggleImageShowActualSize on toggle', () => {
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      select(fixture, '.image-show-actual-size input').nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        actions.metricsToggleImageShowActualSize()
      );
    });

    // mat-select does not render `input` or a DOM that can be manipulated.
    // skip the test for now.

    describe('card width setting', () => {
      const CARD_WIDTH_SLIDER = '.card-width mat-slider';

      it('renders slider and reset button', () => {
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        const el = fixture.debugElement.query(By.css('.card-width'));
        expect(el.query(By.css('mat-slider'))).toBeTruthy();
        expect(el.query(By.css('button'))).toBeTruthy();

        expect(getMatSliderValue(select(fixture, CARD_WIDTH_SLIDER))).toBe(
          TEST_ONLY.MIN_CARD_WIDTH_SLIDER_VALUE.toString()
        );
      });

      it('dispatches metricsChangeCardWidth action when adjusting the slider', fakeAsync(() => {
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();
        const slider = select(fixture, CARD_WIDTH_SLIDER);

        slider.triggerEventHandler('input', {value: 350});
        tick(TEST_ONLY.SLIDER_AUDIT_TIME_MS);

        expect(dispatchSpy).toHaveBeenCalledOnceWith(
          actions.metricsChangeCardWidth({cardMinWidth: 350})
        );
      }));

      it('dispatches metricsResetCardWidth action when clicking reset', () => {
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        const reset_button = select(fixture, '[aria-label="Reset card width"]');
        reset_button.nativeElement.click();

        expect(dispatchSpy).toHaveBeenCalledOnceWith(
          actions.metricsResetCardWidth()
        );
      });

      it('sets the card width to the value provided', () => {
        store.overrideSelector(selectors.getMetricsCardMinWidth, 400);
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        expect(getMatSliderValue(select(fixture, CARD_WIDTH_SLIDER))).toBe(
          '400'
        );
      });

      it('does not set invalid value', () => {
        store.overrideSelector(selectors.getMetricsCardMinWidth, null);
        let fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        expect(getMatSliderValue(select(fixture, CARD_WIDTH_SLIDER))).toBe(
          TEST_ONLY.MIN_CARD_WIDTH_SLIDER_VALUE.toString()
        );
      });
    });

    it('does not display link time setting on link time disabled', () => {
      store.overrideSelector(selectors.getIsLinkedTimeEnabled, false);
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const el = fixture.debugElement.query(By.css('.linked-time'));
      expect(el).toBeFalsy();
    });

    it('does not display step selector setting on step selector disabled', () => {
      store.overrideSelector(selectors.getIsDataTableEnabled, false);
      const fixture = TestBed.createComponent(SettingsViewContainer);
      fixture.detectChanges();

      const el = fixture.debugElement.query(By.css('.scalars-step-selector'));
      expect(el).toBeFalsy();
    });

    describe('linked time feature enabled', () => {
      beforeEach(() => {
        store.overrideSelector(selectors.getIsDataTableEnabled, true);
        store.overrideSelector(selectors.getIsLinkedTimeEnabled, true);
      });

      it('enables the feature only when xAxisType=STEP', () => {
        store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        const el = fixture.debugElement.query(
          By.css('.linked-time mat-checkbox input')
        );
        expect(el.properties['disabled']).toBe(false);

        store.overrideSelector(
          selectors.getMetricsXAxisType,
          XAxisType.WALL_TIME
        );
        store.refreshState();
        fixture.detectChanges();

        expect(el.properties['disabled']).toBe(true);
      });

      describe('toggles', () => {
        it('renders and dispatches action when toggling the feature', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, false);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(By.css('.linked-time'));
          const [enabled] = el.queryAll(By.css('mat-checkbox input'));
          expect(enabled.nativeElement.ariaChecked).toBe('false');

          enabled.nativeElement.click();

          expect(dispatchSpy).toHaveBeenCalledOnceWith(
            actions.linkedTimeToggled({
              affordance: TimeSelectionToggleAffordance.CHECK_BOX,
            })
          );

          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, true);
          store.refreshState();
          fixture.detectChanges();
          expect(enabled.nativeElement.ariaChecked).toBe('true');
        });
      });

      describe('range input', () => {
        beforeEach(() => {
          store.overrideSelector(selectors.getMetricsStepSelectorEnabled, true);
          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, true);
          store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
        });

        it('displays tb-range-input on both single and range step selection mode', () => {
          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 0},
              end: null,
            }
          );
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(By.css('.linked-time'));
          expect(el.query(By.css('tb-range-input'))).toBeTruthy();

          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 2},
              end: {step: 5},
            }
          );
          store.refreshState();
          fixture.detectChanges();
          expect(el.query(By.css('tb-range-input'))).toBeTruthy();
        });

        it('does not render tb-range-input on linked time disabled', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, false);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          expect(
            fixture.debugElement.query(By.css('.linked-time tb-range-input'))
          ).toBeNull();
        });

        it('enable tb-range-input only when xAxisType=STEP', () => {
          store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(
            By.css('.linked-time tb-range-input')
          );
          expect(el.properties['enabled']).toBe(true);

          store.overrideSelector(
            selectors.getMetricsXAxisType,
            XAxisType.RELATIVE
          );
          store.refreshState();
          fixture.detectChanges();
          expect(el.properties['enabled']).toBe(false);
        });

        it('dispatches actions when making range step change', () => {
          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 0},
              end: {step: 0},
            }
          );
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(By.css('.linked-time'));
          const rangeInput = el.query(By.css('tb-range-input'));

          rangeInput.triggerEventHandler('rangeValuesChanged', {
            lowerValue: 10,
            upperValue: 200,
            source: RangeInputSource.SLIDER,
          });

          expect(dispatchSpy).toHaveBeenCalledOnceWith(
            actions.timeSelectionChanged({
              timeSelection: {
                start: {step: 10},
                end: {step: 200},
              },
              affordance: TimeSelectionAffordance.SETTINGS_SLIDER,
            })
          );
        });

        it('dispatches actions when making single step change', () => {
          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 0},
              end: null,
            }
          );
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(By.css('.linked-time'));
          const rangeInput = el.query(By.css('tb-range-input'));

          rangeInput.triggerEventHandler('singleValueChanged', {
            value: 10,
            source: RangeInputSource.TEXT,
          });

          expect(dispatchSpy).toHaveBeenCalledOnceWith(
            actions.timeSelectionChanged({
              timeSelection: {
                start: {step: 10},
                end: null,
              },
              affordance: TimeSelectionAffordance.SETTINGS_TEXT,
            })
          );
        });

        it('displays expected linked time start step when linked time is not enabled', () => {
          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 20},
              end: null,
            }
          );
          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, false);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(
            By.css('.linked-time mat-checkbox')
          );
          expect(el.nativeElement.textContent).toContain('Link by step 20');

          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 40},
              end: null,
            }
          );
          store.refreshState();
          fixture.detectChanges();
          expect(el.nativeElement.textContent).toContain('Link by step 40');
        });

        it('does not display expected linked time start step when linked time is enabled', () => {
          store.overrideSelector(
            selectors.getMetricsLinkedTimeSelectionSetting,
            {
              start: {step: 20},
              end: null,
            }
          );
          store.overrideSelector(selectors.getMetricsLinkedTimeEnabled, true);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          const el = fixture.debugElement.query(
            By.css('.linked-time mat-checkbox')
          );
          expect(el.nativeElement.textContent.trim()).toBe('Link by step');
        });
      });
    });

    describe('step selector feature enabled', () => {
      beforeEach(() => {
        store.overrideSelector(selectors.getIsDataTableEnabled, true);
      });

      it('renders', () => {
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        expect(
          select(fixture, '.scalars-step-selector input').attributes[
            'aria-checked'
          ]
        ).toBe('false');
      });

      it('renders checked feature', () => {
        store.overrideSelector(selectors.getMetricsStepSelectorEnabled, true);
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        expect(
          select(fixture, '.scalars-step-selector input').attributes[
            'aria-checked'
          ]
        ).toBe('true');
      });

      it('dispatches stepSelectorEnableToggled on toggle', () => {
        const fixture = TestBed.createComponent(SettingsViewContainer);
        fixture.detectChanges();

        select(fixture, '.scalars-step-selector input').nativeElement.click();

        expect(dispatchSpy).toHaveBeenCalledWith(
          actions.stepSelectorToggled({
            affordance: TimeSelectionToggleAffordance.CHECK_BOX,
          })
        );
      });

      describe('range selection', () => {
        beforeEach(() => {
          store.overrideSelector(selectors.getAllowRangeSelection, true);
        });

        it('renders the Range Selection checkbox', () => {
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          expect(
            fixture.debugElement.query(By.css('.range-selection mat-checkbox'))
          ).toBeTruthy();
        });

        it('only enables checkbox when X Axis Type is Step', () => {
          store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();
          console.log(
            'properties',
            fixture.debugElement.query(By.css('.range-selection mat-checkbox'))
              .properties
          );
          const checkbox = fixture.debugElement.query(
            By.css('.range-selection mat-checkbox input')
          );
          expect(checkbox.properties['disabled']).toBe(false);

          store.overrideSelector(
            selectors.getMetricsXAxisType,
            XAxisType.WALL_TIME
          );
          store.refreshState();
          fixture.detectChanges();

          expect(checkbox.properties['disabled']).toBe(true);
        });

        it('dispatches rangeSelectionToggled on toggle', () => {
          const fixture = TestBed.createComponent(SettingsViewContainer);
          fixture.detectChanges();

          select(fixture, '.range-selection input').nativeElement.click();

          expect(dispatchSpy).toHaveBeenCalledWith(
            actions.rangeSelectionToggled({
              affordance: TimeSelectionToggleAffordance.CHECK_BOX,
            })
          );
        });
      });
    });
  });
});
