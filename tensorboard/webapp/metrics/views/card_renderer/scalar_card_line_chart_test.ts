/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {Observable, of, ReplaySubject} from 'rxjs';
import {State} from '../../../app_state';
import {ExperimentAlias} from '../../../experiments/types';
import {Run} from '../../../runs/store/runs_types';
import {buildRun} from '../../../runs/store/testing';
import * as selectors from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {DataLoadState} from '../../../types/data';
import {CardFobComponent} from '../../../widgets/card_fob/card_fob_component';
import {
  CardFobControllerComponent,
  Fob,
} from '../../../widgets/card_fob/card_fob_controller_component';
import {CardFobModule} from '../../../widgets/card_fob/card_fob_module';
import {
  TimeSelectionAffordance,
  TimeSelectionToggleAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {DataTableComponent} from '../../../widgets/data_table/data_table_component';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {IntersectionObserverTestingModule} from '../../../widgets/intersection_observer/intersection_observer_testing_module';
import {
  Formatter,
  relativeTimeFormatter,
  siNumberFormatter,
} from '../../../widgets/line_chart_v2/lib/formatter';
import {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  Point,
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {ResizeDetectorTestingModule} from '../../../widgets/resize_detector_testing_module';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import {
  cardViewBoxChanged,
  metricsCardFullSizeToggled,
  metricsCardStateUpdated,
  stepSelectorToggled,
  timeSelectionChanged,
  metricsSlideoutMenuOpened,
  dataTableColumnEdited,
  dataTableColumnToggled,
} from '../../actions';
import {PluginType} from '../../data_source';
import {
  getCardStateMap,
  getMetricsCardDataMinMax,
  getMetricsCardMinMax,
  getMetricsCardRangeSelectionEnabled,
  getMetricsCardTimeSelection,
  getMetricsLinkedTimeEnabled,
  getMetricsLinkedTimeSelection,
  getMetricsRangeSelectionEnabled,
  getMetricsScalarSmoothing,
  getMetricsStepSelectorEnabled,
  getRangeSelectionHeaders,
  getSingleSelectionHeaders,
} from '../../store';
import {
  buildScalarStepData,
  provideMockCardRunToSeriesData,
} from '../../testing';
import {CardMetadata, TooltipSort, XAxisType} from '../../types';
// import {ScalarCardComponent} from './scalar_card_component';
// import {ScalarCardContainer} from './scalar_card_container';
import {ScalarCardLineChartComponent} from './scalar_card_line_chart_component';
import {ScalarCardLineChartContainer} from './scalar_card_line_chart_container'
import {ScalarCardDataTable} from './scalar_card_data_table';
import {ScalarCardFobController} from './scalar_card_fob_controller';
import {
  ScalarCardPoint,
  ScalarCardSeriesMetadata,
  ScalarCardSeriesMetadataMap,
  ScalarCardDataSeries,
  SeriesType,
} from './scalar_card_types';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
  SortingOrder,
} from '../../../widgets/data_table/types';
import {VisLinkedTimeSelectionWarningModule} from './vis_linked_time_selection_warning_module';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {provideMockTbStore} from '../../../testing/utils';
import * as commonSelectors from '../main_view/common_selectors';
import {CardFeatureOverride} from '../../store/metrics_types';
import {ContentCellComponent} from '../../../widgets/data_table/content_cell_component';
import {ContentRowComponent} from '../../../widgets/data_table/content_row_component';
import {HeaderCellComponent} from '../../../widgets/data_table/header_cell_component';
// import {buildMetadata, buildSeries} from '../../../widgets/line_chart_v2/lib/testing';

@Component({
  selector: 'line-chart',
  template: `
    {{ tooltipData | json }}
    <ng-container
      *ngIf="tooltipTemplate"
      [ngTemplateOutlet]="tooltipTemplate"
      [ngTemplateOutletContext]="{
        data: tooltipDataForTesting,
        cursorLocationInDataCoord: cursorLocationInDataCoordForTesting,
        cursorLocation: cursorLocationForTesting
      }"
    ></ng-container>
    <ng-container
      *ngIf="customChartOverlayTemplate"
      [ngTemplateOutlet]="customChartOverlayTemplate"
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
  @Input() userViewBox?: Extent;

  @Input()
  customChartOverlayTemplate!: TemplateRef<{}>;

  axisTemplateContext = {
    viewExtent: {x: [0, 100], y: [0, 1000]},
    domDimension: {width: 200, height: 200},
    xScale: {
      forward: (
        domain: [number, number],
        range: [number, number],
        step: number
      ) => step,
      reverse: (
        domain: [number, number],
        range: [number, number],
        axisPosition: number
      ) => axisPosition,
    },
    formatter: {
      formatTick: (num: number) => String(num),
    },
  };

  @Output()
  onViewBoxOverridden = new EventEmitter<boolean>();

  // These inputs do not exist on the real line-chart and is devised to make tooltipTemplate
  // testable without using the real implementation.
  @Input() tooltipDataForTesting: TooltipDatum[] = [];
  @Input() cursorLocationInDataCoordForTesting: {x: number; y: number} = {
    x: 0,
    y: 0,
  };
  @Input() cursorLocationForTesting: {x: number; y: number} = {x: 0, y: 0};

  private isViewBoxOverridden = new ReplaySubject<boolean>(1);

  getIsViewBoxOverridden(): Observable<boolean> {
    return this.isViewBoxOverridden;
  }

  viewBoxReset() {}

  constructor(public readonly changeDetectorRef: ChangeDetectorRef) {}
}

const anyString = jasmine.any(String);

function buildAlias(override: Partial<ExperimentAlias> = {}): ExperimentAlias {
  return {
    aliasNumber: 1,
    aliasText: 'hello',
    ...override,
  };
}

function buildScalarCardPoint(override: Partial<ScalarCardPoint>): ScalarCardPoint {
  return {
    wallTime: 2000,
    value: 1,
    step: 1,
    relativeTimeInMs: 0,
    x: 0,
    y: 0,
    ...override,
  };
}

function buildCardMetadata(metadata: Partial<ScalarCardSeriesMetadata>): ScalarCardSeriesMetadata {
  return {
    type: SeriesType.ORIGINAL,
    id: 'a',
    displayName: 'A name',
    visible: true,
    color: '#f00',
    alias: null,
    opacity: 0,
    ...metadata,
  };
}

fdescribe('scalar card line chart', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;
  let overlayContainer: OverlayContainer;
  let dispatchedActions: Action[];

  const Selector = {
    FIT_TO_DOMAIN: By.css('[aria-label="Fit line chart domains to data"]'),
    LINE_CHART: By.directive(TestableLineChart),
    TOOLTIP_HEADER_COLUMN: By.css('table.tooltip th'),
    TOOLTIP_ROW: By.css('table.tooltip .tooltip-row'),
    HEADER_WARNING_CLIPPED: By.css(
      'vis-linked-time-selection-warning mat-icon[data-value="clipped"]'
    ),
    LINKED_TIME_AXIS_FOB: By.css('.selected-time-fob'),
  };

  function getMenuButton(buttonAriaLabel: string) {
    const buttons = overlayContainer
      .getContainerElement()
      .querySelectorAll(`[aria-label="${buttonAriaLabel}"]`);
    expect(buttons.length).toBe(1);
    return buttons[0] as HTMLButtonElement;
  }

  function addStepUsingProspectiveFob(
    fixture: ComponentFixture<ScalarCardLineChartContainer>,
    step: number
  ) {
    const testController = fixture.debugElement.query(
      By.directive(CardFobControllerComponent)
    ).componentInstance;

    testController.onProspectiveStepChanged.emit(step);
    fixture.detectChanges();
    testController.prospectiveFobClicked(new MouseEvent('mouseclick'));
    fixture.detectChanges();
  }

  function createComponent(
    cardId: string,
    seriesMetadataMap: ScalarCardSeriesMetadataMap,
    seriesData: ScalarCardDataSeries[],
    initiallyHidden?: boolean
  ): ComponentFixture<ScalarCardLineChartContainer> {
    const fixture = TestBed.createComponent(ScalarCardLineChartContainer);
    fixture.componentInstance.cardId = cardId;
    fixture.componentInstance.seriesMetadataMap = seriesMetadataMap;
    fixture.componentInstance.seriesData = seriesData;

    // if (!initiallyHidden) {
    //   intersectionObserver.simulateVisibilityChange(fixture, true);
    // }
    // Let the observables to be subscribed.
    fixture.detectChanges();
    // Flush the debounce on the `seriesData$`.
    tick(0);
    // Redraw based on the flushed `seriesData$`.
    fixture.detectChanges();

    const scalarCardLineChartComponent = fixture.debugElement.query(
      By.directive(ScalarCardLineChartComponent)
    );
    const lineChartComponent = fixture.debugElement.query(Selector.LINE_CHART);
    console.log('LIENCAHRT', lineChartComponent);
    if (!initiallyHidden) {
      // HACK: we are using viewChild in ScalarCardComponent and there is
      // no good way to provide a stub implementation. Manually set what
      // would be populated by ViewChild decorator.
      scalarCardLineChartComponent.componentInstance.lineChart =
        lineChartComponent.componentInstance;
      // lineChart property is now set; let the template re-render with
      // `lineChart` checks correctly return the right value.
      lineChartComponent.componentInstance.changeDetectorRef.markForCheck();

      // This hack effectively resizes the line chart.
      // Resizing the line chart will result in a cardMinMax changed event being dispatched.
      dispatchedActions.pop();
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
        CardFobModule,
        DataTableModule,
        MatDialogModule,
        MatIconTestingModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        NoopAnimationsModule,
        ResizeDetectorTestingModule,
        TruncatedPathModule,
        VisLinkedTimeSelectionWarningModule,
      ],
      declarations: [
        // ScalarCardContainer,
        // ScalarCardComponent,
        // ScalarCardDataTable,
        ScalarCardLineChartContainer,
        ScalarCardLineChartComponent,
        ScalarCardFobController,
        TestableLineChart,
      ],
      providers: [provideMockTbStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // intersectionObserver = TestBed.inject(IntersectionObserverTestingModule);
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
    store.overrideSelector(
      selectors.getIsScalarColumnCustomizationEnabled,
      false
    );
    store.overrideSelector(selectors.getMetricsStepSelectorEnabled, false);
    store.overrideSelector(
      selectors.getMetricsCardRangeSelectionEnabled,
      false
    );
    store.overrideSelector(selectors.getMetricsCardUserViewBox, null);

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('basic renders', () => {
    // fit('renders empty chart when there is no data', fakeAsync(() => {
    //   const cardMetadataMap = {'card1': buildCardMetadata({tag: 'tagA', runId: null})}
    //   const dataSeries = buildCardDataSeries({ null });

    //   const fixture = createComponent('card1', cardMetadataMap, null);

    //   const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
    //   expect(lineChartEl).toBeTruthy();
    //   expect(lineChartEl.componentInstance.seriesData.length).toBe(0);
    // }));

    fit('renders data', fakeAsync(() => {
      store.overrideSelector(getMetricsScalarSmoothing, 0);
      const cardMetadataMap = {
        card1: buildCardMetadata({ displayName: 'Run1 name', visible: true})
        };

      const dataSeries = [{ 
        id: 'run1',
        points: [
          buildScalarCardPoint({ wallTime: 100, y: 1, x: 333 }),
          buildScalarCardPoint({ wallTime: 101, y: 2, x: 555 }),
        ]
      }];
      
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
      store.overrideSelector(
        commonSelectors.getFilteredRenderableRunsIdsFromRoute,
        new Set(['run1'])
      );
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      selectSpy
        .withArgs(selectors.getRun, {runId: 'run1'})
        .and.returnValue(of(buildRun({name: 'Run1 name'})));

      const fixture = createComponent('card1', cardMetadataMap, dataSeries);

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
      console.log(lineChartEl.componentInstance.seriesMetadataMap);
      const {visible, displayName} =
        lineChartEl.componentInstance.seriesMetadataMap[id];
      expect(displayName).toBe('Run1 name');
      expect(visible).toBe(true);
    }));

  //   describe('custom x axis formatter', () => {
  //     it('uses SI unit formatter when xAxisType is STEP', fakeAsync(() => {
  //       store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);

  //       const cardMetadata = {
  //         plugin: PluginType.SCALARS,
  //         tag: 'tagA',
  //         run: null,
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         cardMetadata,
  //         null /* runToSeries */
  //       );

  //       const fixture = createComponent('card1');

  //       expect(
  //         fixture.debugElement.query(Selector.LINE_CHART).componentInstance
  //           .customXFormatter
  //       ).toBe(siNumberFormatter);
  //     }));

  //     it('uses relative time formatter when xAxisType is RELATIVE', fakeAsync(() => {
  //       store.overrideSelector(
  //         selectors.getMetricsXAxisType,
  //         XAxisType.RELATIVE
  //       );

  //       const cardMetadata = {
  //         plugin: PluginType.SCALARS,
  //         tag: 'tagA',
  //         run: null,
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         cardMetadata,
  //         null /* runToSeries */
  //       );

  //       const fixture = createComponent('card1');

  //       expect(
  //         fixture.debugElement.query(Selector.LINE_CHART).componentInstance
  //           .customXFormatter
  //       ).toBe(relativeTimeFormatter);
  //     }));

  //     it('does not specify a custom X formatter for xAxisType WALL_TIME', fakeAsync(() => {
  //       store.overrideSelector(
  //         selectors.getMetricsXAxisType,
  //         XAxisType.WALL_TIME
  //       );

  //       const cardMetadata = {
  //         plugin: PluginType.SCALARS,
  //         tag: 'tagA',
  //         run: null,
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         cardMetadata,
  //         null /* runToSeries */
  //       );

  //       const fixture = createComponent('card1');

  //       expect(
  //         fixture.debugElement.query(Selector.LINE_CHART).componentInstance
  //           .customXFormatter
  //       ).toBe(undefined);
  //     }));
  //   });
  //   it('sets useDarkMode when using dark mode', fakeAsync(() => {
  //     store.overrideSelector(selectors.getDarkModeEnabled, false);
  //     const fixture = createComponent('card1');
  //     fixture.detectChanges();

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     expect(lineChartEl.componentInstance.useDarkMode).toBe(false);

  //     store.overrideSelector(selectors.getDarkModeEnabled, true);
  //     store.refreshState();
  //     fixture.detectChanges();

  //     expect(lineChartEl.componentInstance.useDarkMode).toBe(true);
  //   }));

  //   it('sets preferredRendererType to SVG when getForceSvgFeatureFlag returns true', fakeAsync(() => {
  //     store.overrideSelector(selectors.getForceSvgFeatureFlag, false);
  //     const fixture = createComponent('card1');
  //     fixture.detectChanges();

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     expect(lineChartEl.componentInstance.preferredRendererType).toBe(
  //       RendererType.WEBGL
  //     );

  //     store.overrideSelector(selectors.getForceSvgFeatureFlag, true);
  //     store.refreshState();
  //     fixture.detectChanges();

  //     expect(lineChartEl.componentInstance.preferredRendererType).toBe(
  //       RendererType.SVG
  //     );
  //   }));
  // });
  // describe('displayName', () => {
  //   beforeEach(() => {
  //     const cardMetadata = {
  //       plugin: PluginType.SCALARS,
  //       tag: 'tagA',
  //       run: null,
  //     };
  //     const runToSeries = {run1: [{wallTime: 101, value: 2, step: 555}]};
  //     store.overrideSelector(getMetricsScalarSmoothing, 0);
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       cardMetadata,
  //       runToSeries
  //     );
  //   });

  //   it('sets displayName always as run name', fakeAsync(() => {
  //     selectSpy
  //       .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
  //       .and.returnValue(of('eid1'));
  //     selectSpy
  //       .withArgs(selectors.getRun, {runId: 'run1'})
  //       .and.returnValue(of(buildRun({name: 'Run1 name'})));
  //     store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
  //       eid1: {aliasText: 'existing_exp', aliasNumber: 1},
  //       eid2: {aliasText: 'ERROR!', aliasNumber: 2},
  //     });

  //     const fixture = createComponent('card1');

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     const {displayName, alias} =
  //       lineChartEl.componentInstance.seriesMetadataMap['run1'];
  //     expect(displayName).toBe('Run1 name');
  //     expect(alias).toEqual({
  //       aliasNumber: 1,
  //       aliasText: 'existing_exp',
  //     });
  //   }));

  //   it('sets run id if a run and experiment are not found', fakeAsync(() => {
  //     selectSpy
  //       .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
  //       .and.returnValue(of(null));
  //     selectSpy
  //       .withArgs(selectors.getRun, {runId: 'run1'})
  //       .and.returnValue(of(null));
  //     store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {});

  //     const fixture = createComponent('card1');

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     const {alias, displayName} =
  //       lineChartEl.componentInstance.seriesMetadataMap['run1'];
  //     expect(displayName).toBe('run1');
  //     expect(alias).toBeNull();
  //   }));

  //   it('shows experiment id and "..." if only run is not found (maybe loading)', fakeAsync(() => {
  //     selectSpy
  //       .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
  //       .and.returnValue(of('eid1'));
  //     selectSpy
  //       .withArgs(selectors.getRun, {runId: 'run1'})
  //       .and.returnValue(of(null));
  //     store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
  //       eid1: {aliasText: 'existing_exp', aliasNumber: 1},
  //     });

  //     const fixture = createComponent('card1');

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     expect(lineChartEl.componentInstance.seriesData.length).toBe(1);

  //     const {displayName} =
  //       lineChartEl.componentInstance.seriesMetadataMap['run1'];
  //     expect(displayName).toBe('...');
  //   }));

  //   it('updates displayName with run when run populates', fakeAsync(() => {
  //     const getRun = new ReplaySubject<Run | null>(1);
  //     getRun.next(null);
  //     selectSpy
  //       .withArgs(selectors.getExperimentIdForRunId, {runId: 'run1'})
  //       .and.returnValue(of('eid1'));
  //     selectSpy
  //       .withArgs(selectors.getRun, {runId: 'run1'})
  //       .and.returnValue(getRun);
  //     store.overrideSelector(selectors.getExperimentIdToExperimentAliasMap, {
  //       eid1: {aliasText: 'existing_exp', aliasNumber: 1},
  //     });

  //     const fixture = createComponent('card1');

  //     getRun.next(buildRun({name: 'Foobar'}));
  //     triggerStoreUpdate();
  //     fixture.detectChanges();

  //     const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //     const {alias, displayName} =
  //       lineChartEl.componentInstance.seriesMetadataMap['run1'];
  //     expect(displayName).toBe('Foobar');
  //     expect(alias).toEqual({
  //       aliasNumber: 1,
  //       aliasText: 'existing_exp',
  //     });
  //   }));
  // });

  // describe('xAxisType setting', () => {
  //   beforeEach(() => {
  //     const runToSeries = {
  //       run1: [
  //         {wallTime: 100, value: 1, step: 333},
  //         {wallTime: 101, value: 2, step: 555},
  //       ],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );
  //     store.overrideSelector(
  //       selectors.getCurrentRouteRunSelection,
  //       new Map([['run1', true]])
  //     );
  //     store.overrideSelector(
  //       commonSelectors.getFilteredRenderableRunsIdsFromRoute,
  //       new Set(['run1'])
  //     );
  //   });

  //   const expectedPoints = {
  //     step: [
  //       {x: 333, y: 1},
  //       {x: 555, y: 2},
  //     ],
  //     wallTime: [
  //       {x: 100000, y: 1},
  //       {x: 101000, y: 2},
  //     ],
  //     relative: [
  //       {x: 0, y: 1},
  //       {x: 1000, y: 2},
  //     ],
  //   };

  //   const specs = [
  //     {
  //       name: 'step',
  //       xType: XAxisType.STEP,
  //       expectedPoints: expectedPoints.step,
  //     },
  //     {
  //       name: 'wall_time',
  //       xType: XAxisType.WALL_TIME,
  //       expectedPoints: expectedPoints.wallTime,
  //     },
  //     {
  //       name: 'relative',
  //       xType: XAxisType.RELATIVE,
  //       expectedPoints: expectedPoints.relative,
  //     },
  //   ];
  //   for (const spec of specs) {
  //     it(`formats series data when xAxisType is: ${spec.name}`, fakeAsync(() => {
  //       store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //       store.overrideSelector(selectors.getMetricsXAxisType, spec.xType);
  //       selectSpy
  //         .withArgs(selectors.getRun, {runId: 'run1'})
  //         .and.returnValue(of(buildRun({name: 'Run1 name'})));
  //       const fixture = createComponent('card1');

  //       const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //       expect(lineChartEl.componentInstance.seriesData.length).toBe(1);
  //       const {id, points} = lineChartEl.componentInstance.seriesData[0];
  //       const {visible, displayName} =
  //         lineChartEl.componentInstance.seriesMetadataMap['run1'];
  //       expect(id).toBe('run1');
  //       expect(displayName).toBe('Run1 name');
  //       expect(visible).toBe(true);
  //       expect(
  //         points.map((p: {x: number; y: number}) => ({x: p.x, y: p.y}))
  //       ).toEqual(spec.expectedPoints);
  //     }));
  //   }
  // });

  // describe('perf', () => {
  //   it('does not update `seriesData` for irrelevant runSelection changes', fakeAsync(() => {
  //     const runToSeries = {run1: []};
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );
  //     store.overrideSelector(
  //       selectors.getCurrentRouteRunSelection,
  //       new Map([['run1', true]])
  //     );

  //     const fixture = createComponent('card1');
  //     const lineChartComponent = fixture.debugElement.query(
  //       Selector.LINE_CHART
  //     );
  //     const before = lineChartComponent.componentInstance.seriesData;

  //     store.overrideSelector(
  //       selectors.getCurrentRouteRunSelection,
  //       new Map([
  //         ['run1', true],
  //         ['shouldBeNoop', true],
  //       ])
  //     );
  //     triggerStoreUpdate();
  //     fixture.detectChanges();

  //     const after = lineChartComponent.componentInstance.seriesData;
  //     expect(before).toBe(after);
  //   }));

  //   it(
  //     'does not update `seriesData` for relevant runSelection changes but only ' +
  //       'changes the metadataMap',
  //     fakeAsync(() => {
  //       const runToSeries = {run1: []};
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         null /* metadataOverride */,
  //         runToSeries
  //       );
  //       store.overrideSelector(
  //         selectors.getCurrentRouteRunSelection,
  //         new Map([['run1', true]])
  //       );

  //       const fixture = createComponent('card1');
  //       const lineChartComponent = fixture.debugElement.query(
  //         Selector.LINE_CHART
  //       );
  //       const beforeSeries = lineChartComponent.componentInstance.seriesData;
  //       const beforeMap =
  //         lineChartComponent.componentInstance.seriesMetadataMap;

  //       store.overrideSelector(
  //         selectors.getCurrentRouteRunSelection,
  //         new Map([['run1', false]])
  //       );
  //       triggerStoreUpdate();
  //       fixture.detectChanges();

  //       const afterSeries = lineChartComponent.componentInstance.seriesData;
  //       const afterMap = lineChartComponent.componentInstance.seriesMetadataMap;

  //       expect(beforeSeries).toBe(afterSeries);
  //       expect(beforeMap).not.toBe(afterMap);
  //     })
  //   );

  //   it('updates `seriesData` for xAxisType changes', fakeAsync(() => {
  //     const runToSeries = {
  //       run1: [
  //         {wallTime: 100, value: 1, step: 333},
  //         {wallTime: 101, value: 2, step: 555},
  //       ],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );
  //     store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
  //     store.overrideSelector(
  //       selectors.getCurrentRouteRunSelection,
  //       new Map([['run1', true]])
  //     );

  //     const fixture = createComponent('card1');
  //     const lineChartComponent = fixture.debugElement.query(
  //       Selector.LINE_CHART
  //     );
  //     const before = lineChartComponent.componentInstance.seriesData;

  //     store.overrideSelector(
  //       selectors.getMetricsXAxisType,
  //       XAxisType.WALL_TIME
  //     );
  //     triggerStoreUpdate();
  //     fixture.detectChanges();

  //     const after = lineChartComponent.componentInstance.seriesData;
  //     expect(before).not.toBe(after);
  //   }));
  // });

  // it('passes data series and metadata with smoothed values', fakeAsync(() => {
  //   store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
  //   store.overrideSelector(selectors.getRunColorMap, {
  //     run1: '#f00',
  //     run2: '#0f0',
  //   });
  //   store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.1);

  //   const runToSeries = {
  //     run1: [
  //       {wallTime: 2, value: 1, step: 1},
  //       {wallTime: 4, value: 10, step: 2},
  //     ],
  //     run2: [{wallTime: 2, value: 1, step: 1}],
  //   };
  //   provideMockCardRunToSeriesData(
  //     selectSpy,
  //     PluginType.SCALARS,
  //     'card1',
  //     null /* metadataOverride */,
  //     runToSeries
  //   );

  //   const fixture = createComponent('card1');
  //   const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //   expect(lineChart.componentInstance.seriesData).toEqual([
  //     {
  //       id: 'run1',
  //       points: [
  //         // Keeps the data structure as is but do notice adjusted wallTime and
  //         // line_chart_v2 required "x" and "y" props.
  //         {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
  //         {
  //           wallTime: 4000,
  //           relativeTimeInMs: 2000,
  //           value: 10,
  //           step: 2,
  //           x: 2,
  //           y: 10,
  //         },
  //       ],
  //     },
  //     {
  //       id: 'run2',
  //       points: [
  //         {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
  //       ],
  //     },
  //     {
  //       id: '["smoothed","run1"]',
  //       points: [
  //         {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
  //         // Exact smoothed value is not too important.
  //         {
  //           wallTime: 4000,
  //           relativeTimeInMs: 2000,
  //           value: 10,
  //           step: 2,
  //           x: 2,
  //           y: jasmine.any(Number),
  //         },
  //       ],
  //     },
  //     {
  //       id: '["smoothed","run2"]',
  //       points: [
  //         {wallTime: 2000, relativeTimeInMs: 0, value: 1, step: 1, x: 1, y: 1},
  //       ],
  //     },
  //   ]);
  //   expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
  //     run1: {
  //       id: 'run1',
  //       displayName: 'run1',
  //       type: SeriesType.ORIGINAL,
  //       visible: false,
  //       color: '#f00',
  //       opacity: 0.25,
  //       aux: true,
  //       alias: null,
  //     },
  //     run2: {
  //       id: 'run2',
  //       displayName: 'run2',
  //       type: SeriesType.ORIGINAL,
  //       visible: false,
  //       color: '#0f0',
  //       opacity: 0.25,
  //       aux: true,
  //       alias: null,
  //     },
  //     '["smoothed","run1"]': {
  //       id: '["smoothed","run1"]',
  //       displayName: 'run1',
  //       type: SeriesType.DERIVED,
  //       originalSeriesId: 'run1',
  //       visible: false,
  //       color: '#f00',
  //       opacity: 1,
  //       aux: false,
  //       alias: null,
  //     },
  //     '["smoothed","run2"]': {
  //       id: '["smoothed","run2"]',
  //       displayName: 'run2',
  //       type: SeriesType.DERIVED,
  //       originalSeriesId: 'run2',
  //       visible: false,
  //       color: '#0f0',
  //       opacity: 1,
  //       aux: false,
  //       alias: null,
  //     },
  //   });
  // }));

  // it('does not set smoothed series when it is disabled,', fakeAsync(() => {
  //   store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
  //   store.overrideSelector(selectors.getRunColorMap, {
  //     run1: '#f00',
  //     run2: '#0f0',
  //   });
  //   store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //   const runToSeries = {
  //     run1: [
  //       {wallTime: 2, value: 1, step: 1},
  //       {wallTime: 4, value: 10, step: 2},
  //     ],
  //     run2: [{wallTime: 2, value: 1, step: 1}],
  //   };
  //   provideMockCardRunToSeriesData(
  //     selectSpy,
  //     PluginType.SCALARS,
  //     'card1',
  //     null /* metadataOverride */,
  //     runToSeries
  //   );

  //   const fixture = createComponent('card1');
  //   const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //   expect(lineChart.componentInstance.seriesData).toEqual([
  //     {
  //       id: 'run1',
  //       points: [
  //         // Keeps the data structure as is but requires "x" and "y" props.
  //         {wallTime: 2000, value: 1, step: 1, x: 1, y: 1, relativeTimeInMs: 0},
  //         {
  //           wallTime: 4000,
  //           value: 10,
  //           step: 2,
  //           x: 2,
  //           y: 10,
  //           relativeTimeInMs: 2000,
  //         },
  //       ],
  //     },
  //     {
  //       id: 'run2',
  //       points: [
  //         {wallTime: 2000, value: 1, step: 1, x: 1, y: 1, relativeTimeInMs: 0},
  //       ],
  //     },
  //   ]);
  //   expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
  //     run1: {
  //       id: 'run1',
  //       displayName: 'run1',
  //       type: SeriesType.ORIGINAL,
  //       visible: false,
  //       color: '#f00',
  //       opacity: 1,
  //       aux: false,
  //       alias: null,
  //     },
  //     run2: {
  //       id: 'run2',
  //       displayName: 'run2',
  //       type: SeriesType.ORIGINAL,
  //       visible: false,
  //       color: '#0f0',
  //       opacity: 1,
  //       aux: false,
  //       alias: null,
  //     },
  //   });
  // }));

  // describe('tooltip', () => {
  //   function buildTooltipDatum(
  //     metadata?: ScalarCardSeriesMetadata,
  //     dataPoint: Partial<ScalarCardPoint> = {},
  //     domPoint: Point = {x: 0, y: 0}
  //   ): TooltipDatum<ScalarCardSeriesMetadata, ScalarCardPoint> {
  //     return {
  //       id: metadata?.id ?? 'a',
  //       metadata: {
  //         type: SeriesType.ORIGINAL,
  //         id: 'a',
  //         displayName: 'A name',
  //         visible: true,
  //         color: '#f00',
  //         alias: null,
  //         ...metadata,
  //       },
  //       closestPointIndex: 0,
  //       dataPoint: {
  //         x: 0,
  //         y: 0,
  //         value: 0,
  //         step: 0,
  //         wallTime: 0,
  //         relativeTimeInMs: 0,
  //         ...dataPoint,
  //       },
  //       domPoint,
  //     };
  //   }

  //   function setTooltipData(
  //     fixture: ComponentFixture<ScalarCardLineChartContainer>,
  //     tooltipData: TooltipDatum[]
  //   ) {
  //     const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //     lineChart.componentInstance.tooltipDataForTesting = tooltipData;
  //     lineChart.componentInstance.changeDetectorRef.markForCheck();
  //   }

  //   function setCursorLocation(
  //     fixture: ComponentFixture<ScalarCardLineChartContainer>,
  //     dataPoint?: {x: number; y: number},
  //     domPoint?: Point
  //   ) {
  //     const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //     if (dataPoint) {
  //       lineChart.componentInstance.dataPointForTesting = dataPoint;
  //     }
  //     if (domPoint) {
  //       lineChart.componentInstance.cursorLocationForTesting = domPoint;
  //     }
  //     lineChart.componentInstance.changeDetectorRef.markForCheck();
  //   }

  //   function assertTooltipRows(
  //     fixture: ComponentFixture<ScalarCardLineChartContainer>,
  //     expectedTableContent: Array<
  //       Array<string | ReturnType<typeof jasmine.any>>
  //     >
  //   ) {
  //     const rows = fixture.debugElement.queryAll(Selector.TOOLTIP_ROW);
  //     const tableContent = rows.map((row) => {
  //       return row
  //         .queryAll(By.css('td'))
  //         .map((td) => td.nativeElement.textContent.trim());
  //     });

  //     expect(tableContent).toEqual(expectedTableContent);
  //   }

  //   it('renders the tooltip using the custom template (no smooth)', fakeAsync(() => {
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'row1',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //         },
  //         {
  //           x: 10,
  //           step: 10,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //           relativeTimeInMs: 1000 * 60 * 60 * 24 * 365 * 3,
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row2',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -1000,
  //           value: -1000,
  //           wallTime: new Date('2020-12-31').getTime(),
  //           relativeTimeInMs: 0,
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();

  //     const headerCols = fixture.debugElement.queryAll(
  //       Selector.TOOLTIP_HEADER_COLUMN
  //     );
  //     const headerText = headerCols.map((col) => col.nativeElement.textContent);
  //     expect(headerText).toEqual([
  //       '',
  //       'Run',
  //       'Value',
  //       'Step',
  //       'Time',
  //       'Relative',
  //     ]);

  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', '1000', '10', '1/1/20, 12:00 AM', '3 yr'],
  //       ['', 'Row 2', '-1000', '1,000', '12/31/20, 12:00 AM', '0'],
  //     ]);
  //   }));

  //   it('renders the tooltip using the custom template (smooth)', fakeAsync(() => {
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0.5);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'smoothed_row1',
  //           type: SeriesType.DERIVED,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //           originalSeriesId: 'row1',
  //         },
  //         {
  //           x: 10,
  //           step: 10,
  //           y: 10002000,
  //           value: 10001337,
  //           wallTime: new Date('2020-01-01').getTime(),
  //           relativeTimeInMs: 10,
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'smoothed_row2',
  //           type: SeriesType.DERIVED,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //           originalSeriesId: 'row2',
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -0.0005,
  //           value: -0.9312345,
  //           wallTime: new Date('2020-12-31').getTime(),
  //           relativeTimeInMs: 5000,
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();

  //     const headerCols = fixture.debugElement.queryAll(
  //       Selector.TOOLTIP_HEADER_COLUMN
  //     );
  //     const headerText = headerCols.map((col) => col.nativeElement.textContent);
  //     expect(headerText).toEqual([
  //       '',
  //       'Run',
  //       'Smoothed',
  //       'Value',
  //       'Step',
  //       'Time',
  //       'Relative',
  //     ]);

  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', '1e+7', '1e+7', '10', '1/1/20, 12:00 AM', '10 ms'],
  //       // Print the step with comma for readability. The value is yet optimize for
  //       // readability (we may use the scientific formatting).
  //       [
  //         '',
  //         'Row 2',
  //         '-5e-4',
  //         '-0.9312',
  //         '1,000',
  //         '12/31/20, 12:00 AM',
  //         '5 sec',
  //       ],
  //     ]);
  //   }));

  //   it('shows relative time when XAxisType is RELATIVE', fakeAsync(() => {
  //     store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.RELATIVE);
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'smoothed_row1',
  //           type: SeriesType.DERIVED,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //           originalSeriesId: 'row1',
  //         },
  //         {
  //           x: 10,
  //           step: 10,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //           relativeTimeInMs: 10,
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'smoothed_row2',
  //           type: SeriesType.DERIVED,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //           originalSeriesId: 'row2',
  //         },
  //         {
  //           x: 432000000,
  //           step: 1000,
  //           y: -1000,
  //           value: -1000,
  //           wallTime: new Date('2020-01-05').getTime(),
  //           relativeTimeInMs: 432000000,
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();

  //     const headerCols = fixture.debugElement.queryAll(
  //       Selector.TOOLTIP_HEADER_COLUMN
  //     );
  //     const headerText = headerCols.map((col) => col.nativeElement.textContent);
  //     expect(headerText).toEqual([
  //       '',
  //       'Run',
  //       'Value',
  //       'Step',
  //       'Time',
  //       'Relative',
  //     ]);

  //     const rows = fixture.debugElement.queryAll(Selector.TOOLTIP_ROW);
  //     const tableContent = rows.map((row) => {
  //       return row
  //         .queryAll(By.css('td'))
  //         .map((td) => td.nativeElement.textContent.trim());
  //     });

  //     expect(tableContent).toEqual([
  //       ['', 'Row 1', '1000', '10', '1/1/20, 12:00 AM', '10 ms'],
  //       ['', 'Row 2', '-1000', '1,000', '1/5/20, 12:00 AM', '5 day'],
  //     ]);
  //   }));

  //   it('renders alias when alias is non-null', fakeAsync(() => {
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum({
  //         id: 'row1',
  //         type: SeriesType.ORIGINAL,
  //         displayName: 'Row 1',
  //         alias: null,
  //         visible: true,
  //         color: '#00f',
  //       }),
  //       buildTooltipDatum({
  //         id: 'row2',
  //         type: SeriesType.ORIGINAL,
  //         displayName: 'Row 2',
  //         alias: buildAlias({
  //           aliasNumber: 50,
  //           aliasText: 'myAlias',
  //         }),
  //         visible: true,
  //         color: '#0f0',
  //       }),
  //     ]);
  //     fixture.detectChanges();

  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', anyString, anyString, anyString, anyString],
  //       ['', '50myAlias/Row 2', anyString, anyString, anyString, anyString],
  //     ]);
  //   }));

  //   it('sorts by ascending', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsTooltipSort,
  //       TooltipSort.ASCENDING
  //     );
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'row1',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#f00',
  //           aux: false,
  //         },
  //         {
  //           x: 10,
  //           step: 10,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row2',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -500,
  //           value: -500,
  //           wallTime: new Date('2020-12-31').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row3',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 3',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //         },
  //         {
  //           x: 10000,
  //           step: 10000,
  //           y: 3,
  //           value: 3,
  //           wallTime: new Date('2021-01-01').getTime(),
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();

  //     assertTooltipRows(fixture, [
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //       ['', 'Row 1', '1000', '10', anyString, anyString],
  //     ]);
  //   }));

  //   it('sorts by descending', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsTooltipSort,
  //       TooltipSort.DESCENDING
  //     );
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'row1',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#f00',
  //           aux: false,
  //         },
  //         {
  //           x: 10,
  //           step: 10,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row2',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -500,
  //           value: -500,
  //           wallTime: new Date('2020-12-31').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row3',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 3',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //         },
  //         {
  //           x: 10000,
  //           step: 10000,
  //           y: 3,
  //           value: 3,
  //           wallTime: new Date('2021-01-01').getTime(),
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();

  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', '1000', '10', anyString, anyString],
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //     ]);
  //   }));

  //   it('sorts by nearest to the cursor', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsTooltipSort,
  //       TooltipSort.NEAREST
  //     );
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'row1',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 1',
  //           alias: null,
  //           visible: true,
  //           color: '#f00',
  //           aux: false,
  //         },
  //         {
  //           x: 0,
  //           step: 0,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //         },
  //         {
  //           x: 0,
  //           y: 100,
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row2',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 2',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -500,
  //           value: -500,
  //           wallTime: new Date('2020-12-31').getTime(),
  //         },
  //         {
  //           x: 50,
  //           y: 0,
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row3',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'Row 3',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //         },
  //         {
  //           x: 10000,
  //           step: 10000,
  //           y: 3,
  //           value: 3,
  //           wallTime: new Date('2021-01-01').getTime(),
  //         },
  //         {
  //           x: 1000,
  //           y: 30,
  //         }
  //       ),
  //     ]);
  //     setCursorLocation(fixture, {x: 500, y: -100}, {x: 50, y: 0});
  //     fixture.detectChanges();
  //     assertTooltipRows(fixture, [
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //       ['', 'Row 1', '1000', '0', anyString, anyString],
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //     ]);

  //     setCursorLocation(fixture, {x: 500, y: 600}, {x: 50, y: 80});
  //     fixture.detectChanges();
  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', '1000', '0', anyString, anyString],
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //     ]);

  //     setCursorLocation(fixture, {x: 10000, y: -100}, {x: 1000, y: 20});
  //     fixture.detectChanges();
  //     assertTooltipRows(fixture, [
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //       ['', 'Row 1', '1000', '0', anyString, anyString],
  //     ]);

  //     // Right between row 1 and row 2. When tied, original order is used.
  //     setCursorLocation(fixture, {x: 500, y: 250}, {x: 25, y: 50});
  //     fixture.detectChanges();
  //     assertTooltipRows(fixture, [
  //       ['', 'Row 1', '1000', '0', anyString, anyString],
  //       ['', 'Row 2', '-500', '1,000', anyString, anyString],
  //       ['', 'Row 3', '3', '10,000', anyString, anyString],
  //     ]);
  //   }));

  //   it('sorts by displayname alphabetical order', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsTooltipSort,
  //       TooltipSort.ALPHABETICAL
  //     );
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
  //     const fixture = createComponent('card1');
  //     setTooltipData(fixture, [
  //       buildTooltipDatum(
  //         {
  //           id: 'row1',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'hello',
  //           alias: null,
  //           visible: true,
  //           color: '#f00',
  //           aux: false,
  //         },
  //         {
  //           x: 0,
  //           step: 0,
  //           y: 1000,
  //           value: 1000,
  //           wallTime: new Date('2020-01-01').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row2',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'world',
  //           alias: null,
  //           visible: true,
  //           color: '#0f0',
  //           aux: false,
  //         },
  //         {
  //           x: 1000,
  //           step: 1000,
  //           y: -500,
  //           value: -500,
  //           wallTime: new Date('2020-12-31').getTime(),
  //         }
  //       ),
  //       buildTooltipDatum(
  //         {
  //           id: 'row3',
  //           type: SeriesType.ORIGINAL,
  //           displayName: 'cat',
  //           alias: null,
  //           visible: true,
  //           color: '#00f',
  //           aux: false,
  //         },
  //         {
  //           x: 10000,
  //           step: 10000,
  //           y: 3,
  //           value: 3,
  //           wallTime: new Date('2021-01-01').getTime(),
  //         }
  //       ),
  //     ]);
  //     fixture.detectChanges();
  //     assertTooltipRows(fixture, [
  //       ['', 'cat', '3', '10,000', anyString, anyString],
  //       ['', 'hello', '1000', '0', anyString, anyString],
  //       ['', 'world', '-500', '1,000', anyString, anyString],
  //     ]);
  //   }));
  // });

  // describe('non-monotonic increase in x-axis', () => {
  //   it('partitions to pseudo runs when steps increase non-monotonically', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsScalarPartitionNonMonotonicX,
  //       true
  //     );
  //     store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
  //     store.overrideSelector(selectors.getRunColorMap, {
  //       run1: '#f00',
  //       run2: '#0f0',
  //     });
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);

  //     const runToSeries = {
  //       run1: [
  //         {wallTime: 2, value: 1, step: 1},
  //         {wallTime: 4, value: 10, step: 2},
  //         {wallTime: 6, value: 30, step: 2},
  //         {wallTime: 6, value: 10, step: 1},
  //         {wallTime: 3, value: 20, step: 4},
  //       ],
  //       run2: [{wallTime: 2, value: 1, step: 1}],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );

  //     const fixture = createComponent('card1');
  //     const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //     expect(lineChart.componentInstance.seriesData).toEqual([
  //       {
  //         id: '["run1",0]',
  //         points: [
  //           {
  //             wallTime: 2000,
  //             value: 1,
  //             step: 1,
  //             x: 1,
  //             y: 1,
  //             relativeTimeInMs: 0,
  //           },
  //           {
  //             wallTime: 4000,
  //             value: 10,
  //             step: 2,
  //             x: 2,
  //             y: 10,
  //             relativeTimeInMs: 2000,
  //           },
  //           {
  //             wallTime: 6000,
  //             value: 30,
  //             step: 2,
  //             x: 2,
  //             y: 30,
  //             relativeTimeInMs: 4000,
  //           },
  //         ],
  //       },
  //       {
  //         id: '["run1",1]',
  //         points: [
  //           {
  //             wallTime: 6000,
  //             value: 10,
  //             step: 1,
  //             x: 1,
  //             y: 10,
  //             relativeTimeInMs: 0,
  //           },
  //           {
  //             wallTime: 3000,
  //             value: 20,
  //             step: 4,
  //             x: 4,
  //             y: 20,
  //             relativeTimeInMs: -3000,
  //           },
  //         ],
  //       },
  //       {
  //         id: '["run2",0]',
  //         points: [
  //           {
  //             wallTime: 2000,
  //             value: 1,
  //             step: 1,
  //             x: 1,
  //             y: 1,
  //             relativeTimeInMs: 0,
  //           },
  //         ],
  //       },
  //     ]);
  //     expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
  //       '["run1",0]': {
  //         id: '["run1",0]',
  //         displayName: 'run1: 0',
  //         type: SeriesType.ORIGINAL,
  //         visible: false,
  //         color: '#f00',
  //         opacity: 1,
  //         aux: false,
  //         alias: null,
  //       },
  //       '["run1",1]': {
  //         id: '["run1",1]',
  //         displayName: 'run1: 1',
  //         type: SeriesType.ORIGINAL,
  //         visible: false,
  //         color: '#f00',
  //         opacity: 1,
  //         aux: false,
  //         alias: null,
  //       },
  //       '["run2",0]': {
  //         id: '["run2",0]',
  //         displayName: 'run2',
  //         type: SeriesType.ORIGINAL,
  //         visible: false,
  //         color: '#0f0',
  //         opacity: 1,
  //         aux: false,
  //         alias: null,
  //       },
  //     });
  //   }));

  //   it('partitions to pseudo runs when wall_time increase non-monotonically', fakeAsync(() => {
  //     store.overrideSelector(
  //       selectors.getMetricsScalarPartitionNonMonotonicX,
  //       true
  //     );
  //     store.overrideSelector(
  //       selectors.getMetricsXAxisType,
  //       XAxisType.WALL_TIME
  //     );
  //     store.overrideSelector(selectors.getRunColorMap, {
  //       run1: '#f00',
  //       run2: '#0f0',
  //     });
  //     store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);

  //     const runToSeries = {
  //       run1: [
  //         {wallTime: 2, value: 1, step: 1},
  //         {wallTime: 4, value: 10, step: 2},
  //         {wallTime: 6, value: 30, step: 2},
  //         {wallTime: 6, value: 10, step: 1},
  //         {wallTime: 3, value: 20, step: 4},
  //       ],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );

  //     const fixture = createComponent('card1');
  //     const lineChart = fixture.debugElement.query(Selector.LINE_CHART);

  //     expect(lineChart.componentInstance.seriesData).toEqual([
  //       {
  //         id: '["run1",0]',
  //         points: [
  //           {
  //             wallTime: 2000,
  //             relativeTimeInMs: 0,
  //             value: 1,
  //             step: 1,
  //             x: 2000,
  //             y: 1,
  //           },
  //           {
  //             wallTime: 4000,
  //             relativeTimeInMs: 2000,
  //             value: 10,
  //             step: 2,
  //             x: 4000,
  //             y: 10,
  //           },
  //           {
  //             wallTime: 6000,
  //             relativeTimeInMs: 4000,
  //             value: 30,
  //             step: 2,
  //             x: 6000,
  //             y: 30,
  //           },
  //           {
  //             wallTime: 6000,
  //             relativeTimeInMs: 4000,
  //             value: 10,
  //             step: 1,
  //             x: 6000,
  //             y: 10,
  //           },
  //         ],
  //       },
  //       {
  //         id: '["run1",1]',
  //         points: [
  //           {
  //             wallTime: 3000,
  //             relativeTimeInMs: 0,
  //             value: 20,
  //             step: 4,
  //             x: 3000,
  //             y: 20,
  //           },
  //         ],
  //       },
  //     ]);
  //     expect(lineChart.componentInstance.seriesMetadataMap).toEqual({
  //       '["run1",0]': {
  //         id: '["run1",0]',
  //         displayName: 'run1: 0',
  //         type: SeriesType.ORIGINAL,
  //         visible: false,
  //         color: '#f00',
  //         opacity: 1,
  //         aux: false,
  //         alias: null,
  //       },
  //       '["run1",1]': {
  //         id: '["run1",1]',
  //         displayName: 'run1: 1',
  //         type: SeriesType.ORIGINAL,
  //         visible: false,
  //         color: '#f00',
  //         opacity: 1,
  //         aux: false,
  //         alias: null,
  //       },
  //     });
  //   }));
  // });

  // describe('linked time feature integration', () => {
  //   beforeEach(() => {
  //     store.overrideSelector(getMetricsLinkedTimeEnabled, true);
  //   });

  //   describe('time selection and dataset', () => {
  //     beforeEach(() => {
  //       const runToSeries = {
  //         run1: [buildScalarStepData({step: 10})],
  //         run2: [buildScalarStepData({step: 20})],
  //         run3: [buildScalarStepData({step: 30})],
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         null /* metadataOverride */,
  //         runToSeries
  //       );
  //     });

  //     it('selects time selection to min extent when global setting is too small', fakeAsync(() => {
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: -100},
  //         end: {step: 0},
  //       });
  //       // Workaround to align minMax state with minMaxSteps$
  //       store.overrideSelector(getCardStateMap, {
  //         card1: {
  //           dataMinMax: {
  //             minStep: 10,
  //             maxStep: 30,
  //           },
  //         },
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       const fobs = fixture.debugElement.queryAll(
  //         By.directive(CardFobComponent)
  //       );
  //       expect(
  //         fobs[0].query(By.css('span')).nativeElement.textContent.trim()
  //       ).toEqual('10');
  //     }));

  //     it('selects time selection to max extent when global setting is too large', fakeAsync(() => {
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: 50},
  //         end: {step: 100},
  //       });
  //       // Workaround to align minMax state with minMaxSteps$
  //       store.overrideSelector(getCardStateMap, {
  //         card1: {
  //           dataMinMax: {
  //             minStep: 10,
  //             maxStep: 30,
  //           },
  //         },
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       const fobs = fixture.debugElement.queryAll(
  //         By.directive(CardFobComponent)
  //       );
  //       expect(
  //         fobs[0].query(By.css('span')).nativeElement.textContent.trim()
  //       ).toEqual('30');
  //     }));
  //   });

  //   describe('fob controls', () => {
  //     beforeEach(() => {
  //       const runToSeries = {
  //         run1: [buildScalarStepData({step: 10})],
  //         run2: [buildScalarStepData({step: 20})],
  //         run3: [buildScalarStepData({step: 30})],
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         null /* metadataOverride */,
  //         runToSeries
  //       );

  //       store.overrideSelector(getCardStateMap, {
  //         card1: {
  //           dataMinMax: {
  //             minStep: 0,
  //             maxStep: 100,
  //           },
  //         },
  //       });

  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 20},
  //         end: {step: 40},
  //       });
  //     });

  //     it('renders fobs', fakeAsync(() => {
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       expect(
  //         fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
  //       ).toEqual(1);
  //     }));

  //     it('does not render fobs when axis type is RELATIVE', fakeAsync(() => {
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       store.overrideSelector(
  //         selectors.getMetricsXAxisType,
  //         XAxisType.RELATIVE
  //       );
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       expect(
  //         fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
  //       ).toEqual(0);
  //     }));

  //     it('does not render fobs when axis type is WALL_TIME', fakeAsync(() => {
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       store.overrideSelector(
  //         selectors.getMetricsXAxisType,
  //         XAxisType.WALL_TIME
  //       );
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       expect(
  //         fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
  //       ).toEqual(0);
  //     }));

  //     it('renders start and end fobs for range selection', fakeAsync(() => {
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       expect(
  //         fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
  //       ).toEqual(2);
  //     }));

  //     it('dispatches timeSelectionChanged action when fob is dragged', fakeAsync(() => {
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const testController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;
  //       const controllerStartPosition =
  //         testController.root.nativeElement.getBoundingClientRect().left;

  //       // Simulate dragging fob to step 25.
  //       testController.startDrag(
  //         Fob.START,
  //         TimeSelectionAffordance.FOB,
  //         new MouseEvent('mouseDown')
  //       );
  //       let fakeEvent = new MouseEvent('mousemove', {
  //         clientX: 25 + controllerStartPosition,
  //         movementX: 1,
  //       });
  //       testController.mouseMove(fakeEvent);

  //       // Simulate ngrx update from mouseMove;
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 25},
  //         end: null,
  //       });
  //       store.refreshState();
  //       fixture.detectChanges();

  //       testController.stopDrag();
  //       fixture.detectChanges();

  //       testController.startDrag(
  //         Fob.START,
  //         TimeSelectionAffordance.EXTENDED_LINE,
  //         new MouseEvent('mouseDown')
  //       );
  //       fakeEvent = new MouseEvent('mousemove', {
  //         clientX: 30 + controllerStartPosition,
  //         movementX: 1,
  //       });
  //       testController.mouseMove(fakeEvent);

  //       // Simulate ngrx update from mouseMove;
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 30},
  //         end: null,
  //       });
  //       store.refreshState();
  //       fixture.detectChanges();

  //       testController.stopDrag();
  //       fixture.detectChanges();

  //       expect(dispatchedActions).toEqual([
  //         // Call from first mouseMove.
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 25},
  //             end: null,
  //           },
  //           cardId: 'card1',
  //         }),
  //         // Call from first stopDrag.
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 25},
  //             end: null,
  //           },
  //           affordance: TimeSelectionAffordance.FOB,
  //           cardId: 'card1',
  //         }),
  //         // Call from second mouseMove.
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 30},
  //             end: null,
  //           },
  //           cardId: 'card1',
  //         }),
  //         // Call from second stopDrag.
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 30},
  //             end: null,
  //           },
  //           affordance: TimeSelectionAffordance.EXTENDED_LINE,
  //           cardId: 'card1',
  //         }),
  //       ]);
  //     }));

  //     it('toggles step selection when single fob is deselected even when linked time is enabled', fakeAsync(() => {
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const fobComponent = fixture.debugElement.query(
  //         By.directive(CardFobComponent)
  //       ).componentInstance;
  //       fobComponent.fobRemoved.emit();

  //       expect(dispatchedActions).toEqual([
  //         stepSelectorToggled({
  //           affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
  //           cardId: 'card1',
  //         }),
  //       ]);
  //     }));

  //     it('does not render fobs when no timeSelection is provided', fakeAsync(() => {
  //       store.overrideSelector(getMetricsCardTimeSelection, undefined);
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const fobController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;

  //       expect(fobController).toBeDefined();
  //       expect(fobController.startFobWrapper).toBeUndefined();
  //       expect(fobController.endFobWrapper).toBeUndefined();
  //     }));
  //   });
  // })

  // describe('data table line chart integration', () => {
  //   beforeEach(() => {
  //     store.overrideSelector(getMetricsLinkedTimeSelection, {
  //       start: {step: 20},
  //       end: null,
  //     });
  //     store.overrideSelector(getSingleSelectionHeaders, [
  //       {
  //         type: ColumnHeaderType.RUN,
  //         name: 'run',
  //         displayName: 'Run',
  //         enabled: true,
  //       },
  //       {
  //         type: ColumnHeaderType.VALUE,
  //         name: 'value',
  //         displayName: 'Value',
  //         enabled: false,
  //       },
  //       {
  //         type: ColumnHeaderType.STEP,
  //         name: 'step',
  //         displayName: 'Step',
  //         enabled: true,
  //       },
  //     ]);
  //     const runToSeries = {
  //       run1: [
  //         {wallTime: 1, value: 1, step: 1},
  //         {wallTime: 2, value: 10, step: 2},
  //         {wallTime: 3, value: 20, step: 3},
  //       ],
  //       run2: [
  //         {wallTime: 1, value: 1, step: 1},
  //         {wallTime: 2, value: 10, step: 2},
  //         {wallTime: 3, value: 20, step: 3},
  //       ],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );
  //     store.overrideSelector(
  //       selectors.getCurrentRouteRunSelection,
  //       new Map([
  //         ['run1', true],
  //         ['run2', true],
  //       ])
  //     );
  //     store.overrideSelector(
  //       commonSelectors.getFilteredRenderableRunsIdsFromRoute,
  //       new Set(['run1', 'run2'])
  //     );
  //     store.overrideSelector(getCardStateMap, {
  //       card1: {
  //         dataMinMax: {
  //           minStep: 10,
  //           maxStep: 30,
  //         },
  //       },
  //     });
  //   });
  //   it('updates viewBox value when line chart is zoomed', fakeAsync(async () => {
  //     const runToSeries = {
  //       run1: [buildScalarStepData({step: 10})],
  //       run2: [buildScalarStepData({step: 20})],
  //       run3: [buildScalarStepData({step: 30})],
  //     };
  //     provideMockCardRunToSeriesData(
  //       selectSpy,
  //       PluginType.SCALARS,
  //       'card1',
  //       null /* metadataOverride */,
  //       runToSeries
  //     );
  //     store.overrideSelector(getMetricsLinkedTimeSelection, {
  //       start: {step: 0},
  //       end: {step: 50},
  //     });
  //     store.overrideSelector(getCardStateMap, {
  //       card1: {
  //         dataMinMax: {
  //           minStep: 10,
  //           maxStep: 30,
  //         },
  //       },
  //     });
  //     const fixture = createComponent('card1');

  //     fixture.componentInstance.onLineChartZoom({
  //       x: [9.235, 30.4],
  //       y: [0, 100],
  //     });
  //     fixture.componentInstance.onLineChartZoom({
  //       x: [8, 31],
  //       y: [0, 100],
  //     });
  //     fixture.componentInstance.onLineChartZoom(null);

  //     expect(dispatchedActions).toEqual([
  //       cardViewBoxChanged({
  //         userViewBox: {
  //           x: [9.235, 30.4],
  //           y: [0, 100],
  //         },
  //         cardId: 'card1',
  //       }),
  //       cardViewBoxChanged({
  //         userViewBox: {
  //           x: [8, 31],
  //           y: [0, 100],
  //         },
  //         cardId: 'card1',
  //       }),
  //       cardViewBoxChanged({
  //         userViewBox: null,
  //         cardId: 'card1',
  //       }),
  //     ]);
  //   }));
  // });
  
  // describe('step selector feature integration', () => {
  //   describe('fob controls', () => {
  //     beforeEach(() => {
  //       const runToSeries = {
  //         run1: [buildScalarStepData({step: 10})],
  //         run2: [buildScalarStepData({step: 20})],
  //         run3: [buildScalarStepData({step: 30})],
  //       };
  //       provideMockCardRunToSeriesData(
  //         selectSpy,
  //         PluginType.SCALARS,
  //         'card1',
  //         null /* metadataOverride */,
  //         runToSeries
  //       );
  //       store.overrideSelector(getMetricsStepSelectorEnabled, false);
  //       store.overrideSelector(getMetricsRangeSelectionEnabled, false);
  //       // Workaround to align minMax state with minMaxSteps$
  //       store.overrideSelector(getCardStateMap, {
  //         card1: {
  //           dataMinMax: {
  //             minStep: 10,
  //             maxStep: 30,
  //           },
  //         },
  //       });
  //     });

  //     it('does not render fobs by default', fakeAsync(() => {
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       expect(
  //         fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
  //       ).toEqual(0);
  //     }));

  //     it('renders prospective fob', fakeAsync(() => {
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       const cardFobController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;
  //       expect(cardFobController).toBeDefined();

  //       cardFobController.onProspectiveStepChanged.emit(1);
  //       fixture.detectChanges();

  //       const prospectiveFob = fixture.debugElement.query(
  //         By.directive(CardFobComponent)
  //       ).componentInstance;
  //       expect(prospectiveFob).toBeDefined();
  //       expect(cardFobController.prospectiveFobWrapper).toBeDefined();
  //       expect(cardFobController.prospectiveStep).toEqual(1);
  //     }));

  //     it('dispatches timeSelectionChanged actions when fob is added by clicking prospective fob', fakeAsync(() => {
  //       store.overrideSelector(getMetricsCardTimeSelection, undefined);
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();

  //       const testController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;
  //       testController.onProspectiveStepChanged.emit(10);
  //       fixture.detectChanges();

  //       // One prospective fob
  //       let fobs = fixture.debugElement.queryAll(
  //         By.directive(CardFobComponent)
  //       );
  //       expect(fobs.length).toEqual(1);

  //       // Click the prospective fob to set the start time
  //       testController.prospectiveFobClicked(new MouseEvent('mouseclick'));
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 10},
  //         end: null,
  //       });
  //       store.refreshState();
  //       fixture.detectChanges();

  //       // One start fob
  //       fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));
  //       expect(fobs.length).toEqual(1);
  //       fixture.detectChanges();

  //       // One start fob + 1 prospective fob
  //       testController.onProspectiveStepChanged.emit(25);
  //       fixture.detectChanges();

  //       fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));
  //       expect(fobs.length).toEqual(2);

  //       // Click the prospective fob to set the end time
  //       testController.prospectiveFobClicked(new MouseEvent('mouseclick'));
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 10},
  //         end: {step: 25},
  //       });
  //       store.overrideSelector(getMetricsCardRangeSelectionEnabled, true);
  //       store.refreshState();
  //       fixture.detectChanges();

  //       // One start fob, one end fob
  //       fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));
  //       expect(fobs.length).toEqual(2);

  //       expect(dispatchedActions).toEqual([
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 10},
  //             end: null,
  //           },
  //           affordance: TimeSelectionAffordance.FOB_ADDED,
  //           cardId: 'card1',
  //         }),
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 10},
  //             end: {step: 25},
  //           },
  //           affordance: TimeSelectionAffordance.FOB_ADDED,
  //           cardId: 'card1',
  //         }),
  //       ]);
  //     }));

  //     it('toggles when single fob is deselected', fakeAsync(() => {
  //       store.overrideSelector(selectors.getMetricsStepSelectorEnabled, true);
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const fobComponent = fixture.debugElement.query(
  //         By.directive(CardFobComponent)
  //       ).componentInstance;
  //       fobComponent.fobRemoved.emit();

  //       expect(dispatchedActions).toEqual([
  //         stepSelectorToggled({
  //           affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
  //           cardId: 'card1',
  //         }),
  //       ]);
  //     }));

  //     it('dispatches timeSelectionChanged actions when fob is dragged while linked time is enabled', fakeAsync(() => {
  //       store.overrideSelector(getMetricsLinkedTimeEnabled, true);
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: 20},
  //         end: null,
  //       });
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const testController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;
  //       const controllerStartPosition =
  //         testController.root.nativeElement.getBoundingClientRect().left;

  //       // Simulate dragging fob to step 25.
  //       testController.startDrag(
  //         Fob.START,
  //         TimeSelectionAffordance.FOB,
  //         new MouseEvent('mouseDown')
  //       );
  //       const fakeEvent = new MouseEvent('mousemove', {
  //         clientX: 25 + controllerStartPosition,
  //         movementX: 1,
  //       });
  //       testController.mouseMove(fakeEvent);

  //       // Simulate ngrx update from mouseMove;
  //       store.overrideSelector(getMetricsLinkedTimeSelection, {
  //         start: {step: 25},
  //         end: null,
  //       });
  //       store.refreshState();
  //       fixture.detectChanges();

  //       testController.stopDrag();
  //       fixture.detectChanges();

  //       const fobs = fixture.debugElement.queryAll(
  //         By.directive(CardFobComponent)
  //       );
  //       expect(
  //         fobs[0].query(By.css('span')).nativeElement.textContent.trim()
  //       ).toEqual('25');
  //       expect(dispatchedActions).toContain(
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 25},
  //             end: null,
  //           },
  //           affordance: TimeSelectionAffordance.FOB,
  //           cardId: 'card1',
  //         })
  //       );
  //       const scalarCardComponent = fixture.debugElement.query(
  //         By.directive(ScalarCardLineChartComponent)
  //       );
  //       expect(
  //         scalarCardComponent.componentInstance.stepOrLinkedTimeSelection
  //       ).toEqual({
  //         start: {step: 25},
  //         end: null,
  //       });
  //     }));

  //     it('dispatches timeSelectionChanged actions when fob is dragged while linkedTime is disabled', fakeAsync(() => {
  //       store.overrideSelector(selectors.getMetricsStepSelectorEnabled, true);
  //       const fixture = createComponent('card1');
  //       fixture.detectChanges();
  //       const testController = fixture.debugElement.query(
  //         By.directive(CardFobControllerComponent)
  //       ).componentInstance;
  //       const controllerStartPosition =
  //         testController.root.nativeElement.getBoundingClientRect().left;

  //       // Simulate dragging fob to step 25.
  //       testController.startDrag(
  //         Fob.START,
  //         TimeSelectionAffordance.FOB,
  //         new MouseEvent('mouseDown')
  //       );
  //       const fakeEvent = new MouseEvent('mousemove', {
  //         clientX: 25 + controllerStartPosition,
  //         movementX: -1,
  //       });
  //       testController.mouseMove(fakeEvent);

  //       // Simulate ngrx update from mouseMove
  //       store.overrideSelector(getMetricsCardTimeSelection, {
  //         start: {step: 25},
  //         end: null,
  //       });
  //       store.refreshState();
  //       fixture.detectChanges();

  //       testController.stopDrag();
  //       fixture.detectChanges();

  //       expect(dispatchedActions).toEqual([
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 25},
  //             end: null,
  //           },
  //           cardId: 'card1',
  //         }),
  //         timeSelectionChanged({
  //           timeSelection: {
  //             start: {step: 25},
  //             end: null,
  //           },
  //           affordance: TimeSelectionAffordance.FOB,
  //           cardId: 'card1',
  //         }),
  //       ]);
  //     }));
  //   });
  // })

  // it('renders userViewBox', fakeAsync(() => {
  //   store.overrideSelector(selectors.getMetricsCardUserViewBox, {
  //     x: [0, 1],
  //     y: [11, 22],
  //   });
  //   const fixture = createComponent('card1');
  //   fixture.detectChanges();

  //   const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
  //   expect(lineChartEl).toBeTruthy();
  //   expect(lineChartEl.componentInstance.userViewBox).toEqual({
  //     x: [0, 1],
  //     y: [11, 22],
  //   });
  // }));
  })
})