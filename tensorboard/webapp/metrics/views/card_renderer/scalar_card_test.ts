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
import {OverlayContainer} from '@angular/cdk/overlay';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  NO_ERRORS_SCHEMA,
  Output,
  TemplateRef,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import {MatDialogModule, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {Observable, of, ReplaySubject} from 'rxjs';
import {State} from '../../../app_state';
import {ExperimentAlias} from '../../../experiments/types';
import {Run} from '../../../runs/store/runs_types';
import {buildRun} from '../../../runs/store/testing';
import * as selectors from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {DataLoadState} from '../../../types/data';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {IntersectionObserverTestingModule} from '../../../widgets/intersection_observer/intersection_observer_testing_module';
import {
  Formatter,
  relativeTimeFormatter,
  siNumberFormatter,
} from '../../../widgets/line_chart_v2/lib/formatter';
import {
  DataSeries,
  DataSeriesMetadataMap,
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {LinkedTimeFobModule} from '../../../widgets/linked_time_fob/linked_time_fob_module';
import {ResizeDetectorTestingModule} from '../../../widgets/resize_detector_testing_module';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import {PluginType} from '../../data_source';
import {getMetricsScalarSmoothing, getMetricsSelectedTime} from '../../store';
import {
  appStateFromMetricsState,
  buildMetricsState,
  buildScalarStepData,
  provideMockCardRunToSeriesData,
} from '../../testing';
import {TooltipSort, XAxisType} from '../../types';
import {ScalarCardComponent} from './scalar_card_component';
import {ScalarCardContainer} from './scalar_card_container';
import {
  ScalarCardPoint,
  ScalarCardSeriesMetadata,
  SeriesType,
} from './scalar_card_types';

@Component({
  selector: 'line-chart',
  template: `
    {{ tooltipData | json }}
    <ng-container
      *ngIf="tooltipTemplate"
      [ngTemplateOutlet]="tooltipTemplate"
      [ngTemplateOutletContext]="{
        data: tooltipDataForTesting,
        cursorLocationInDataCoord: cursorLocForTesting
      }"
    ></ng-container>
    <ng-container
      *ngIf="customXAxisTemplate"
      [ngTemplateOutlet]="customXAxisTemplate"
      [ngTemplateOutletContext]="axisTemplateContext"
    >
    </ng-container>
  `,
})
class TestableLineChart {
  @Input() customXFormatter?: Formatter;
  @Input() preferredRendererType!: RendererType;
  @Input() seriesData!: DataSeries[];
  @Input() seriesMetadataMap!: DataSeriesMetadataMap;
  @Input() xScaleType!: ScaleType;
  @Input() yScaleType!: ScaleType;
  @Input() ignoreYOutliers!: boolean;
  @Input() disableUpdate?: boolean;
  @Input() useDarkMode?: boolean;
  @Input()
  tooltipTemplate!: TemplateRef<{data: TooltipDatum[]}>;

  @Input()
  customXAxisTemplate!: TemplateRef<{}>;

  axisTemplateContext = {
    viewExtent: {x: [0, 100], y: [0, 1000]},
    domDimension: {width: 200, height: 200},
    xScale: {
      forward: () => 0,
    },
    formatter: {
      formatTick: (num: number) => String(num),
    },
  };

  @Output()
  onViewBoxOverridden = new EventEmitter<boolean>();

  // This input does not exist on real line-chart and is devised to make tooltipTemplate
  // testable without using the real implementation.
  @Input() tooltipDataForTesting: TooltipDatum[] = [];
  @Input() cursorLocForTesting: {x: number; y: number} = {x: 0, y: 0};

  private isViewBoxOverridden = new ReplaySubject<boolean>(1);

  getIsViewBoxOverridden(): Observable<boolean> {
    return this.isViewBoxOverridden;
  }

  viewBoxReset() {}

  constructor(public readonly changeDetectorRef: ChangeDetectorRef) {}
}

// DataDownloadContainer pulls in entire redux and, for this test, we don't want to
// know about their data requirements.
@Component({
  selector: 'testable-data-download-dialog',
  template: `{{ cardId }}`,
})
class TestableDataDownload {
  cardId = 'hello';
  constructor(@Inject(MAT_DIALOG_DATA) data: {cardId: string}) {
    this.cardId = data.cardId;
  }
}

const anyString = jasmine.any(String);

function buildAlias(override: Partial<ExperimentAlias> = {}): ExperimentAlias {
  return {
    aliasNumber: 1,
    aliasText: 'hello',
    ...override,
  };
}

describe('scalar card', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;
  let overlayContainer: OverlayContainer;
  let intersectionObserver: IntersectionObserverTestingModule;

  const Selector = {
    FIT_TO_DOMAIN: By.css('[aria-label="Fit line chart domains to data"]'),
    LINE_CHART: By.directive(TestableLineChart),
    TOOLTIP_HEADER_COLUMN: By.css('table.tooltip th'),
    TOOLTIP_ROW: By.css('table.tooltip .tooltip-row'),
    HEADER_WARNING: By.css('vis-selected-time-clipped'),
    LINKED_TIME_AXIS_FOB: By.css('.selected-time-fob'),
  };

  function openOverflowMenu(fixture: ComponentFixture<ScalarCardContainer>) {
    const menuButton = fixture.debugElement.query(
      By.css('[aria-label="More line chart options"]')
    );
    menuButton.nativeElement.click();
    fixture.detectChanges();
  }

  function getMenuButton(buttonAriaLabel: string) {
    const buttons = overlayContainer
      .getContainerElement()
      .querySelectorAll(`[aria-label="${buttonAriaLabel}"]`);
    expect(buttons.length).toBe(1);
    return buttons[0] as HTMLButtonElement;
  }

  function createComponent(
    cardId: string,
    initiallyHidden?: boolean
  ): ComponentFixture<ScalarCardContainer> {
    const fixture = TestBed.createComponent(ScalarCardContainer);
    fixture.componentInstance.cardId = cardId;
    fixture.componentInstance.DataDownloadComponent = TestableDataDownload;
    if (!initiallyHidden) {
      intersectionObserver.simulateVisibilityChange(fixture, true);
    }
    // Let the observables to be subscribed.
    fixture.detectChanges();
    // Flush the debounce on the `seriesData$`.
    tick(0);
    // Redraw based on the flushed `seriesData$`.
    fixture.detectChanges();

    const scalarCardComponent = fixture.debugElement.query(
      By.directive(ScalarCardComponent)
    );
    const lineChartComponent = fixture.debugElement.query(Selector.LINE_CHART);

    if (!initiallyHidden) {
      // HACK: we are using viewChild in ScalarCardComponent and there is
      // no good way to provide a stub implementation. Manually set what
      // would be populated by ViewChild decorator.
      scalarCardComponent.componentInstance.lineChart =
        lineChartComponent.componentInstance;
      // lineChart property is now set; let the template re-render with
      // `lineChart` checks correctly return the right value.
      lineChartComponent.componentInstance.changeDetectorRef.markForCheck();
    }
    fixture.detectChanges();
    return fixture;
  }

  function triggerStoreUpdate() {
    store.refreshState();
    // Flush the debounce on the `seriesData$`.
    tick(0);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ExperimentAliasModule,
        IntersectionObserverTestingModule,
        LinkedTimeFobModule,
        MatDialogModule,
        MatIconTestingModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        NoopAnimationsModule,
        ResizeDetectorTestingModule,
        TruncatedPathModule,
      ],
      declarations: [
        ScalarCardContainer,
        ScalarCardComponent,
        TestableDataDownload,
        TestableLineChart,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    intersectionObserver = TestBed.inject(IntersectionObserverTestingModule);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    selectSpy = spyOn(store, 'select').and.callThrough();
    overlayContainer = TestBed.inject(OverlayContainer);
    store.overrideSelector(
      selectors.getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );
    store.overrideSelector(selectors.getExperimentIdForRunId, null);
    store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {});
    store.overrideSelector(selectors.getRun, null);
    store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
    store.overrideSelector(selectors.getVisibleCardIdSet, new Set(['card1']));
    store.overrideSelector(
      selectors.getMetricsScalarPartitionNonMonotonicX,
      false
    );
    store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
    store.overrideSelector(selectors.getMetricsIgnoreOutliers, false);
    store.overrideSelector(
      selectors.getMetricsTooltipSort,
      TooltipSort.ALPHABETICAL
    );
    store.overrideSelector(selectors.getRunColorMap, {});
    store.overrideSelector(selectors.getDarkModeEnabled, false);
    store.overrideSelector(selectors.getForceSvgFeatureFlag, false);
  });

  describe('basic renders', () => {
    it('renders empty chart when there is no data', fakeAsync(() => {
      const cardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        run: null,
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        cardMetadata,
        null /* runToSeries */
      );

      const fixture = createComponent('card1');

      const metadataEl = fixture.debugElement.query(By.css('.heading'));
      expect(metadataEl.nativeElement.textContent).toContain('tagA');

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl).toBeTruthy();
      expect(lineChartEl.componentInstance.seriesData.length).toBe(0);
    }));

    it('renders loading spinner when loading', fakeAsync(() => {
      provideMockCardRunToSeriesData(selectSpy, PluginType.SCALARS, 'card1');
      store.overrideSelector(
        selectors.getCardLoadState,
        DataLoadState.NOT_LOADED
      );
      triggerStoreUpdate();

      const fixture = createComponent('card1');
      let loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
      expect(loadingEl).not.toBeTruthy();

      store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADING);
      triggerStoreUpdate();
      fixture.detectChanges();
      loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
      expect(loadingEl).toBeTruthy();

      store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADED);
      triggerStoreUpdate();
      fixture.detectChanges();
      loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
      expect(loadingEl).not.toBeTruthy();

      store.overrideSelector(selectors.getCardLoadState, DataLoadState.FAILED);
      triggerStoreUpdate();
      fixture.detectChanges();
      loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
      expect(loadingEl).not.toBeTruthy();
    }));

    it('renders data', fakeAsync(() => {
      store.overrideSelector(getMetricsScalarSmoothing, 0);
      const cardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        run: null,
      };
      const runToSeries = {
        run1: [
          {wallTime: 100, value: 1, step: 333},
          {wallTime: 101, value: 2, step: 555},
        ],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        cardMetadata,
        runToSeries
      );
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(of(buildRun({name: 'Run1 name'})));

      const fixture = createComponent('card1');

      const metadataEl = fixture.debugElement.query(By.css('.heading'));
      const emptyEl = fixture.debugElement.query(By.css('.empty-message'));
      expect(metadataEl.nativeElement.textContent).toContain('tagA');
      expect(emptyEl).not.toBeTruthy();

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl).toBeTruthy();

      expect(lineChartEl.componentInstance.seriesData.length).toBe(1);
      const {id, points} = lineChartEl.componentInstance.seriesData[0];
      expect(id).toBe('run1');
      expect(
        points.map((p: {x: number; y: number}) => ({x: p.x, y: p.y}))
      ).toEqual([
        {x: 333, y: 1},
        {x: 555, y: 2},
      ]);
      const {visible, displayName} =
        lineChartEl.componentInstance.seriesMetadataMap[id];
      expect(displayName).toBe('Run1 name');
      expect(visible).toBe(true);
    }));

    describe('custom x axis formatter', () => {
      it('uses SI unit formatter when xAxisType is STEP', fakeAsync(() => {
        store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);

        const cardMetadata = {
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          run: null,
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          cardMetadata,
          null /* runToSeries */
        );

        const fixture = createComponent('card1');

        expect(
          fixture.debugElement.query(Selector.LINE_CHART).componentInstance
            .customXFormatter
        ).toBe(siNumberFormatter);
      }));

      it('uses relative time formatter when xAxisType is RELATIVE', fakeAsync(() => {
        store.overrideSelector(
          selectors.getMetricsXAxisType,
          XAxisType.RELATIVE
        );

        const cardMetadata = {
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          run: null,
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          cardMetadata,
          null /* runToSeries */
        );

        const fixture = createComponent('card1');

        expect(
          fixture.debugElement.query(Selector.LINE_CHART).componentInstance
            .customXFormatter
        ).toBe(relativeTimeFormatter);
      }));

      it('does not specify a custom X formatter for xAxisType WALL_TIME', fakeAsync(() => {
        store.overrideSelector(
          selectors.getMetricsXAxisType,
          XAxisType.WALL_TIME
        );

        const cardMetadata = {
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          run: null,
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          cardMetadata,
          null /* runToSeries */
        );

        const fixture = createComponent('card1');

        expect(
          fixture.debugElement.query(Selector.LINE_CHART).componentInstance
            .customXFormatter
        ).toBe(undefined);
      }));
    });

    it('sets useDarkMode when using dark mode', fakeAsync(() => {
      store.overrideSelector(selectors.getDarkModeEnabled, false);
      const fixture = createComponent('card1');
      fixture.detectChanges();

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl.componentInstance.useDarkMode).toBe(false);

      store.overrideSelector(selectors.getDarkModeEnabled, true);
      store.refreshState();
      fixture.detectChanges();

      expect(lineChartEl.componentInstance.useDarkMode).toBe(true);
    }));

    it('sets preferredRendererType to SVG when getForceSvgFeatureFlag returns true', fakeAsync(() => {
      store.overrideSelector(selectors.getForceSvgFeatureFlag, false);
      const fixture = createComponent('card1');
      fixture.detectChanges();

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl.componentInstance.preferredRendererType).toBe(
        RendererType.WEBGL
      );

      store.overrideSelector(selectors.getForceSvgFeatureFlag, true);
      store.refreshState();
      fixture.detectChanges();

      expect(lineChartEl.componentInstance.preferredRendererType).toBe(
        RendererType.SVG
      );
    }));
  });

  describe('displayName', () => {
    beforeEach(() => {
      const cardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        run: null,
      };
      const runToSeries = {run1: [{wallTime: 101, value: 2, step: 555}]};
      store.overrideSelector(getMetricsScalarSmoothing, 0);
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        cardMetadata,
        runToSeries
      );
    });

    it('sets displayName always as run name', fakeAsync(() => {
      selectSpy
        .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
        .and.returnValue(of('eid1'));
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(of(buildRun({name: 'Run1 name'})));
      store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'existing_exp', aliasNumber: 1},
        eid2: {aliasText: 'ERROR!', aliasNumber: 2},
      });

      const fixture = createComponent('card1');

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      const {displayName, alias} =
        lineChartEl.componentInstance.seriesMetadataMap['run1'];
      expect(displayName).toBe('Run1 name');
      expect(alias).toEqual({
        aliasNumber: 1,
        aliasText: 'existing_exp',
      });
    }));

    it('sets run id if a run and experiment are not found', fakeAsync(() => {
      selectSpy
        .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
        .and.returnValue(of(null));
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(of(null));
      store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {});

      const fixture = createComponent('card1');

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      const {alias, displayName} =
        lineChartEl.componentInstance.seriesMetadataMap['run1'];
      expect(displayName).toBe('run1');
      expect(alias).toBeNull();
    }));

    it('shows experiment id and "..." if only run is not found (maybe loading)', fakeAsync(() => {
      selectSpy
        .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
        .and.returnValue(of('eid1'));
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(of(null));
      store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'existing_exp', aliasNumber: 1},
      });

      const fixture = createComponent('card1');

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl.componentInstance.seriesData.length).toBe(1);

      const {displayName} =
        lineChartEl.componentInstance.seriesMetadataMap['run1'];
      expect(displayName).toBe('...');
    }));

    it('updates displayName with run when run populates', fakeAsync(() => {
      const getRun = new ReplaySubject<Run | null>(1);
      getRun.next(null);
      selectSpy
        .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
        .and.returnValue(of('eid1'));
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(getRun);
      store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
        eid1: {aliasText: 'existing_exp', aliasNumber: 1},
      });

      const fixture = createComponent('card1');

      getRun.next(buildRun({name: 'Foobar'}));
      triggerStoreUpdate();
      fixture.detectChanges();

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      const {alias, displayName} =
        lineChartEl.componentInstance.seriesMetadataMap['run1'];
      expect(displayName).toBe('Foobar');
      expect(alias).toEqual({
        aliasNumber: 1,
        aliasText: 'existing_exp',
      });
    }));
  });

  describe('xAxisType setting', () => {
    beforeEach(() => {
      const runToSeries = {
        run1: [
          {wallTime: 100, value: 1, step: 333},
          {wallTime: 101, value: 2, step: 555},
        ],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
    });

    const expectedPoints = {
      step: [
        {x: 333, y: 1},
        {x: 555, y: 2},
      ],
      wallTime: [
        {x: 100000, y: 1},
        {x: 101000, y: 2},
      ],
      relative: [
        {x: 0, y: 1},
        {x: 1000, y: 2},
      ],
    };

    const specs = [
      {
        name: 'step',
        xType: XAxisType.STEP,
        expectedPoints: expectedPoints.step,
      },
      {
        name: 'wall_time',
        xType: XAxisType.WALL_TIME,
        expectedPoints: expectedPoints.wallTime,
      },
      {
        name: 'relative',
        xType: XAxisType.RELATIVE,
        expectedPoints: expectedPoints.relative,
      },
    ];
    for (const spec of specs) {
      it(`formats series data when xAxisType is: ${spec.name}`, fakeAsync(() => {
        store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
        store.overrideSelector(selectors.getMetricsXAxisType, spec.xType);
        selectSpy
          .withArgs(selectors.getRun, {runId: 'run1'})
          .and.returnValue(of(buildRun({name: 'Run1 name'})));
        const fixture = createComponent('card1');

        const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
        expect(lineChartEl.componentInstance.seriesData.length).toBe(1);
        const {id, points} = lineChartEl.componentInstance.seriesData[0];
        const {visible, displayName} =
          lineChartEl.componentInstance.seriesMetadataMap['run1'];
        expect(id).toBe('run1');
        expect(displayName).toBe('Run1 name');
        expect(visible).toBe(true);
        expect(
          points.map((p: {x: number; y: number}) => ({x: p.x, y: p.y}))
        ).toEqual(spec.expectedPoints);
      }));
    }
  });

  describe('overflow menu', () => {
    beforeEach(() => {
      const runToSeries = {
        run1: [
          {wallTime: 100, value: 1, step: 333},
          {wallTime: 101, value: 2, step: 555},
        ],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
    });

    it('toggles yScaleType when you click on button in overflow menu', fakeAsync(() => {
      const fixture = createComponent('card1');

      openOverflowMenu(fixture);
      getMenuButton('Toggle Y-axis log scale on line chart').click();
      fixture.detectChanges();

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl.componentInstance.yScaleType).toBe(ScaleType.LOG10);

      openOverflowMenu(fixture);
      getMenuButton('Toggle Y-axis log scale on line chart').click();
      fixture.detectChanges();

      expect(lineChartEl.componentInstance.yScaleType).toBe(ScaleType.LINEAR);

      // Clicking on overflow menu and mat button enqueue asyncs. Flush them.
      flush();
    }));
  });

  describe('full size', () => {
    beforeEach(() => {
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */
      );
    });

    it('requests full size on toggle', fakeAsync(() => {
      const onFullWidthChanged = jasmine.createSpy();
      const onFullHeightChanged = jasmine.createSpy();
      const fixture = createComponent('card1');
      fixture.detectChanges();

      fixture.componentInstance.fullWidthChanged.subscribe(onFullWidthChanged);
      fixture.componentInstance.fullHeightChanged.subscribe(
        onFullHeightChanged
      );
      const button = fixture.debugElement.query(
        By.css('[aria-label="Toggle full size mode"]')
      );

      button.nativeElement.click();
      expect(onFullWidthChanged.calls.allArgs()).toEqual([[true]]);
      expect(onFullHeightChanged.calls.allArgs()).toEqual([[true]]);

      button.nativeElement.click();
      expect(onFullWidthChanged.calls.allArgs()).toEqual([[true], [false]]);
      expect(onFullHeightChanged.calls.allArgs()).toEqual([[true], [false]]);
    }));
  });

  describe('perf', () => {
    it('does not update `seriesData` for irrelevant runSelection changes', fakeAsync(() => {
      const runToSeries = {run1: []};
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );

      const fixture = createComponent('card1');
      const lineChartComponent = fixture.debugElement.query(
        Selector.LINE_CHART
      );
      const before = lineChartComponent.componentInstance.seriesData;

      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([
          ['run1', true],
          ['shouldBeNoop', true],
        ])
      );
      triggerStoreUpdate();
      fixture.detectChanges();

      const after = lineChartComponent.componentInstance.seriesData;
      expect(before).toBe(after);
    }));

    it(
      'does not update `seriesData` for relevant runSelection changes but only ' +
        'changes the metadataMap',
      fakeAsync(() => {
        const runToSeries = {run1: []};
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          null /* metadataOverride */,
          runToSeries
        );
        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([['run1', true]])
        );

        const fixture = createComponent('card1');
        const lineChartComponent = fixture.debugElement.query(
          Selector.LINE_CHART
        );
        const beforeSeries = lineChartComponent.componentInstance.seriesData;
        const beforeMap =
          lineChartComponent.componentInstance.seriesMetadataMap;

        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([['run1', false]])
        );
        triggerStoreUpdate();
        fixture.detectChanges();

        const afterSeries = lineChartComponent.componentInstance.seriesData;
        const afterMap = lineChartComponent.componentInstance.seriesMetadataMap;

        expect(beforeSeries).toBe(afterSeries);
        expect(beforeMap).not.toBe(afterMap);
      })
    );

    it('updates `seriesData` for xAxisType changes', fakeAsync(() => {
      const runToSeries = {
        run1: [
          {wallTime: 100, value: 1, step: 333},
          {wallTime: 101, value: 2, step: 555},
        ],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );

      const fixture = createComponent('card1');
      const lineChartComponent = fixture.debugElement.query(
        Selector.LINE_CHART
      );
      const before = lineChartComponent.componentInstance.seriesData;

      store.overrideSelector(
        selectors.getMetricsXAxisType,
        XAxisType.WALL_TIME
      );
      triggerStoreUpdate();
      fixture.detectChanges();

      const after = lineChartComponent.componentInstance.seriesData;
      expect(before).not.toBe(after);
    }));
  });

  it('passes data series and metadata with smoothed values', fakeAsync(() => {
    store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
    store.overrideSelector(selectors.getRunColorMap, {
      run1: '#f00',
      run2: '#0f0',
    });
    store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.1);

    const runToSeries = {
      run1: [
        {wallTime: 2, value: 1, step: 1},
        {wallTime: 4, value: 10, step: 2},
      ],
      run2: [{wallTime: 2, value: 1, step: 1}],
    };
    provideMockCardRunToSeriesData(
      selectSpy,
      PluginType.SCALARS,
      'card1',
      null /* metadataOverride */,
      runToSeries
    );

    const fixture = createComponent('card1');
    const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

    expect(lineChart.componentInstance.seriesData).toEqual([
      {
        id: 'run1',
        points: [
          // Keeps the data structure as is but do notice adjusted wallTime and
          // line_chart_v2 required "x" and "y" props.
          {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
          {
            wallTime: 4000,
            relativeTimeInMs: 2000,
            value: 10,
            step: 2,
            x: 2,
            y: 10,
          },
        ],
      },
      {
        id: 'run2',
        points: [
          {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
        ],
      },
      {
        id: '["smoothed","run1"]',
        points: [
          {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
          // Exact smoothed value is not too important.
          {
            wallTime: 4000,
            relativeTimeInMs: 2000,
            value: 10,
            step: 2,
            x: 2,
            y: jasmine.any(Number),
          },
        ],
      },
      {
        id: '["smoothed","run2"]',
        points: [
          {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
        ],
      },
    ]);
    expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
      run1: {
        id: 'run1',
        displayName: 'run1',
        type: SeriesType.ORIGINAL,
        visible: false,
        color: '#f00',
        opacity: 0.25,
        aux: true,
        alias: null,
      },
      run2: {
        id: 'run2',
        displayName: 'run2',
        type: SeriesType.ORIGINAL,
        visible: false,
        color: '#0f0',
        opacity: 0.25,
        aux: true,
        alias: null,
      },
      '["smoothed","run1"]': {
        id: '["smoothed","run1"]',
        displayName: 'run1',
        type: SeriesType.DERIVED,
        originalSeriesId: 'run1',
        visible: false,
        color: '#f00',
        opacity: 1,
        aux: false,
        alias: null,
      },
      '["smoothed","run2"]': {
        id: '["smoothed","run2"]',
        displayName: 'run2',
        type: SeriesType.DERIVED,
        originalSeriesId: 'run2',
        visible: false,
        color: '#0f0',
        opacity: 1,
        aux: false,
        alias: null,
      },
    });
  }));

  it('does not set smoothed series when it is disabled,', fakeAsync(() => {
    store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
    store.overrideSelector(selectors.getRunColorMap, {
      run1: '#f00',
      run2: '#0f0',
    });
    store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
    const runToSeries = {
      run1: [
        {wallTime: 2, value: 1, step: 1},
        {wallTime: 4, value: 10, step: 2},
      ],
      run2: [{wallTime: 2, value: 1, step: 1}],
    };
    provideMockCardRunToSeriesData(
      selectSpy,
      PluginType.SCALARS,
      'card1',
      null /* metadataOverride */,
      runToSeries
    );

    const fixture = createComponent('card1');
    const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

    expect(lineChart.componentInstance.seriesData).toEqual([
      {
        id: 'run1',
        points: [
          // Keeps the data structure as is but requires "x" and "y" props.
          {wallTime: 2000, value: 1, step: 1, x: 1, y: 1, relativeTimeInMs: 0},
          {
            wallTime: 4000,
            value: 10,
            step: 2,
            x: 2,
            y: 10,
            relativeTimeInMs: 2000,
          },
        ],
      },
      {
        id: 'run2',
        points: [
          {wallTime: 2000, value: 1, step: 1, x: 1, y: 1, relativeTimeInMs: 0},
        ],
      },
    ]);
    expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
      run1: {
        id: 'run1',
        displayName: 'run1',
        type: SeriesType.ORIGINAL,
        visible: false,
        color: '#f00',
        opacity: 1,
        aux: false,
        alias: null,
      },
      run2: {
        id: 'run2',
        displayName: 'run2',
        type: SeriesType.ORIGINAL,
        visible: false,
        color: '#0f0',
        opacity: 1,
        aux: false,
        alias: null,
      },
    });
  }));

  describe('tooltip', () => {
    function buildTooltipDatum(
      metadata?: ScalarCardSeriesMetadata,
      point: Partial<ScalarCardPoint> = {}
    ): TooltipDatum<ScalarCardSeriesMetadata, ScalarCardPoint> {
      return {
        id: metadata?.id ?? 'a',
        metadata: {
          type: SeriesType.ORIGINAL,
          id: 'a',
          displayName: 'A name',
          visible: true,
          color: '#f00',
          alias: null,
          ...metadata,
        },
        closestPointIndex: 0,
        point: {
          x: 0,
          y: 0,
          value: 0,
          step: 0,
          wallTime: 0,
          relativeTimeInMs: 0,
          ...point,
        },
      };
    }

    function setTooltipData(
      fixture: ComponentFixture<ScalarCardContainer>,
      tooltipData: TooltipDatum[]
    ) {
      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

      lineChart.componentInstance.tooltipDataForTesting = tooltipData;
      lineChart.componentInstance.changeDetectorRef.markForCheck();
    }

    function setCursorLocation(
      fixture: ComponentFixture<ScalarCardContainer>,
      cursorLocInDataCoord?: {x: number; y: number}
    ) {
      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

      lineChart.componentInstance.cursorLocForTesting = cursorLocInDataCoord;
      lineChart.componentInstance.changeDetectorRef.markForCheck();
    }

    function assertTooltipRows(
      fixture: ComponentFixture<ScalarCardContainer>,
      expectedTableContent: Array<
        Array<string | ReturnType<typeof jasmine.any>>
      >
    ) {
      const rows = fixture.debugElement.queryAll(Selector.TOOLTIP_ROW);
      const tableContent = rows.map((row) => {
        return row
          .queryAll(By.css('td'))
          .map((td) => td.nativeElement.textContent.trim());
      });

      expect(tableContent).toEqual(expectedTableContent);
    }

    it('renders the tooltip using the custom template (no smooth)', fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'row1',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#00f',
          },
          {
            x: 10,
            step: 10,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
            relativeTimeInMs: 1000 * 60 * 60 * 24 * 365 * 3,
          }
        ),
        buildTooltipDatum(
          {
            id: 'row2',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
          },
          {
            x: 1000,
            step: 1000,
            y: -1000,
            value: -1000,
            wallTime: new Date('2020-12-31').getTime(),
            relativeTimeInMs: 0,
          }
        ),
      ]);
      fixture.detectChanges();

      const headerCols = fixture.debugElement.queryAll(
        Selector.TOOLTIP_HEADER_COLUMN
      );
      const headerText = headerCols.map((col) => col.nativeElement.textContent);
      expect(headerText).toEqual([
        '',
        'Run',
        'Value',
        'Step',
        'Time',
        'Relative',
      ]);

      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '10', '1/1/20, 12:00 AM', '3 yr'],
        ['', 'Row 2', '-1000', '1,000', '12/31/20, 12:00 AM', '0'],
      ]);
    }));

    it('renders the tooltip using the custom template (smooth)', fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.5);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'smoothed_row1',
            type: SeriesType.DERIVED,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
            originalSeriesId: 'row1',
          },
          {
            x: 10,
            step: 10,
            y: 10002000,
            value: 10001337,
            wallTime: new Date('2020-01-01').getTime(),
            relativeTimeInMs: 10,
          }
        ),
        buildTooltipDatum(
          {
            id: 'smoothed_row2',
            type: SeriesType.DERIVED,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
            originalSeriesId: 'row2',
          },
          {
            x: 1000,
            step: 1000,
            y: -0.0005,
            value: -0.9312345,
            wallTime: new Date('2020-12-31').getTime(),
            relativeTimeInMs: 5000,
          }
        ),
      ]);
      fixture.detectChanges();

      const headerCols = fixture.debugElement.queryAll(
        Selector.TOOLTIP_HEADER_COLUMN
      );
      const headerText = headerCols.map((col) => col.nativeElement.textContent);
      expect(headerText).toEqual([
        '',
        'Run',
        'Smoothed',
        'Value',
        'Step',
        'Time',
        'Relative',
      ]);

      assertTooltipRows(fixture, [
        ['', 'Row 1', '1e+7', '1e+7', '10', '1/1/20, 12:00 AM', '10 ms'],
        // Print the step with comma for readability. The value is yet optimize for
        // readability (we may use the scientific formatting).
        [
          '',
          'Row 2',
          '-5e-4',
          '-0.9312',
          '1,000',
          '12/31/20, 12:00 AM',
          '5 sec',
        ],
      ]);
    }));

    it('shows relative time when XAxisType is RELATIVE', fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.RELATIVE);
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'smoothed_row1',
            type: SeriesType.DERIVED,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
            originalSeriesId: 'row1',
          },
          {
            x: 10,
            step: 10,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
            relativeTimeInMs: 10,
          }
        ),
        buildTooltipDatum(
          {
            id: 'smoothed_row2',
            type: SeriesType.DERIVED,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
            originalSeriesId: 'row2',
          },
          {
            x: 432000000,
            step: 1000,
            y: -1000,
            value: -1000,
            wallTime: new Date('2020-01-05').getTime(),
            relativeTimeInMs: 432000000,
          }
        ),
      ]);
      fixture.detectChanges();

      const headerCols = fixture.debugElement.queryAll(
        Selector.TOOLTIP_HEADER_COLUMN
      );
      const headerText = headerCols.map((col) => col.nativeElement.textContent);
      expect(headerText).toEqual([
        '',
        'Run',
        'Value',
        'Step',
        'Time',
        'Relative',
      ]);

      const rows = fixture.debugElement.queryAll(Selector.TOOLTIP_ROW);
      const tableContent = rows.map((row) => {
        return row
          .queryAll(By.css('td'))
          .map((td) => td.nativeElement.textContent.trim());
      });

      expect(tableContent).toEqual([
        ['', 'Row 1', '1000', '10', '1/1/20, 12:00 AM', '10 ms'],
        ['', 'Row 2', '-1000', '1,000', '1/5/20, 12:00 AM', '5 day'],
      ]);
    }));

    it('renders alias when alias is non-null', fakeAsync(() => {
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum({
          id: 'row1',
          type: SeriesType.ORIGINAL,
          displayName: 'Row 1',
          alias: null,
          visible: true,
          color: '#00f',
        }),
        buildTooltipDatum({
          id: 'row2',
          type: SeriesType.ORIGINAL,
          displayName: 'Row 2',
          alias: buildAlias({
            aliasNumber: 50,
            aliasText: 'myAlias',
          }),
          visible: true,
          color: '#0f0',
        }),
      ]);
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 1', anyString, anyString, anyString, anyString],
        ['', '50myAlias/Row 2', anyString, anyString, anyString, anyString],
      ]);
    }));

    it('sorts by ascending', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.ASCENDING
      );
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'row1',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#f00',
            aux: false,
          },
          {
            x: 10,
            step: 10,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row2',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
          },
          {
            x: 1000,
            step: 1000,
            y: -500,
            value: -500,
            wallTime: new Date('2020-12-31').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row3',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 3',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
          },
          {
            x: 10000,
            step: 10000,
            y: 3,
            value: 3,
            wallTime: new Date('2021-01-01').getTime(),
          }
        ),
      ]);
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
        ['', 'Row 1', '1000', '10', anyString, anyString],
      ]);
    }));

    it('sorts by descending', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.DESCENDING
      );
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'row1',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#f00',
            aux: false,
          },
          {
            x: 10,
            step: 10,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row2',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
          },
          {
            x: 1000,
            step: 1000,
            y: -500,
            value: -500,
            wallTime: new Date('2020-12-31').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row3',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 3',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
          },
          {
            x: 10000,
            step: 10000,
            y: 3,
            value: 3,
            wallTime: new Date('2021-01-01').getTime(),
          }
        ),
      ]);
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '10', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
      ]);
    }));

    it('sorts by nearest to the cursor', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.NEAREST
      );
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'row1',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 1',
            alias: null,
            visible: true,
            color: '#f00',
            aux: false,
          },
          {
            x: 0,
            step: 0,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row2',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 2',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
          },
          {
            x: 1000,
            step: 1000,
            y: -500,
            value: -500,
            wallTime: new Date('2020-12-31').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row3',
            type: SeriesType.ORIGINAL,
            displayName: 'Row 3',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
          },
          {
            x: 10000,
            step: 10000,
            y: 3,
            value: 3,
            wallTime: new Date('2021-01-01').getTime(),
          }
        ),
      ]);
      setCursorLocation(fixture, {x: 500, y: -100});
      fixture.detectChanges();
      assertTooltipRows(fixture, [
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);

      setCursorLocation(fixture, {x: 500, y: 600});
      fixture.detectChanges();
      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);

      setCursorLocation(fixture, {x: 10000, y: -100});
      fixture.detectChanges();
      assertTooltipRows(fixture, [
        ['', 'Row 3', '3', '10,000', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 1', '1000', '0', anyString, anyString],
      ]);

      // Right between row 1 and row 2. When tied, original order is used.
      setCursorLocation(fixture, {x: 500, y: 250});
      fixture.detectChanges();
      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);
    }));

    it('sorts by displayname alphabetical order', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsTooltipSort,
        TooltipSort.ALPHABETICAL
      );
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      const fixture = createComponent('card1');
      setTooltipData(fixture, [
        buildTooltipDatum(
          {
            id: 'row1',
            type: SeriesType.ORIGINAL,
            displayName: 'hello',
            alias: null,
            visible: true,
            color: '#f00',
            aux: false,
          },
          {
            x: 0,
            step: 0,
            y: 1000,
            value: 1000,
            wallTime: new Date('2020-01-01').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row2',
            type: SeriesType.ORIGINAL,
            displayName: 'world',
            alias: null,
            visible: true,
            color: '#0f0',
            aux: false,
          },
          {
            x: 1000,
            step: 1000,
            y: -500,
            value: -500,
            wallTime: new Date('2020-12-31').getTime(),
          }
        ),
        buildTooltipDatum(
          {
            id: 'row3',
            type: SeriesType.ORIGINAL,
            displayName: 'cat',
            alias: null,
            visible: true,
            color: '#00f',
            aux: false,
          },
          {
            x: 10000,
            step: 10000,
            y: 3,
            value: 3,
            wallTime: new Date('2021-01-01').getTime(),
          }
        ),
      ]);
      fixture.detectChanges();
      assertTooltipRows(fixture, [
        ['', 'cat', '3', '10,000', anyString, anyString],
        ['', 'hello', '1000', '0', anyString, anyString],
        ['', 'world', '-500', '1,000', anyString, anyString],
      ]);
    }));
  });

  describe('non-monotonic increase in x-axis', () => {
    it('partitions to pseudo runs when steps increase non-monotonically', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsScalarPartitionNonMonotonicX,
        true
      );
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      store.overrideSelector(selectors.getRunColorMap, {
        run1: '#f00',
        run2: '#0f0',
      });
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);

      const runToSeries = {
        run1: [
          {wallTime: 2, value: 1, step: 1},
          {wallTime: 4, value: 10, step: 2},
          {wallTime: 6, value: 30, step: 2},
          {wallTime: 6, value: 10, step: 1},
          {wallTime: 3, value: 20, step: 4},
        ],
        run2: [{wallTime: 2, value: 1, step: 1}],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );

      const fixture = createComponent('card1');
      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

      expect(lineChart.componentInstance.seriesData).toEqual([
        {
          id: '["run1",0]',
          points: [
            {
              wallTime: 2000,
              value: 1,
              step: 1,
              x: 1,
              y: 1,
              relativeTimeInMs: 0,
            },
            {
              wallTime: 4000,
              value: 10,
              step: 2,
              x: 2,
              y: 10,
              relativeTimeInMs: 2000,
            },
            {
              wallTime: 6000,
              value: 30,
              step: 2,
              x: 2,
              y: 30,
              relativeTimeInMs: 4000,
            },
          ],
        },
        {
          id: '["run1",1]',
          points: [
            {
              wallTime: 6000,
              value: 10,
              step: 1,
              x: 1,
              y: 10,
              relativeTimeInMs: 0,
            },
            {
              wallTime: 3000,
              value: 20,
              step: 4,
              x: 4,
              y: 20,
              relativeTimeInMs: -3000,
            },
          ],
        },
        {
          id: '["run2",0]',
          points: [
            {
              wallTime: 2000,
              value: 1,
              step: 1,
              x: 1,
              y: 1,
              relativeTimeInMs: 0,
            },
          ],
        },
      ]);
      expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
        '["run1",0]': {
          id: '["run1",0]',
          displayName: 'run1: 0',
          type: SeriesType.ORIGINAL,
          visible: false,
          color: '#f00',
          opacity: 1,
          aux: false,
          alias: null,
        },
        '["run1",1]': {
          id: '["run1",1]',
          displayName: 'run1: 1',
          type: SeriesType.ORIGINAL,
          visible: false,
          color: '#f00',
          opacity: 1,
          aux: false,
          alias: null,
        },
        '["run2",0]': {
          id: '["run2",0]',
          displayName: 'run2',
          type: SeriesType.ORIGINAL,
          visible: false,
          color: '#0f0',
          opacity: 1,
          aux: false,
          alias: null,
        },
      });
    }));

    it('partitions to pseudo runs when wall_time increase non-monotonically', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsScalarPartitionNonMonotonicX,
        true
      );
      store.overrideSelector(
        selectors.getMetricsXAxisType,
        XAxisType.WALL_TIME
      );
      store.overrideSelector(selectors.getRunColorMap, {
        run1: '#f00',
        run2: '#0f0',
      });
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);

      const runToSeries = {
        run1: [
          {wallTime: 2, value: 1, step: 1},
          {wallTime: 4, value: 10, step: 2},
          {wallTime: 6, value: 30, step: 2},
          {wallTime: 6, value: 10, step: 1},
          {wallTime: 3, value: 20, step: 4},
        ],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );

      const fixture = createComponent('card1');
      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

      expect(lineChart.componentInstance.seriesData).toEqual([
        {
          id: '["run1",0]',
          points: [
            {
              wallTime: 2000,
              relativeTimeInMs: 0,
              value: 1,
              step: 1,
              x: 2000,
              y: 1,
            },
            {
              wallTime: 4000,
              relativeTimeInMs: 2000,
              value: 10,
              step: 2,
              x: 4000,
              y: 10,
            },
            {
              wallTime: 6000,
              relativeTimeInMs: 4000,
              value: 30,
              step: 2,
              x: 6000,
              y: 30,
            },
            {
              wallTime: 6000,
              relativeTimeInMs: 4000,
              value: 10,
              step: 1,
              x: 6000,
              y: 10,
            },
          ],
        },
        {
          id: '["run1",1]',
          points: [
            {
              wallTime: 3000,
              relativeTimeInMs: 0,
              value: 20,
              step: 4,
              x: 3000,
              y: 20,
            },
          ],
        },
      ]);
      expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
        '["run1",0]': {
          id: '["run1",0]',
          displayName: 'run1: 0',
          type: SeriesType.ORIGINAL,
          visible: false,
          color: '#f00',
          opacity: 1,
          aux: false,
          alias: null,
        },
        '["run1",1]': {
          id: '["run1",1]',
          displayName: 'run1: 1',
          type: SeriesType.ORIGINAL,
          visible: false,
          color: '#f00',
          opacity: 1,
          aux: false,
          alias: null,
        },
      });
    }));
  });

  describe('data download', () => {
    it('opens a data download dialog when user clicks on download', fakeAsync(() => {
      const fixture = createComponent('card1');
      fixture.detectChanges();

      openOverflowMenu(fixture);
      getMenuButton('Open dialog to download data').click();
      fixture.detectChanges();
      flush();

      const node = overlayContainer
        .getContainerElement()
        .querySelector('testable-data-download-dialog');

      expect(node!.textContent).toBe('card1');
    }));
  });

  describe('fit to domain', () => {
    it('disables the fit to domain when data fits domain already', fakeAsync(() => {
      const runToSeries = {
        run1: [{wallTime: 2, value: 1, step: 1}],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
      store.overrideSelector(selectors.getVisibleCardIdSet, new Set(['card1']));

      const fixture = createComponent('card1');
      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

      lineChart.componentInstance.getIsViewBoxOverridden().next(false);
      fixture.detectChanges();

      const fitToDomain = fixture.debugElement.query(Selector.FIT_TO_DOMAIN);
      expect(fitToDomain.properties['disabled']).toBe(true);

      lineChart.componentInstance.getIsViewBoxOverridden().next(true);
      fixture.detectChanges();

      expect(fitToDomain.properties['disabled']).toBe(false);
    }));

    it('resets domain when user clicks on reset button', fakeAsync(() => {
      const runToSeries = {
        run1: [{wallTime: 100, value: 1, step: 333}],
        run2: [{wallTime: 100, value: 1, step: 333}],
        run3: [{wallTime: 100, value: 1, step: 333}],
      };
      provideMockCardRunToSeriesData(
        selectSpy,
        PluginType.SCALARS,
        'card1',
        null /* metadataOverride */,
        runToSeries
      );
      const fixture = createComponent('card1');

      const lineChart = fixture.debugElement.query(Selector.LINE_CHART);
      lineChart.componentInstance.getIsViewBoxOverridden().next(true);
      fixture.detectChanges();

      const viewBoxResetSpy = spyOn(
        lineChart.componentInstance,
        'viewBoxReset'
      );

      fixture.debugElement.query(Selector.FIT_TO_DOMAIN).nativeElement.click();
      fixture.detectChanges();

      expect(viewBoxResetSpy).toHaveBeenCalledTimes(1);
    }));
  });

  describe('linked time feature integration', () => {
    describe('selectedTime and dataset', () => {
      it('shows warning when selectedTime is outside the extent of dataset', fakeAsync(() => {
        const runToSeries = {
          run1: [buildScalarStepData({step: 10})],
          run2: [buildScalarStepData({step: 20})],
          run3: [buildScalarStepData({step: 30})],
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          null /* metadataOverride */,
          runToSeries
        );
        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: 0},
          end: {step: 5},
        });
        const fixture = createComponent('card1');
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(Selector.HEADER_WARNING)
        ).toBeTruthy();
      }));

      it('does not show warning if there is an overlap', fakeAsync(() => {
        const runToSeries = {
          run1: [buildScalarStepData({step: 10})],
          run2: [buildScalarStepData({step: 20})],
          run3: [buildScalarStepData({step: 30})],
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          null /* metadataOverride */,
          runToSeries
        );
        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: 25},
          end: {step: 50},
        });
        const fixture = createComponent('card1');
        fixture.detectChanges();
        expect(fixture.debugElement.query(Selector.HEADER_WARNING)).toBeNull();

        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: -10},
          end: {step: 15},
        });
        store.refreshState();
        fixture.detectChanges();
        expect(fixture.debugElement.query(Selector.HEADER_WARNING)).toBeNull();

        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: -1000},
          end: {step: 1000},
        });
        store.refreshState();
        fixture.detectChanges();
        expect(fixture.debugElement.query(Selector.HEADER_WARNING)).toBeNull();
      }));

      it('selects selectedTime to min extent when global setting is too small', fakeAsync(() => {
        const runToSeries = {
          run1: [buildScalarStepData({step: 10})],
          run2: [buildScalarStepData({step: 20})],
          run3: [buildScalarStepData({step: 30})],
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          null /* metadataOverride */,
          runToSeries
        );
        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: -100},
          end: {step: 0},
        });
        const fixture = createComponent('card1');
        fixture.detectChanges();

        const fobs = fixture.debugElement.queryAll(
          Selector.LINKED_TIME_AXIS_FOB
        );
        expect(
          fobs.map((debugEl) => debugEl.nativeElement.textContent.trim())
        ).toEqual(['10']);
      }));

      it('selects selectedTime to max extent when global setting is too large', fakeAsync(() => {
        const runToSeries = {
          run1: [buildScalarStepData({step: 10})],
          run2: [buildScalarStepData({step: 20})],
          run3: [buildScalarStepData({step: 30})],
        };
        provideMockCardRunToSeriesData(
          selectSpy,
          PluginType.SCALARS,
          'card1',
          null /* metadataOverride */,
          runToSeries
        );
        store.overrideSelector(getMetricsSelectedTime, {
          start: {step: 50},
          end: {step: 100},
        });
        const fixture = createComponent('card1');
        fixture.detectChanges();

        const fobs = fixture.debugElement.queryAll(
          Selector.LINKED_TIME_AXIS_FOB
        );
        expect(
          fobs.map((debugEl) => debugEl.nativeElement.textContent.trim())
        ).toEqual(['30']);
      }));
    });
  });
});
