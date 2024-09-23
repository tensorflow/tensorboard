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
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {
  getExperimentIdForRunId,
  getExperimentIdToExperimentAliasMap,
  getRun,
} from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {DataLoadState} from '../../../types/data';
import {
  TimeSelectionAffordance,
  TimeSelectionToggleAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {
  HistogramData,
  HistogramMode,
  TimeProperty,
} from '../../../widgets/histogram/histogram_types';
import {buildNormalizedHistograms} from '../../../widgets/histogram/histogram_util';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import {
  metricsCardFullSizeToggled,
  stepSelectorToggled,
  timeSelectionChanged,
} from '../../actions';
import {PluginType} from '../../data_source';
import * as selectors from '../../store/metrics_selectors';
import {
  appStateFromMetricsState,
  buildHistogramStepData,
  buildMetricsState,
  provideMockCardSeriesData,
} from '../../testing';
import {XAxisType} from '../../types';
import {HistogramCardComponent} from './histogram_card_component';
import {HistogramCardContainer} from './histogram_card_container';
import {RunNameModule} from './run_name_module';
import {VisLinkedTimeSelectionWarningModule} from './vis_linked_time_selection_warning_module';

@Component({
  standalone: false,
  selector: 'tb-histogram',
  template: ``,
})
class TestableHistogramWidget {
  @Input() mode!: HistogramMode;
  @Input() timeProperty!: TimeProperty;
  @Input() color!: string;
  @Input() name!: string;
  @Input() data!: HistogramData;
  @Input() timeSelection!: {
    start: {step: number};
    end: {step: number} | null;
  } | null;

  @Output() onLinkedTimeToggled = new EventEmitter();
  @Output() onLinkedTimeSelectionChanged = new EventEmitter();

  element = {
    setSeriesData: () => {},
  };

  redraw() {}
}

function createHistogramCardContainer(): ComponentFixture<HistogramCardContainer> {
  const fixture = TestBed.createComponent(HistogramCardContainer);
  fixture.componentInstance.cardId = 'card1';
  fixture.componentInstance.runColorScale = (run: string) => '#fff';

  return fixture;
}

describe('histogram card', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatIconTestingModule,
        MatProgressSpinnerModule,
        RunNameModule,
        TruncatedPathModule,
        VisLinkedTimeSelectionWarningModule,
      ],
      declarations: [
        HistogramCardComponent,
        HistogramCardContainer,
        TestableHistogramWidget,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    selectSpy = spyOn(store, 'select').and.callThrough();
    store.overrideSelector(getExperimentIdForRunId, null);
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {});
    store.overrideSelector(getRun, null);
    store.overrideSelector(selectors.getMetricsLinkedTimeSelection, null);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders empty message when there is no data', () => {
    const cardMetadata = {
      plugin: PluginType.HISTOGRAMS,
      tag: 'tagA',
      run: 'run1',
    };
    provideMockCardSeriesData(
      selectSpy,
      PluginType.HISTOGRAMS,
      'card1',
      cardMetadata,
      null /* timeSeries */
    );

    const fixture = createHistogramCardContainer();
    fixture.detectChanges();

    const headingEl = fixture.debugElement.query(By.css('.heading'));
    const histogramEl = fixture.debugElement.query(By.css('tb-histogram'));
    expect(headingEl.nativeElement.textContent).toContain('tagA');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Data failed to load'
    );
    expect(histogramEl).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.FAILED);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Data failed to load');
  });

  it('renders loading spinner when loading', () => {
    provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
    store.overrideSelector(
      selectors.getCardLoadState,
      DataLoadState.NOT_LOADED
    );
    store.refreshState();

    const fixture = createHistogramCardContainer();
    fixture.detectChanges();
    let loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADING);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADED);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.FAILED);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();
  });

  it('renders data', () => {
    const cardMetadata = {
      plugin: PluginType.HISTOGRAMS,
      tag: 'tagA',
      run: 'run1',
    };
    const timeSeries = [
      {wallTime: 100, step: 333, bins: [{min: 0, max: 100, count: 42}]},
      {wallTime: 101, step: 555, bins: [{min: 0, max: 100, count: 42}]},
      {wallTime: 102, step: 777, bins: [{min: 0, max: 100, count: 42}]},
    ];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.HISTOGRAMS,
      'card1',
      cardMetadata,
      timeSeries
    );

    const fixture = createHistogramCardContainer();
    fixture.detectChanges();

    const headingEl = fixture.debugElement.query(By.css('.heading'));
    const emptyEl = fixture.debugElement.query(By.css('.empty-message'));
    const histogramEl = fixture.debugElement.query(By.css('tb-histogram'));
    expect(headingEl.nativeElement.textContent).toContain('tagA');
    expect(emptyEl).not.toBeTruthy();
    expect(histogramEl).toBeTruthy();
    expect(histogramEl.componentInstance.data).toEqual(
      buildNormalizedHistograms([
        {wallTime: 100, step: 333, bins: [{x: 0, dx: 100, y: 42}]},
        {wallTime: 101, step: 555, bins: [{x: 0, dx: 100, y: 42}]},
        {wallTime: 102, step: 777, bins: [{x: 0, dx: 100, y: 42}]},
      ])
    );
  });

  it('respects settings from the store', () => {
    provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
    store.overrideSelector(
      selectors.getMetricsHistogramMode,
      HistogramMode.OFFSET
    );
    store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);

    const fixture = createHistogramCardContainer();
    fixture.detectChanges();

    const histogramEl = fixture.debugElement.query(By.css('tb-histogram'));
    expect(histogramEl.componentInstance.mode).toBe(HistogramMode.OFFSET);
    expect(histogramEl.componentInstance.timeProperty).toBe(TimeProperty.STEP);

    store.overrideSelector(
      selectors.getMetricsHistogramMode,
      HistogramMode.OVERLAY
    );
    store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.WALL_TIME);
    store.refreshState();

    fixture.detectChanges();

    expect(histogramEl.componentInstance.mode).toBe(HistogramMode.OVERLAY);
    expect(histogramEl.componentInstance.timeProperty).toBe(
      TimeProperty.WALL_TIME
    );
  });

  describe('full size', () => {
    let dispatchedActions: Action[];

    beforeEach(() => {
      provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');

      dispatchedActions = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });
    });

    it('dispatches metricsCardFullSizeToggled on full size toggle', () => {
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('[aria-label="Toggle full size mode"]')
      );

      button.nativeElement.click();
      expect(dispatchedActions).toEqual([
        metricsCardFullSizeToggled({cardId: 'card1'}),
      ]);
    });
  });

  describe('linked time', () => {
    beforeEach(() => {
      store.overrideSelector(selectors.getMetricsRangeSelectionEnabled, true);
    });

    it('dispatches timeSelectionChanged when HistogramComponent emits onLinkedTimeSelectionChanged event', () => {
      provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
      store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
        start: {step: 5},
        end: null,
      });
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();
      const dispatchedActions: Action[] = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });

      const histogramWidget = fixture.debugElement.query(
        By.directive(TestableHistogramWidget)
      ).componentInstance;
      histogramWidget.onLinkedTimeSelectionChanged.emit({
        timeSelection: {start: {step: 5}, end: null},
        affordance: TimeSelectionAffordance.FOB,
      });

      expect(dispatchedActions).toEqual([
        timeSelectionChanged({
          timeSelection: {
            start: {step: 5},
            end: null,
          },
          affordance: TimeSelectionAffordance.FOB,
        }),
      ]);
    });

    it('passes null when no time is selected', () => {
      provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
      store.overrideSelector(selectors.getMetricsLinkedTimeSelection, null);
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();

      const viz = fixture.debugElement.query(
        By.directive(TestableHistogramWidget)
      );
      expect(viz.componentInstance.timeSelection).toBeNull();
    });

    it('passes closest step linked time parameter to histogram viz', () => {
      provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
      store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
        start: {step: 5},
        end: null,
      });
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();

      const viz = fixture.debugElement.query(
        By.directive(TestableHistogramWidget)
      );
      expect(viz.componentInstance.timeSelection).toEqual({
        // Steps are [0, 1, 99] in mock data
        start: {step: 1},
        end: null,
      });
    });

    it('passes range step linked time parameter', () => {
      provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
      store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
        start: {step: 5},
        end: {step: 10},
      });
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();

      const viz = fixture.debugElement.query(
        By.directive(TestableHistogramWidget)
      );
      expect(viz.componentInstance.timeSelection).toEqual({
        start: {step: 5},
        end: {step: 10},
      });
    });

    it('removes end step when range selection is disabled', () => {
      provideMockCardSeriesData(
        selectSpy,
        PluginType.HISTOGRAMS,
        'card1',
        undefined,
        [buildHistogramStepData({step: 5}), buildHistogramStepData({step: 15})]
      );
      store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
        start: {step: 5},
        end: {step: 10},
      });
      store.overrideSelector(selectors.getMetricsRangeSelectionEnabled, false);
      const fixture = createHistogramCardContainer();
      fixture.detectChanges();

      const viz = fixture.debugElement.query(
        By.directive(TestableHistogramWidget)
      );
      expect(viz.componentInstance.timeSelection).toEqual({
        start: {step: 5},
        end: null,
      });
    });

    describe('time selection beyond range of data', () => {
      it('clips the time selection to max step', () => {
        provideMockCardSeriesData(
          selectSpy,
          PluginType.HISTOGRAMS,
          'card1',
          undefined,
          [
            buildHistogramStepData({step: 0}),
            buildHistogramStepData({step: 5}),
            buildHistogramStepData({step: 15}),
          ]
        );
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 18},
          end: {step: 20},
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const viz = fixture.debugElement.query(
          By.directive(TestableHistogramWidget)
        );
        expect(viz.componentInstance.timeSelection).toEqual({
          start: {step: 15},
          end: {step: 15},
        });
      });

      it('clips the time selection to min step when it is too small', () => {
        provideMockCardSeriesData(
          selectSpy,
          PluginType.HISTOGRAMS,
          'card1',
          undefined,
          [
            buildHistogramStepData({step: 100}),
            buildHistogramStepData({step: 50}),
            buildHistogramStepData({step: 200}),
          ]
        );
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 18},
          end: {step: 20},
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const viz = fixture.debugElement.query(
          By.directive(TestableHistogramWidget)
        );
        expect(viz.componentInstance.timeSelection).toEqual({
          start: {step: 50},
          end: {step: 50},
        });
      });

      it('renders warning when the time selection is clipped', () => {
        provideMockCardSeriesData(
          selectSpy,
          PluginType.HISTOGRAMS,
          'card1',
          undefined,
          [
            buildHistogramStepData({step: 100}),
            buildHistogramStepData({step: 50}),
            buildHistogramStepData({step: 200}),
          ]
        );
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 18},
          end: {step: 20},
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const indicatorBefore = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="clipped"]'
          )
        );
        expect(indicatorBefore).toBeTruthy();

        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 0},
          end: {step: 100},
        });
        store.refreshState();
        fixture.detectChanges();
        const indicatorAfter = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="clipped"]'
          )
        );
        expect(indicatorAfter).toBeTruthy();
      });
    });

    describe('closest step warning', () => {
      beforeEach(() => {
        provideMockCardSeriesData(
          selectSpy,
          PluginType.HISTOGRAMS,
          'card1',
          undefined,
          [
            buildHistogramStepData({step: 50}),
            buildHistogramStepData({step: 100}),
            buildHistogramStepData({step: 200}),
          ]
        );
      });

      it('renders warning when no data on the selected step', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 99},
          end: null,
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="closestStepHighlighted"]'
          )
        );
        expect(indicator).toBeTruthy();
      });

      it('does not render warning when data exist on selected step', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 100},
          end: null,
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="closestStepHighlighted"]'
          )
        );
        expect(indicator).toBeFalsy();
      });

      it('does not render warning when time selection is clipped', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 49},
          end: null,
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="closestStepHighlighted"]'
          )
        );
        expect(indicator).toBeFalsy();
      });

      it('does not render warning on range selection', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 99},
          end: {step: 102},
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="closestStepHighlighted"]'
          )
        );
        expect(indicator).toBeFalsy();
      });

      it('dispatches stepSelectorToggled when HistogramComponent emits the onLinkedTimeToggled event', () => {
        provideMockCardSeriesData(selectSpy, PluginType.HISTOGRAMS, 'card1');
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 5},
          end: null,
        });
        const fixture = createHistogramCardContainer();
        fixture.detectChanges();
        const dispatchedActions: Action[] = [];
        spyOn(store, 'dispatch').and.callFake((action: Action) => {
          dispatchedActions.push(action);
        });

        const histogramWidget = fixture.debugElement.query(
          By.directive(TestableHistogramWidget)
        ).componentInstance;
        histogramWidget.onLinkedTimeToggled.emit();

        expect(dispatchedActions).toEqual([
          stepSelectorToggled({
            affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
          }),
        ]);
      });
    });
  });
});
