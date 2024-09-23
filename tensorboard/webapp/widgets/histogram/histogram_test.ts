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
import {
  Component,
  DebugElement,
  Input,
  NO_ERRORS_SCHEMA,
  ViewChild,
} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {CardFobComponent} from '../card_fob/card_fob_component';
import {
  CardFobControllerComponent,
  Fob,
} from '../card_fob/card_fob_controller_component';
import {
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionWithAffordance,
} from '../card_fob/card_fob_types';
import {IntersectionObserverTestingModule} from '../intersection_observer/intersection_observer_testing_module';
import {HistogramCardFobController} from './histogram_card_fob_controller';
import {HistogramComponent, TooltipData} from './histogram_component';
import {
  Bin,
  HistogramData,
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

function buildBin(override: Partial<Bin> = {}): Bin {
  return {
    x: 0,
    dx: 1,
    y: 0,
    ...override,
  };
}

function buildHistogramDatum(
  override: Partial<HistogramDatum> = {}
): HistogramDatum {
  return {
    wallTime: 1000,
    step: 0,
    bins: [...new Array(10)].map(() => buildBin()),
    ...override,
  };
}

// Wrapper component required to properly trigger Angular lifecycles.
// Without it, ngOnChanges do not get triggered before ngOnInit.
@Component({
  standalone: false,
  selector: 'testable-tb-histogram',
  template: `
    <tb-histogram
      #instance
      [mode]="mode"
      [timeProperty]="timeProperty"
      [color]="color"
      [name]="name"
      [data]="data"
      [timeSelection]="timeSelection"
      (onLinkedTimeSelectionChanged)="onLinkedTimeSelectionChanged($event)"
      (onLinkedTimeToggled)="onLinkedTimeToggled()"
    >
    </tb-histogram>
  `,
  styles: [
    `
      tb-histogram {
        height: 100px;
        position: fixed;
        width: 100px;
      }
    `,
  ],
})
class TestableComponent {
  @ViewChild('instance') readonly instance!: HistogramComponent;

  @Input() mode!: HistogramMode;
  @Input() timeProperty!: TimeProperty;
  @Input() color!: string;
  @Input() name!: string;
  @Input() data!: HistogramData;
  @Input() timeSelection!: {
    start: {step: number};
    end: {step: number} | null;
  } | null;
  @Input() onLinkedTimeSelectionChanged!: (
    timeSelection: TimeSelection,
    affordance?: TimeSelectionAffordance
  ) => void;
  @Input() onLinkedTimeToggled!: () => void;

  simulateMouseMove(event: {
    target: SVGElement;
    offsetX: number;
    offsetY: number;
  }): TooltipData | null {
    // Not easy to create a MouseEvent with correct `target` property. Fake it
    // with a type coercion.
    const mouseEvent = event as unknown as MouseEvent;
    this.instance.onMouseMoveForTestOnly(mouseEvent);
    return this.instance.tooltipData;
  }
}

describe('histogram test', () => {
  const byCss = {
    X_AXIS: By.css('.x-axis'),
    Y_AXIS: By.css('.y-axis'),
    HISTOGRAMS: By.css('.histograms'),
    HISTOGRAM: By.css('.histogram'),
    CARD_FOB: By.css('.axis .linked-time'),
  };
  let intersectionObserver: IntersectionObserverTestingModule;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, IntersectionObserverTestingModule],
      declarations: [
        HistogramComponent,
        HistogramCardFobController,
        CardFobComponent,
        CardFobControllerComponent,
        TestableComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(
    name: string,
    data: HistogramData
  ): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.name = name;
    fixture.componentInstance.data = data;
    fixture.componentInstance.mode = HistogramMode.OFFSET;
    fixture.componentInstance.timeProperty = TimeProperty.STEP;
    fixture.componentInstance.color = '#fff';
    intersectionObserver = TestBed.inject(IntersectionObserverTestingModule);
    return fixture;
  }

  function getAxisLabelText(axis: DebugElement): string[] {
    const elements = axis.nativeElement.querySelectorAll(
      'text'
    ) as SVGTextElement[];
    return Array.from(elements).map((el) => el.textContent ?? '');
  }

  describe('x axis render', () => {
    it('does not render until component becomes visible', () => {
      const fixture = createComponent('foo', [buildHistogramDatum({})]);
      fixture.componentInstance.mode = HistogramMode.OFFSET;
      fixture.componentInstance.timeProperty = TimeProperty.STEP;
      fixture.detectChanges();

      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual([]);

      intersectionObserver.simulateVisibilityChange(fixture, false);
      fixture.detectChanges();
      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual([]);
    });

    it('renders min and max of bins in scalar', () => {
      const fixture = createComponent('foo', [
        buildHistogramDatum({
          step: 0,
          bins: [buildBin({x: 1, dx: 5})],
        }),
        buildHistogramDatum({
          step: 1,
          bins: [buildBin({x: 0, dx: 100})],
        }),
        buildHistogramDatum({
          step: 100,
          bins: [buildBin({x: -100, dx: 5})],
        }),
      ]);
      fixture.componentInstance.mode = HistogramMode.OFFSET;
      fixture.componentInstance.timeProperty = TimeProperty.STEP;
      fixture.detectChanges();
      intersectionObserver.simulateVisibilityChange(fixture, true);

      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual(['-100', '0', '100']);
    });

    it('updates axis only when chart is visible', () => {
      const fixture = createComponent('foo', [
        buildHistogramDatum({
          step: 0,
          bins: [buildBin({x: 1, dx: 5})],
        }),
        buildHistogramDatum({
          step: 1,
          bins: [buildBin({x: 0, dx: 100})],
        }),
        buildHistogramDatum({
          step: 100,
          bins: [buildBin({x: -100, dx: 5})],
        }),
      ]);
      fixture.componentInstance.mode = HistogramMode.OFFSET;
      fixture.componentInstance.timeProperty = TimeProperty.STEP;
      fixture.detectChanges();
      intersectionObserver.simulateVisibilityChange(fixture, true);
      const beforeAxisLabels = getAxisLabelText(
        fixture.debugElement.query(byCss.X_AXIS)
      );
      fixture.detectChanges();

      intersectionObserver.simulateVisibilityChange(fixture, false);
      fixture.detectChanges();

      fixture.componentInstance.data = [
        buildHistogramDatum({
          step: 0,
          bins: [buildBin({x: 1, dx: 5})],
        }),
        buildHistogramDatum({
          step: 1,
          bins: [buildBin({x: 0, dx: 100})],
        }),
      ];
      fixture.detectChanges();
      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual(beforeAxisLabels);

      intersectionObserver.simulateVisibilityChange(fixture, true);
      fixture.detectChanges();

      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual(['0', '50', '100']);
    });
  });

  describe('y axis render', () => {
    it('does not render until component becomes visible', () => {
      const fixture = createComponent('foo', [buildHistogramDatum({})]);
      fixture.componentInstance.mode = HistogramMode.OFFSET;
      fixture.componentInstance.timeProperty = TimeProperty.STEP;
      fixture.detectChanges();

      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
      ).toEqual([]);

      intersectionObserver.simulateVisibilityChange(fixture, false);
      fixture.detectChanges();
      expect(
        getAxisLabelText(fixture.debugElement.query(byCss.X_AXIS))
      ).toEqual([]);
    });

    describe('offset mode', () => {
      it('renders min and max of step in STEP mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
          }),
          buildHistogramDatum({
            step: 1,
          }),
          buildHistogramDatum({
            step: 100,
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0', '20', '40', '60', '80', '100']);
      });

      it('cannot have fractional steps in STEP mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
          }),
          buildHistogramDatum({
            step: 1,
          }),
          buildHistogramDatum({
            step: 2,
          }),
          buildHistogramDatum({
            step: 3,
          }),
          buildHistogramDatum({
            step: 4,
          }),
          buildHistogramDatum({
            step: 5,
          }),
          buildHistogramDatum({
            step: 6,
          }),
          buildHistogramDatum({
            step: 7,
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0', '2', '4', '6']);
      });

      it('renders wallTime in WALL_TIME mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            wallTime: new Date('2000-1-1').getTime(),
          }),
          buildHistogramDatum({
            step: 1,
            wallTime: new Date('2000-2-1').getTime(),
          }),
          buildHistogramDatum({
            step: 100,
            wallTime: new Date('2000-3-1').getTime(),
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual([
          '01/01 12:00:00 AM',
          '02/01 12:00:00 AM',
          '03/01 12:00:00 AM',
        ]);
      });

      it('renders relative time from first data in RELATIVE mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            wallTime: new Date('2000-1-1').getTime(),
          }),
          buildHistogramDatum({
            step: 1,
            wallTime: new Date('2000-2-1').getTime(),
          }),
          buildHistogramDatum({
            step: 100,
            wallTime: new Date('2000-3-1').getTime(),
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.RELATIVE;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0h', '600h', '1000h']);
      });
    });

    describe('overlay mode', () => {
      it('renders bin count in scalar value from 0 to max regardless of timeProp', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [buildBin({y: 10}), buildBin({y: 5})],
          }),
          buildHistogramDatum({
            step: 1,
            bins: [buildBin({y: 10}), buildBin({y: 100})],
          }),
          buildHistogramDatum({
            step: 100,
            bins: [buildBin({y: 1337})],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getAxisLabelText(fixture.debugElement.query(byCss.Y_AXIS))
        ).toEqual(['0.00', '500', '1.00e+3']);
      });
    });
  });

  describe('histogram render', () => {
    function getGroupTransforms(element: DebugElement): string[] {
      const transforms: string[] = [];
      for (const debugEl of element.queryAll(By.css('.histogram'))) {
        transforms.push(debugEl.styles['transform']!);
      }
      return transforms;
    }

    function getHistogramPaths(element: DebugElement): string[] {
      const pathD: string[] = [];
      for (const debugEl of element.queryAll(By.css('path'))) {
        pathD.push(debugEl.attributes['d']!);
      }
      return pathD;
    }

    describe('offset mode', () => {
      it('positions group by their position in temporal axis', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0}),
          buildHistogramDatum({step: 5}),
          buildHistogramDatum({step: 10}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual([
          // The content box is 30x50 pixels and because we need to render 2.5D
          // on 2D screen, we give height / 2.5 space for histogram slices to
          // render. 50 / 2.5 = 20 so effectively, step=0 is rendered at 20px
          // from the top.
          'translate(0px, 20px)',
          'translate(0px, 35px)',
          'translate(0px, 50px)',
        ]);
      });

      it('moves the group position depending on the timeProperty', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: -200}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();
        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual([
          'translate(0px, 35px)',
          'translate(0px, 20px)',
          'translate(0px, 50px)',
        ]);

        fixture.componentInstance.timeProperty = TimeProperty.RELATIVE;
        fixture.detectChanges();
        // Even the RELATIVE time property takes minimum relative value to the
        // max (-300, 300) which has the same spacing as the WALL_TIME.
        expect(
          getGroupTransforms(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual([
          'translate(0px, 35px)',
          'translate(0px, 20px)',
          'translate(0px, 50px)',
        ]);
      });

      it('renders histogram in the "count" coordinate system', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [
              buildBin({x: 0, dx: 10, y: 5}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(
          getHistogramPaths(fixture.debugElement.query(byCss.HISTOGRAMS))
          // Do note that the histogram is rendered in 30x50 pixel box with
          // 20 pixel max height for each histogram. So, with max_y = 100,
          // y=0 is rendered at 0 while y=100 is rendered at -20.
          // Since max_x - min_x = 30, which is equal to that of width of the
          // element, we have x coordinate equal to pixel coordinate.
          //
          // M5,0: Starts from <center of first bin=5, pixel(0)>
          // L5,-1: Line to <center of first bin=5, pixel(y_0)>
          // L15,-2: Line to <pixel(15), pixel(y_1)>
          // L25,-20: Line to <pixel(25), pixel(y_2)>
          // L25,0: Last line back down to 0. <pixel(25), pixel(0)>
        ).toEqual(['M5,0L5,-1L15,-2L25,-20L25,0']);
      });
    });

    describe('overlay mode', () => {
      it('renders histogram in the "count" coordinate system', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({
            step: 0,
            bins: [
              buildBin({x: 0, dx: 10, y: 5}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
        ]);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        // Again, rendered in 30x50 box and histogram now spans 50px high!
        // Do note that, unlike offset, <0, 0> starts from top-left corner so
        // <0, 50> is the bottom.
        expect(
          getHistogramPaths(fixture.debugElement.query(byCss.HISTOGRAMS))
        ).toEqual(['M5,50L5,47.5L15,45L25,0L25,50']);
      });
    });
  });

  describe('tooltip', () => {
    function simulateMouseMove(
      fixture: ComponentFixture<TestableComponent>,
      histogramIndex: number,
      x: number,
      y: number
    ): TooltipData | null {
      const histogramEls = fixture.debugElement.queryAll(byCss.HISTOGRAM);
      const element = histogramEls[histogramIndex].nativeElement as SVGGElement;

      return fixture.componentInstance.simulateMouseMove({
        target: element,
        offsetX: x,
        offsetY: y,
      });
    }

    function buildTooltipData(
      override: Partial<TooltipData>
    ): jasmine.Expected<TooltipData> {
      return {
        xPositionInBinCoord: jasmine.any(Number),
        closestDatum: jasmine.any(Object),
        closestBin: jasmine.any(Object),
        xAxis: jasmine.any(Object),
        yAxis: jasmine.any(Object),
        value: jasmine.any(Object),
        ...override,
      };
    }

    describe('offset mode', () => {
      it('sets correct closestDatum and closestBin', () => {
        const data = [
          buildHistogramDatum({
            step: 1,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 7}),
              buildBin({x: 20, dx: 10, y: 7}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 1, 5, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            xPositionInBinCoord: 5,
            closestDatum: data[1],
            closestBin: buildBin({x: 0, dx: 10, y: 7}),
          })
        );
      });

      it('shows bin centroid value on xAxis', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 3000,
            bins: [
              buildBin({x: 0, dx: 10, y: 3}),
              buildBin({x: 20, dx: 10, y: 3}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 1, 20, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            xAxis: {
              position: 25,
              label: '25',
            },
          })
        );
      });

      it('shows step value on yAxis for TimeProperty.STEP', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 3000,
            bins: [
              buildBin({x: 0, dx: 10, y: 3}),
              buildBin({x: 20, dx: 10, y: 3}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 1, 20, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            yAxis: {
              position: 0,
              label: '3000',
            },
          })
        );
      });

      it('shows wallTime on yAxis for TimeProperty.WALL_TIME', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            wallTime: new Date('2020-01-01 12:00:01 PM').getTime(),
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 0, 5, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            yAxis: {
              position: 0,
              label: '01/01 12:00:01 PM',
            },
          })
        );
      });

      it('shows relative time on yAxis for TimeProperty.RELATIVE', () => {
        const data = [
          buildHistogramDatum({
            step: 1,
            wallTime: new Date('2020-01-01').getTime(),
            bins: [buildBin({x: 0, dx: 10, y: 100})],
          }),
          buildHistogramDatum({
            step: 2,
            wallTime: new Date('2020-01-02').getTime(),
            bins: [buildBin({x: 0, dx: 10, y: 100})],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.RELATIVE;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 1, 5, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            yAxis: {
              position: 0,
              // This should print 24h but d3.format from Polymer based
              // histogram drops `4` for some reason.
              label: '20h',
            },
          })
        );
      });

      it('shows count value on value tooltip', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 3000,
            bins: [
              buildBin({x: 0, dx: 10, y: 3}),
              buildBin({x: 20, dx: 10, y: 3}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 0, 20, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            value: {
              position: {x: 20, y: 10},
              label: '100',
            },
          })
        );
      });
    });

    describe('overlay mode', () => {
      it('shows bin centroid value in xAxis', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 10}),
              buildBin({x: 20, dx: 5, y: 0}),
              buildBin({x: 25, dx: 5, y: 0}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 0, 20, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            xAxis: {
              position: 22.5,
              label: '22.5',
            },
          })
        );
      });

      it('shows count value in yAxis', () => {
        const data = [
          buildHistogramDatum({
            step: 1,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 0}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 1, 5, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            yAxis: {
              position: 45,
              label: '10',
            },
          })
        );
      });

      it('shows step count in value', () => {
        const data = [
          buildHistogramDatum({
            step: 1337,
            bins: [
              buildBin({x: 0, dx: 10, y: 100}),
              buildBin({x: 10, dx: 10, y: 10}),
              buildBin({x: 20, dx: 10, y: 100}),
            ],
          }),
          buildHistogramDatum({
            step: 3000,
            bins: [
              buildBin({x: 0, dx: 10, y: 3}),
              buildBin({x: 20, dx: 10, y: 3}),
            ],
          }),
        ];

        const fixture = createComponent('foo', data);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const tooltipData = simulateMouseMove(fixture, 0, 20, 10);

        expect(tooltipData).toEqual(
          buildTooltipData({
            value: {
              position: {x: 20, y: 10},
              label: 'Step: 1337',
            },
          })
        );
      });
    });
  });

  describe('linked time feature integration', () => {
    function doHistogramsHaveColor(
      fixture: ComponentFixture<TestableComponent>
    ): boolean[] {
      const histograms = fixture.debugElement.queryAll(byCss.HISTOGRAM);
      return histograms.map((el) => !el.classes['no-color']);
    }

    describe('feature disable', () => {
      it('does not show fob when in overlay modes', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: -200}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OVERLAY;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const controls = fixture.debugElement.queryAll(byCss.CARD_FOB);
        expect(controls.length).toBe(0);
      });

      it('does not show fob when in wall time timeProperty mode', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: -200}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.WALL_TIME;
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const controls = fixture.debugElement.queryAll(byCss.CARD_FOB);
        expect(controls.length).toBe(0);
      });
    });

    describe('single step', () => {
      it('puts color on histogram that has the matching step', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, false]);

        fixture.componentInstance.timeSelection = {start: {step: 7}, end: null};
        fixture.detectChanges();
        expect(doHistogramsHaveColor(fixture)).toEqual([false, false, false]);
      });

      it('puts color on histogram that mouse hovers over', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const firstHistogram = fixture.debugElement.queryAll(
          By.css('g.histogram')
        )[0];

        firstHistogram.triggerEventHandler('mouseenter', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1 is hightlight on selected step;  stepIndex 0 is hightlight on
        // mouse hovering.
        expect(doHistogramsHaveColor(fixture)).toEqual([true, true, false]);

        firstHistogram.triggerEventHandler('mouseleave', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1 is hightlight on selected step;  stepIndex 0 is not hightlight
        // because the mouse has left.
        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, false]);
      });

      it('does not affect colored histogram on linked time disabled', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = null;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const firstHistogram = fixture.debugElement.queryAll(
          By.css('g.histogram')
        )[0];

        firstHistogram.triggerEventHandler('mouseenter', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // All histograms are colored.
        expect(doHistogramsHaveColor(fixture)).toEqual([true, true, true]);

        firstHistogram.triggerEventHandler('mouseleave', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // All histograms are colored.
        expect(doHistogramsHaveColor(fixture)).toEqual([true, true, true]);
      });
    });

    describe('multi step', () => {
      it('puts color on histogram that is in the range (inclusive)', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 10},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, true]);

        fixture.componentInstance.timeSelection = {
          start: {step: 0},
          end: {step: 7},
        };
        fixture.detectChanges();
        expect(doHistogramsHaveColor(fixture)).toEqual([true, true, false]);

        fixture.componentInstance.timeSelection = {
          start: {step: 6},
          end: {step: 7},
        };
        fixture.detectChanges();
        expect(doHistogramsHaveColor(fixture)).toEqual([false, false, false]);
      });

      it('puts color on none-ranged histogram when mouse hovers over', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 10},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const firstHistogram = fixture.debugElement.queryAll(
          By.css('g.histogram')
        )[0];

        firstHistogram.triggerEventHandler('mouseenter', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1,2 are hightlight because of selected range; stepIndex 0 is hightlight on
        // mouse hovering.
        expect(doHistogramsHaveColor(fixture)).toEqual([true, true, true]);

        firstHistogram.triggerEventHandler('mouseleave', {
          target: firstHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1,2 are hightlight because of selected range; stepIndex 0 is not hightlight
        // because the mouse has left.
        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, true]);
      });

      it('does not update color on ranged histogram when mouse hovers over', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 10},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const inRangeHistogram = fixture.debugElement.queryAll(
          By.css('g.histogram')
        )[1];

        inRangeHistogram.triggerEventHandler('mouseenter', {
          target: inRangeHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1,2 are hightlight because of selected range;
        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, true]);

        inRangeHistogram.triggerEventHandler('mouseleave', {
          target: inRangeHistogram.nativeElement,
        });
        fixture.detectChanges();
        // StepIndex 1,2 are hightlight because of selected range;
        expect(doHistogramsHaveColor(fixture)).toEqual([false, true, true]);
      });
    });

    describe('multi step range updated on click', () => {
      let onLinkedTimeSelectionChangedSpy: jasmine.Spy;
      function createHistogramComponent() {
        onLinkedTimeSelectionChangedSpy = jasmine.createSpy();
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
          buildHistogramDatum({step: 20, wallTime: 400}),
        ]);
        fixture.componentInstance.mode = HistogramMode.OFFSET;
        fixture.componentInstance.timeProperty = TimeProperty.STEP;
        fixture.componentInstance.onLinkedTimeSelectionChanged =
          onLinkedTimeSelectionChangedSpy;

        return fixture;
      }

      it('triggers select time action from single step to multi step', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[3].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 5},
            end: {step: 20},
          },
          affordance: TimeSelectionAffordance.HISTOGRAM_CLICK_TO_RANGE,
        });
      });

      it('triggers select time action when clicked step is smaller than selected step', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {start: {step: 5}, end: null};
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[0].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 0},
            end: {step: 5},
          },
          affordance: TimeSelectionAffordance.HISTOGRAM_CLICK_TO_RANGE,
        });
      });

      it('triggers select time action when clicked step is smaller than start step', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 10},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[0].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 0},
            end: {step: 10},
          },
          affordance: TimeSelectionAffordance.HISTOGRAM_CLICK_TO_RANGE,
        });
      });

      it('triggers select time action when clicked step is larger than end step', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 10},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[3].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 5},
            end: {step: 20},
          },
          affordance: TimeSelectionAffordance.HISTOGRAM_CLICK_TO_RANGE,
        });
      });

      it('does not trigger select time action when clicked step is within range', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: {step: 20},
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[2].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).not.toHaveBeenCalled();
      });

      it('does not trigger select time action when clicked step is same as start step', () => {
        const fixture = createHistogramComponent();
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: null,
        };
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const histograms = fixture.debugElement.queryAll(By.css('g.histogram'));

        histograms[1].triggerEventHandler('click', null);
        fixture.detectChanges();
        expect(onLinkedTimeSelectionChangedSpy).not.toHaveBeenCalled();
      });
    });

    describe('fob control', () => {
      it('toggles linked time when deselect fob in single selection', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
        ]);
        const onLinkedTimeToggledSpy = jasmine.createSpy();
        fixture.componentInstance.timeSelection = {
          start: {step: 5},
          end: null,
        };
        fixture.componentInstance.onLinkedTimeToggled = onLinkedTimeToggledSpy;
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);

        const fobComponent = fixture.debugElement.query(
          By.directive(CardFobComponent)
        ).componentInstance;
        fobComponent.fobRemoved.emit();

        expect(onLinkedTimeToggledSpy).toHaveBeenCalledOnceWith();
      });

      it('emits linked time change event when fob is dragged in single selection', () => {
        const fixture = createComponent('foo', [
          buildHistogramDatum({step: 0, wallTime: 100}),
          buildHistogramDatum({step: 5, wallTime: 400}),
          buildHistogramDatum({step: 10, wallTime: 400}),
          buildHistogramDatum({step: 40, wallTime: 400}),
        ]);
        const onLinkedTimeSelectionChangedSpy = jasmine.createSpy();
        fixture.componentInstance.timeSelection = {
          start: {step: 0},
          end: null,
        };
        fixture.componentInstance.onLinkedTimeSelectionChanged =
          onLinkedTimeSelectionChangedSpy;
        onLinkedTimeSelectionChangedSpy.and.callFake(
          (timeSelectionWithAffordance: TimeSelectionWithAffordance) => {
            fixture.componentInstance.timeSelection =
              timeSelectionWithAffordance.timeSelection;
          }
        );
        fixture.detectChanges();
        intersectionObserver.simulateVisibilityChange(fixture, true);
        const testController = fixture.debugElement.query(
          By.directive(CardFobControllerComponent)
        ).componentInstance;
        const fobStartPosition = testController.root.nativeElement
          .querySelector('.time-fob-wrapper')
          .getBoundingClientRect().top;

        // Simulate dragging fob to step 10.
        testController.startDrag(
          Fob.START,
          TimeSelectionAffordance.FOB,
          new MouseEvent('mouseDown')
        );
        const fakeEvent = new MouseEvent('mousemove', {
          clientY: 5 + fobStartPosition, // Add the difference between step 5 and 10, which is equal to 5.
          movementY: 1,
        });
        testController.mouseMove(fakeEvent);
        fixture.detectChanges();
        testController.stopDrag();
        fixture.detectChanges();

        // Event emitted from mouseMove
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 10},
            end: null,
          },
        });
        // Event emitted from stopDrag
        expect(onLinkedTimeSelectionChangedSpy).toHaveBeenCalledWith({
          timeSelection: {
            start: {step: 10},
            end: null,
          },
          affordance: TimeSelectionAffordance.FOB,
        });
      });
    });
  });
});
