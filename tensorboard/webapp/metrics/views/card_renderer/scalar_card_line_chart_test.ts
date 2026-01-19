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
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NO_ERRORS_SCHEMA,
  Output,
  TemplateRef,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {Observable, ReplaySubject} from 'rxjs';
import {State} from '../../../app_state';
import {ExperimentAlias} from '../../../experiments/types';
import * as selectors from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {CardFobComponent} from '../../../widgets/card_fob/card_fob_component';
import {
  CardFobControllerComponent,
  Fob,
} from '../../../widgets/card_fob/card_fob_controller_component';
import {CardFobModule} from '../../../widgets/card_fob/card_fob_module';
import {
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionToggleAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {
  Formatter,
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
  siNumberFormatter,
} from '../../../widgets/line_chart_v2/lib/formatter';
import {
  DataSeries,
  DataSeriesMetadataMap,
  Point,
  RendererType,
  ScaleType,
  TooltipDatum,
} from '../../../widgets/line_chart_v2/types';
import {
  cardViewBoxChanged,
  stepSelectorToggled,
  timeSelectionChanged,
} from '../../actions';
import {getMetricsCardRangeSelectionEnabled} from '../../store';
import {TooltipSort, XAxisType} from '../../types';
import {ScalarCardLineChartComponent} from './scalar_card_line_chart_component';
import {ScalarCardLineChartContainer} from './scalar_card_line_chart_container';
import {ScalarCardFobController} from './scalar_card_fob_controller';
import {
  MinMaxStep,
  OriginalSeriesMetadata,
  ScalarCardPoint,
  ScalarCardSeriesMetadata,
  ScalarCardSeriesMetadataMap,
  ScalarCardDataSeries,
  SeriesType,
} from './scalar_card_types';
import {Extent} from '../../../widgets/line_chart_v2/lib/public_types';
import {provideMockTbStore} from '../../../testing/utils';

@Component({
  standalone: false,
  selector: 'line-chart',
  template: `
    {{ tooltipData | json }}
    <ng-container
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

@Component({
  standalone: false,
  selector: 'test-scalar-card-line-chart',
  template: `
    <scalar-card-line-chart
      [cardId]="cardId"
      [tooltipTemplate]="tooltip"
      [minMaxStep]="minMaxStep"
      [stepOrLinkedTimeSelection]="stepOrLinkedTimeSelection"
      [allowFobRemoval]="allowFobRemoval"
    >
    </scalar-card-line-chart>
    <ng-template
      #tooltip
      let-tooltipData="data"
      let-cursorLocationInDataCoord="cursorLocationInDataCoord"
      let-cursorLocation="cursorLocation"
    >
      <table class="tooltip">
        <thead>
          <tr>
            <th class="circle-header"></th>
            <th>Run</th>
            <th *ngIf="smoothingEnabled">Smoothed</th>
            <th>Value</th>
            <th>Step</th>
            <th>Time</th>
            <th>Relative</th>
          </tr>
        </thead>
        <tbody>
          <ng-container
            *ngFor="
              let datum of getCursorAwareTooltipData(
                tooltipDataForTesting,
                cursorLocationInDataCoordForTesting,
                cursorLocationForTesting
              )
            "
          >
            <tr class="tooltip-row" [class.closest]="datum.metadata.closest">
              <td class="tooltip-row-circle">
                <span [style.backgroundColor]="datum.metadata.color"></span>
              </td>
              <td class="name">
                <ng-container *ngIf="datum.metadata.alias"
                  ><tb-experiment-alias
                    [alias]="datum.metadata.alias"
                  ></tb-experiment-alias
                  >/</ng-container
                >{{ datum.metadata.displayName }}
              </td>
              <td *ngIf="smoothingEnabled">
                {{ valueFormatter.formatShort(datum.dataPoint.y) }}
              </td>
              <td>{{ valueFormatter.formatShort(datum.dataPoint.value) }}</td>
              <!-- Print the step with comma for readability. -->
              <td>{{ stepFormatter.formatShort(datum.dataPoint.step) }}</td>
              <td>{{ datum.dataPoint.wallTime | date: 'short' }}</td>
              <td>
                {{
                  relativeXFormatter.formatReadable(
                    datum.dataPoint.relativeTimeInMs
                  )
                }}
              </td>
            </tr>
          </ng-container>
        </tbody>
      </table>
    </ng-template>
  `,
})
class TestableScalarCardLineChart {
  @Input() cardId!: string;
  @Input() minMaxStep!: MinMaxStep;
  @Input() stepOrLinkedTimeSelection!: TimeSelection;
  @Input() tooltipDataForTesting: TooltipDatum[] = [];
  @Input() cursorLocationInDataCoordForTesting: {x: number; y: number} = {
    x: 0,
    y: 0,
  };
  @Input() cursorLocationForTesting: {x: number; y: number} = {x: 0, y: 0};
  @Input() dataPointForTesting: {x: number; y: number} = {x: 0, y: 0};
  @Input() smoothingEnabled: boolean = false;
  @Input() tooltipSort: TooltipSort = TooltipSort.ALPHABETICAL;
  @Input() allowFobRemoval: boolean = true;

  readonly relativeXFormatter = relativeTimeFormatter;
  readonly valueFormatter = numberFormatter;
  readonly stepFormatter = intlNumberFormatter;

  constructor(public readonly changeDetectorRef: ChangeDetectorRef) {}

  getCursorAwareTooltipData(
    tooltipData: TooltipDatum<ScalarCardSeriesMetadata>[],
    cursorLocationInDataCoord: {x: number; y: number},
    cursorLocation: {x: number; y: number}
  ) {
    const scalarTooltipData = tooltipData.map((datum) => {
      return {
        ...datum,
        metadata: {
          ...datum.metadata,
          closest: false,
          distToCursorPixels: Math.hypot(
            datum.domPoint.x - cursorLocation.x,
            datum.domPoint.y - cursorLocation.y
          ),
          distToCursorX: datum.dataPoint.x - cursorLocationInDataCoord.x,
          distToCursorY: datum.dataPoint.y - cursorLocationInDataCoord.y,
        },
      };
    });

    let minDist = Infinity;
    let minIndex = 0;
    for (let index = 0; index < scalarTooltipData.length; index++) {
      if (minDist > scalarTooltipData[index].metadata.distToCursorPixels) {
        minDist = scalarTooltipData[index].metadata.distToCursorPixels;
        minIndex = index;
      }
    }

    if (scalarTooltipData.length) {
      scalarTooltipData[minIndex].metadata.closest = true;
    }

    switch (this.tooltipSort) {
      case TooltipSort.ASCENDING:
        return scalarTooltipData.sort((a, b) => a.dataPoint.y - b.dataPoint.y);
      case TooltipSort.DESCENDING:
        return scalarTooltipData.sort((a, b) => b.dataPoint.y - a.dataPoint.y);
      case TooltipSort.NEAREST:
        return scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorPixels - b.metadata.distToCursorPixels;
        });
      case TooltipSort.NEAREST_Y:
        return scalarTooltipData.sort((a, b) => {
          return a.metadata.distToCursorY - b.metadata.distToCursorY;
        });
      case TooltipSort.DEFAULT:
      case TooltipSort.ALPHABETICAL:
        return scalarTooltipData.sort((a, b) => {
          if (a.metadata.displayName < b.metadata.displayName) {
            return -1;
          }
          if (a.metadata.displayName > b.metadata.displayName) {
            return 1;
          }
          return 0;
        });
    }
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

function buildScalarCardPoint(
  override: Partial<ScalarCardPoint>
): ScalarCardPoint {
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

function buildOriginalSeriesMetadata(
  metadata: Partial<OriginalSeriesMetadata>
): OriginalSeriesMetadata {
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

describe('scalar card line chart', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];

  const Selector = {
    LINE_CHART: By.directive(TestableLineChart),
    SCALAR_CARD_LINE_CHART: By.directive(ScalarCardLineChartContainer),
    TOOLTIP_HEADER_COLUMN: By.css('table.tooltip th'),
    TOOLTIP_ROW: By.css('table.tooltip .tooltip-row'),
  };

  function createComponent(
    seriesMetadataMap?: ScalarCardSeriesMetadataMap,
    seriesData?: ScalarCardDataSeries[]
  ): ComponentFixture<TestableScalarCardLineChart> {
    const fixture = TestBed.createComponent(TestableScalarCardLineChart);
    const scalarCardLineChartContainer = fixture.debugElement.query(
      Selector.SCALAR_CARD_LINE_CHART
    );
    scalarCardLineChartContainer.componentInstance.seriesMetadataMap =
      seriesMetadataMap;
    scalarCardLineChartContainer.componentInstance.seriesData = seriesData;

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

    // HACK: we are using viewChild in ScalarCardLineChartComponent and there is
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

    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardFobModule, ExperimentAliasModule, MatIconTestingModule],
      declarations: [
        ScalarCardLineChartContainer,
        ScalarCardLineChartComponent,
        ScalarCardFobController,
        TestableLineChart,
        TestableScalarCardLineChart,
      ],
      providers: [provideMockTbStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
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
      selectors.getMetricsCardRangeSelectionEnabled('card1'),
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
    it('renders empty chart when there is no data', fakeAsync(() => {
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
        }),
      };
      const fixture = createComponent(cardMetadataMap, []);

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      expect(lineChartEl).toBeTruthy();
      expect(lineChartEl.componentInstance.seriesData.length).toBe(0);
    }));

    it('renders data', fakeAsync(() => {
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
        }),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [
            buildScalarCardPoint({wallTime: 100, y: 1, x: 333}),
            buildScalarCardPoint({wallTime: 101, y: 2, x: 555}),
          ],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);

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
        const fixture = createComponent();

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
        const fixture = createComponent();

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
        const fixture = createComponent();

        expect(
          fixture.debugElement.query(Selector.LINE_CHART).componentInstance
            .customXFormatter
        ).toBe(undefined);
      }));
    });
    it('sets useDarkMode when using dark mode', fakeAsync(() => {
      store.overrideSelector(selectors.getDarkModeEnabled, false);
      const fixture = createComponent();
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
      const fixture = createComponent();
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
    it('sets displayName always as run name', fakeAsync(() => {
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
          alias: {aliasText: 'existing_exp', aliasNumber: 1},
        }),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [
            buildScalarCardPoint({wallTime: 100, y: 1, x: 333}),
            buildScalarCardPoint({wallTime: 101, y: 2, x: 555}),
          ],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);

      const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);
      const {displayName, alias} =
        lineChartEl.componentInstance.seriesMetadataMap['run1'];
      expect(displayName).toBe('Run1 name');
      expect(alias).toEqual({
        aliasNumber: 1,
        aliasText: 'existing_exp',
      });
    }));
  });

  describe('xAxisType setting', () => {
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
    it(`formats series data when xAxisType is STEP`, fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
        }),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [
            buildScalarCardPoint({wallTime: 100, y: 1, x: 333}),
            buildScalarCardPoint({wallTime: 101, y: 2, x: 555}),
          ],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);

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
      ).toEqual(expectedPoints.step);
    }));

    it(`formats series data when xAxisType is WALL_TIME`, fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
        }),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [
            buildScalarCardPoint({wallTime: 100, y: 1, x: 100000}),
            buildScalarCardPoint({wallTime: 101, y: 2, x: 101000}),
          ],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);

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
      ).toEqual(expectedPoints.wallTime);
    }));

    it(`formats series data when xAxisType is RELATIVE`, fakeAsync(() => {
      store.overrideSelector(selectors.getMetricsScalarSmoothing, 0);
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({
          id: 'run1',
          displayName: 'Run1 name',
          visible: true,
        }),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [
            buildScalarCardPoint({wallTime: 100, y: 1, x: 0}),
            buildScalarCardPoint({wallTime: 101, y: 2, x: 1000}),
          ],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);

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
      ).toEqual(expectedPoints.relative);
    }));
  });

  describe('tooltip', () => {
    function buildTooltipDatum(
      metadata?: ScalarCardSeriesMetadata,
      dataPoint: Partial<ScalarCardPoint> = {},
      domPoint: Point = {x: 0, y: 0}
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
        dataPoint: {
          x: 0,
          y: 0,
          value: 0,
          step: 0,
          wallTime: 0,
          relativeTimeInMs: 0,
          ...dataPoint,
        },
        domPoint,
      };
    }

    function setTooltipData(
      fixture: ComponentFixture<TestableScalarCardLineChart>,
      tooltipData: TooltipDatum[]
    ) {
      fixture.componentInstance.tooltipDataForTesting = tooltipData;
      fixture.componentInstance.changeDetectorRef.markForCheck();
    }

    function setCursorLocation(
      fixture: ComponentFixture<TestableScalarCardLineChart>,
      dataPoint?: {x: number; y: number},
      domPoint?: Point
    ) {
      if (dataPoint) {
        fixture.componentInstance.dataPointForTesting = dataPoint;
      }
      if (domPoint) {
        fixture.componentInstance.cursorLocationForTesting = domPoint;
      }
      fixture.componentInstance.changeDetectorRef.markForCheck();
    }

    function assertTooltipRows(
      fixture: ComponentFixture<TestableScalarCardLineChart>,
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
      const fixture = createComponent();
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
      const fixture = createComponent();
      fixture.componentInstance.smoothingEnabled = true;
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
      const fixture = createComponent();
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
      const rows = fixture.debugElement.queryAll(Selector.TOOLTIP_ROW);
      const tableContent = rows.map((row) => {
        return row
          .queryAll(By.css('td'))
          .map((td) => td.nativeElement.textContent.trim());
      });

      expect(headerText).toEqual([
        '',
        'Run',
        'Value',
        'Step',
        'Time',
        'Relative',
      ]);

      expect(tableContent).toEqual([
        ['', 'Row 1', '1000', '10', '1/1/20, 12:00 AM', '10 ms'],
        ['', 'Row 2', '-1000', '1,000', '1/5/20, 12:00 AM', '5 day'],
      ]);
    }));

    it('renders alias when alias is non-null', fakeAsync(() => {
      const fixture = createComponent();
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
      const fixture = createComponent();
      fixture.componentInstance.tooltipSort = TooltipSort.ASCENDING;
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
      const fixture = createComponent();
      fixture.componentInstance.tooltipSort = TooltipSort.DESCENDING;
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
      const fixture = createComponent();
      fixture.componentInstance.tooltipSort = TooltipSort.NEAREST;
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
          },
          {
            x: 0,
            y: 100,
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
          },
          {
            x: 50,
            y: 0,
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
          },
          {
            x: 1000,
            y: 30,
          }
        ),
      ]);
      setCursorLocation(fixture, {x: 500, y: -100}, {x: 50, y: 0});
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);

      setCursorLocation(fixture, {x: 500, y: 600}, {x: 50, y: 80});
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);

      setCursorLocation(fixture, {x: 10000, y: -100}, {x: 1000, y: 20});
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 3', '3', '10,000', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 1', '1000', '0', anyString, anyString],
      ]);

      // Right between row 1 and row 2. When tied, original order is used.
      setCursorLocation(fixture, {x: 500, y: 250}, {x: 25, y: 50});
      fixture.detectChanges();

      assertTooltipRows(fixture, [
        ['', 'Row 1', '1000', '0', anyString, anyString],
        ['', 'Row 2', '-500', '1,000', anyString, anyString],
        ['', 'Row 3', '3', '10,000', anyString, anyString],
      ]);
    }));

    it('sorts by displayname alphabetical order', fakeAsync(() => {
      const fixture = createComponent();
      fixture.componentInstance.tooltipSort = TooltipSort.ALPHABETICAL;
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

  describe('linked time feature integration', () => {
    beforeEach(() => {
      store.overrideSelector(selectors.getMetricsXAxisType, XAxisType.STEP);
    });

    describe('fob controls', () => {
      it('renders fobs', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.minMaxStep = {
          minStep: 0,
          maxStep: 100,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
        ).toEqual(1);
      }));

      it('does not render fobs when axis type is RELATIVE', fakeAsync(() => {
        store.overrideSelector(
          selectors.getMetricsXAxisType,
          XAxisType.RELATIVE
        );
        const fixture = createComponent();
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
        ).toEqual(0);
      }));

      it('does not render fobs when axis type is WALL_TIME', fakeAsync(() => {
        store.overrideSelector(
          selectors.getMetricsXAxisType,
          XAxisType.WALL_TIME
        );
        const fixture = createComponent();
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
        ).toEqual(0);
      }));

      it('renders start and end fobs for range selection', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.minMaxStep = {
          minStep: 0,
          maxStep: 100,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: {step: 40},
        };
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
        ).toEqual(2);
      }));

      it('dispatches timeSelectionChanged action when fob is dragged', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 0,
          maxStep: 100,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();
        const testController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;
        const controllerStartPosition =
          testController.root.nativeElement.getBoundingClientRect().left;

        // Simulate dragging fob to step 25.
        testController.startDrag(
          Fob.START,
          TimeSelectionAffordance.FOB,
          new MouseEvent('mouseDown')
        );
        let fakeEvent = new MouseEvent('mousemove', {
          clientX: 25 + controllerStartPosition,
          movementX: 1,
        });
        testController.mouseMove(fakeEvent);

        // Simulate ngrx update from mouseMove;
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 25},
          end: null,
        };
        store.refreshState();
        fixture.detectChanges();

        testController.stopDrag();
        fixture.detectChanges();

        testController.startDrag(
          Fob.START,
          TimeSelectionAffordance.EXTENDED_LINE,
          new MouseEvent('mouseDown')
        );
        fakeEvent = new MouseEvent('mousemove', {
          clientX: 30 + controllerStartPosition,
          movementX: 1,
        });
        testController.mouseMove(fakeEvent);

        // Simulate ngrx update from mouseMove;
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 30},
          end: null,
        };
        store.refreshState();
        fixture.detectChanges();

        testController.stopDrag();
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([
          // Call from first mouseMove.
          timeSelectionChanged({
            timeSelection: {
              start: {step: 25},
              end: null,
            },
            cardId: 'card1',
          }),
          // Call from first stopDrag.
          timeSelectionChanged({
            timeSelection: {
              start: {step: 25},
              end: null,
            },
            affordance: TimeSelectionAffordance.FOB,
            cardId: 'card1',
          }),
          // Call from second mouseMove.
          timeSelectionChanged({
            timeSelection: {
              start: {step: 30},
              end: null,
            },
            cardId: 'card1',
          }),
          // Call from second stopDrag.
          timeSelectionChanged({
            timeSelection: {
              start: {step: 30},
              end: null,
            },
            affordance: TimeSelectionAffordance.EXTENDED_LINE,
            cardId: 'card1',
          }),
        ]);
      }));

      it('toggles step selection when single fob is deselected even when linked time is enabled', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 0,
          maxStep: 100,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();
        const fobComponent = fixture.debugElement.query(
          By.directive(CardFobComponent)
        ).componentInstance;

        fobComponent.fobRemoved.emit();

        expect(dispatchedActions).toEqual([
          stepSelectorToggled({
            affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
            cardId: 'card1',
          }),
        ]);
      }));

      it('does not render fobs when no timeSelection is provided', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 0,
          maxStep: 100,
        };
        fixture.detectChanges();
        const fobController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;

        expect(fobController).toBeDefined();
        expect(fobController.startFobWrapper).toBeUndefined();
        expect(fobController.endFobWrapper).toBeUndefined();
      }));
    });

    it('does not render dismiss icon for single fob removal when allowFobRemoval is false', fakeAsync(() => {
      const fixture = createComponent();
      fixture.componentInstance.cardId = 'card1';
      fixture.componentInstance.minMaxStep = {
        minStep: 0,
        maxStep: 100,
      };
      fixture.componentInstance.stepOrLinkedTimeSelection = {
        start: {step: 20},
        end: null,
      };
      fixture.componentInstance.allowFobRemoval = false;
      fixture.detectChanges();

      expect(
        fixture.debugElement.queryAll(By.css('[aria-label="Deselect fob"]'))
          .length
      ).toEqual(0);
    }));

    it('renders dismiss icon for single fob removal when allowFobRemoval is true', fakeAsync(() => {
      const fixture = createComponent();
      fixture.componentInstance.cardId = 'card1';
      fixture.componentInstance.minMaxStep = {
        minStep: 0,
        maxStep: 100,
      };
      fixture.componentInstance.stepOrLinkedTimeSelection = {
        start: {step: 20},
        end: null,
      };
      fixture.componentInstance.allowFobRemoval = true;
      fixture.detectChanges();

      expect(
        fixture.debugElement.queryAll(By.css('[aria-label="Deselect fob"]'))
          .length
      ).toEqual(1);
    }));

    it('renders dismiss icon for range fob removal even when allowFobRemoval is false', fakeAsync(() => {
      const fixture = createComponent();
      fixture.componentInstance.cardId = 'card1';
      fixture.componentInstance.minMaxStep = {
        minStep: 0,
        maxStep: 100,
      };
      fixture.componentInstance.stepOrLinkedTimeSelection = {
        start: {step: 20},
        end: {step: 40},
      };
      fixture.componentInstance.allowFobRemoval = false;
      fixture.detectChanges();

      expect(
        fixture.debugElement.queryAll(By.css('[aria-label="Deselect fob"]'))
          .length
      ).toEqual(2);
    }));
  });

  describe('data table line chart integration', () => {
    it('updates viewBox value when line chart is zoomed', fakeAsync(async () => {
      const cardMetadataMap = {
        run1: buildOriginalSeriesMetadata({id: 'run1', visible: true}),
        run2: buildOriginalSeriesMetadata({id: 'run2', visible: true}),
        run3: buildOriginalSeriesMetadata({id: 'run3', visible: true}),
      };
      const dataSeries = [
        {
          id: 'run1',
          points: [buildScalarCardPoint({step: 10})],
        },
        {
          id: 'run2',
          points: [buildScalarCardPoint({step: 20})],
        },
        {
          id: 'run3',
          points: [buildScalarCardPoint({step: 30})],
        },
      ];
      const fixture = createComponent(cardMetadataMap, dataSeries);
      fixture.componentInstance.cardId = 'card1';
      fixture.componentInstance.minMaxStep = {
        minStep: 10,
        maxStep: 30,
      };
      fixture.detectChanges();
      const scalarCardLineChartComponent = fixture.debugElement.query(
        Selector.SCALAR_CARD_LINE_CHART
      );

      scalarCardLineChartComponent.componentInstance.onLineChartZoom({
        x: [9.235, 30.4],
        y: [0, 100],
      });
      scalarCardLineChartComponent.componentInstance.onLineChartZoom({
        x: [8, 31],
        y: [0, 100],
      });
      scalarCardLineChartComponent.componentInstance.onLineChartZoom(null);

      expect(dispatchedActions).toEqual([
        cardViewBoxChanged({
          userViewBox: {
            x: [9.235, 30.4],
            y: [0, 100],
          },
          cardId: 'card1',
        }),
        cardViewBoxChanged({
          userViewBox: {
            x: [8, 31],
            y: [0, 100],
          },
          cardId: 'card1',
        }),
        cardViewBoxChanged({
          userViewBox: null,
          cardId: 'card1',
        }),
      ]);
    }));
  });

  describe('step selector feature integration', () => {
    describe('fob controls', () => {
      it('does not render fobs by default', fakeAsync(() => {
        const fixture = createComponent();
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.directive(CardFobComponent)).length
        ).toEqual(0);
      }));

      it('renders prospective fob', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.minMaxStep = {
          minStep: 10,
          maxStep: 30,
        };
        fixture.detectChanges();
        const cardFobController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;

        expect(cardFobController).toBeDefined();

        cardFobController.onProspectiveStepChanged.emit(1);
        fixture.detectChanges();

        const prospectiveFob = fixture.debugElement.query(
          By.directive(CardFobComponent)
        ).componentInstance;

        expect(prospectiveFob).toBeDefined();
        expect(cardFobController.prospectiveFobWrapper).toBeDefined();
        expect(cardFobController.prospectiveStep).toEqual(1);
      }));

      it('dispatches timeSelectionChanged actions when fob is added by clicking prospective fob', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 10,
          maxStep: 30,
        };
        fixture.detectChanges();
        const testController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;

        testController.onProspectiveStepChanged.emit(10);
        fixture.detectChanges();

        // One prospective fob
        let fobs = fixture.debugElement.queryAll(
          By.directive(CardFobComponent)
        );

        expect(fobs.length).toEqual(1);

        // Click the prospective fob to set the start time
        testController.prospectiveFobClicked(new MouseEvent('mouseclick'));
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 10},
          end: null,
        };
        store.refreshState();
        fixture.detectChanges();

        // One start fob
        fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));

        expect(fobs.length).toEqual(1);

        fixture.detectChanges();

        // One start fob + 1 prospective fob
        testController.onProspectiveStepChanged.emit(25);
        fixture.detectChanges();

        fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));

        expect(fobs.length).toEqual(2);

        // Click the prospective fob to set the end time
        testController.prospectiveFobClicked(new MouseEvent('mouseclick'));
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 10},
          end: {step: 25},
        };
        store.overrideSelector(
          getMetricsCardRangeSelectionEnabled('card1'),
          true
        );
        store.refreshState();
        fixture.detectChanges();

        // One start fob, one end fob
        fobs = fixture.debugElement.queryAll(By.directive(CardFobComponent));

        expect(fobs.length).toEqual(2);

        expect(dispatchedActions).toEqual([
          timeSelectionChanged({
            timeSelection: {
              start: {step: 10},
              end: null,
            },
            affordance: TimeSelectionAffordance.FOB_ADDED,
            cardId: 'card1',
          }),
          timeSelectionChanged({
            timeSelection: {
              start: {step: 10},
              end: {step: 25},
            },
            affordance: TimeSelectionAffordance.FOB_ADDED,
            cardId: 'card1',
          }),
        ]);
      }));

      it('toggles when single fob is deselected', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 10,
          maxStep: 30,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();
        const fobComponent = fixture.debugElement.query(
          By.directive(CardFobComponent)
        ).componentInstance;

        fobComponent.fobRemoved.emit();

        expect(dispatchedActions).toEqual([
          stepSelectorToggled({
            affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
            cardId: 'card1',
          }),
        ]);
      }));

      it('dispatches timeSelectionChanged actions when fob is dragged while linked time is enabled', fakeAsync(() => {
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 10,
          maxStep: 30,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();
        const testController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;
        const controllerStartPosition =
          testController.root.nativeElement.getBoundingClientRect().left;

        // Simulate dragging fob to step 25.
        testController.startDrag(
          Fob.START,
          TimeSelectionAffordance.FOB,
          new MouseEvent('mouseDown')
        );
        const fakeEvent = new MouseEvent('mousemove', {
          clientX: 25 + controllerStartPosition,
          movementX: 1,
        });
        testController.mouseMove(fakeEvent);

        // Simulate ngrx update from mouseMove;
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 25},
          end: null,
        };
        store.refreshState();
        fixture.detectChanges();

        testController.stopDrag();
        fixture.detectChanges();

        const fobs = fixture.debugElement.queryAll(
          By.directive(CardFobComponent)
        );

        expect(
          fobs[0].query(By.css('span')).nativeElement.textContent.trim()
        ).toEqual('25');
        expect(dispatchedActions).toContain(
          timeSelectionChanged({
            timeSelection: {
              start: {step: 25},
              end: null,
            },
            affordance: TimeSelectionAffordance.FOB,
            cardId: 'card1',
          })
        );

        expect(fixture.componentInstance.stepOrLinkedTimeSelection).toEqual({
          start: {step: 25},
          end: null,
        });
      }));

      it('dispatches timeSelectionChanged actions when fob is dragged while linkedTime is disabled', fakeAsync(() => {
        store.overrideSelector(selectors.getMetricsStepSelectorEnabled, true);
        const fixture = createComponent();
        fixture.componentInstance.cardId = 'card1';
        fixture.componentInstance.minMaxStep = {
          minStep: 10,
          maxStep: 30,
        };
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 20},
          end: null,
        };
        fixture.detectChanges();
        const testController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;
        const controllerStartPosition =
          testController.root.nativeElement.getBoundingClientRect().left;

        // Simulate dragging fob to step 25.
        testController.startDrag(
          Fob.START,
          TimeSelectionAffordance.FOB,
          new MouseEvent('mouseDown')
        );
        const fakeEvent = new MouseEvent('mousemove', {
          clientX: 25 + controllerStartPosition,
          movementX: 1,
        });
        testController.mouseMove(fakeEvent);

        // Simulate ngrx update from mouseMove
        fixture.componentInstance.stepOrLinkedTimeSelection = {
          start: {step: 25},
          end: null,
        };
        store.refreshState();
        fixture.detectChanges();

        testController.stopDrag();
        fixture.detectChanges();

        expect(dispatchedActions).toEqual([
          timeSelectionChanged({
            timeSelection: {
              start: {step: 25},
              end: null,
            },
            cardId: 'card1',
          }),
          timeSelectionChanged({
            timeSelection: {
              start: {step: 25},
              end: null,
            },
            affordance: TimeSelectionAffordance.FOB,
            cardId: 'card1',
          }),
        ]);
      }));
    });
  });

  it('renders userViewBox', fakeAsync(() => {
    store.overrideSelector(selectors.getMetricsCardUserViewBox, {
      x: [0, 1],
      y: [11, 22],
    });
    const fixture = createComponent();
    fixture.detectChanges();
    const lineChartEl = fixture.debugElement.query(Selector.LINE_CHART);

    expect(lineChartEl).toBeTruthy();
    expect(lineChartEl.componentInstance.userViewBox).toEqual({
      x: [0, 1],
      y: [11, 22],
    });
  }));
});
