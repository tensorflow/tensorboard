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
import {OverlayContainer, OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {
  DataSeries,
  DataSeriesMetadataMap,
  Dimension,
  Extent,
  InteractionState,
  Scale,
  ScaleType,
} from '../lib/public_types';
import {createScale} from '../lib/scale';
import {buildMetadata, createSeries} from '../lib/testing';
import {MouseEventButtons} from './internal_types';
import {LineChartInteractiveViewComponent} from './line_chart_interactive_view';
import {createPartialMouseEvent} from './testing';

interface Coord {
  x: number;
  y: number;
}

@Component({
  standalone: false,
  selector: 'testable-comp',
  template: `
    <line-chart-interactive-view
      [seriesData]="seriesData"
      [seriesMetadataMap]="seriesMetadataMap"
      [viewExtent]="viewExtent"
      [xScale]="xScale"
      [yScale]="yScale"
      [domDim]="domDim"
      [tooltipOriginEl]="tooltipOrigin"
      [disableTooltip]="disableTooltip"
      (onViewExtentChange)="onViewExtentChange($event)"
      (onViewExtentReset)="onViewExtentReset()"
      (onInteractionStateChange)="onInteractionStateChange($event)"
    ></line-chart-interactive-view>
    <div #tooltipOrigin="cdkOverlayOrigin" cdkOverlayOrigin>origin</div>
  `,
  styles: [
    `
      :host {
        left: 0;
        position: fixed;
        top: 0;
      }
    `,
  ],
})
class TestableComponent {
  @Input()
  seriesData!: DataSeries[];

  @Input()
  seriesMetadataMap!: DataSeriesMetadataMap;

  @Input()
  viewExtent!: Extent;

  @Input()
  xScale!: Scale;

  @Input()
  yScale!: Scale;

  @Input()
  domDim!: Dimension;

  @Input()
  disableTooltip: boolean = false;

  @Input()
  onViewExtentChange!: (extent: Extent) => void;

  @Input()
  onViewExtentReset!: () => void;

  onInteractionStateChange(interactiveState: InteractionState) {}
}

describe('line_chart_v2/sub_view/interactive_view test', () => {
  let overlayContainer: OverlayContainer;
  let onViewExtentChange: jasmine.Spy;
  let onViewExtentReset: jasmine.Spy;
  let onInteractionStateChange: jasmine.Spy;

  const Selector = {
    TOOLTIP_ROW_CIRCLE: '.tooltip-row-circle',
    TOOLTIP_NON_CIRCLE_COLUMN: 'td:not(.tooltip-row-circle)',
  };
  const ByCss = {
    SVG: By.css('svg'),
    SVG_PANNING: By.css('svg.panning'),
    SVG_DRAGGING: By.css('svg.dragging'),
  };

  function createComponent(): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.xScale = createScale(ScaleType.LINEAR);
    fixture.componentInstance.yScale = createScale(ScaleType.LINEAR);
    fixture.componentInstance.seriesData = [
      createSeries('foo', (index: number) => index),
      createSeries('bar', (index: number) => index),
    ];
    fixture.componentInstance.seriesMetadataMap = {
      foo: buildMetadata({id: 'foo', displayName: 'Foo'}),
      bar: buildMetadata({id: 'bar', displayName: 'Bar name'}),
    };
    fixture.componentInstance.viewExtent = {x: [0, 10], y: [0, 10]};
    fixture.componentInstance.domDim = {width: 500, height: 200};

    fixture.componentInstance.onViewExtentChange = onViewExtentChange;
    fixture.componentInstance.onViewExtentReset = onViewExtentReset;
    fixture.componentInstance.onInteractionStateChange =
      onInteractionStateChange;

    return fixture;
  }

  function emitEvent(
    fixture: ComponentFixture<TestableComponent>,
    eventName: 'wheel',
    eventInit: WheelEventInit
  ): void;
  function emitEvent(
    fixture: ComponentFixture<TestableComponent>,
    eventName:
      | 'mousedown'
      | 'mouseup'
      | 'mousemove'
      | 'mouseenter'
      | 'mouseleave'
      | 'dblclick',
    eventInit: MouseEventInit
  ): void;
  function emitEvent(
    fixture: ComponentFixture<TestableComponent>,
    eventName: string,
    eventInit: MouseEventInit | WheelEvent
  ) {
    const dom = fixture.debugElement.query(ByCss.SVG)
      .nativeElement as SVGElement;
    const event =
      eventName === 'wheel'
        ? new WheelEvent(eventName, {relatedTarget: dom, ...eventInit})
        : new MouseEvent(eventName, {relatedTarget: dom, ...eventInit});
    dom.dispatchEvent(event);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LineChartInteractiveViewComponent, TestableComponent],
      imports: [CommonModule, OverlayModule],
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);

    onViewExtentChange = jasmine.createSpy();
    onViewExtentReset = jasmine.createSpy();
    onInteractionStateChange = jasmine.createSpy();
  });

  describe('tooltips', () => {
    it('shows tooltip when moving mouse inside the container', () => {
      const fixture = createComponent();
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(1);
    });

    it('renders display name and information about the series close to cursor', () => {
      const fixture = createComponent();
      fixture.componentInstance.seriesData = [
        createSeries('foo', (index: number) => index),
        createSeries('bar', (index: number) => index * 2),
      ];
      fixture.componentInstance.seriesMetadataMap = {
        foo: buildMetadata({id: 'foo', displayName: 'Foo', color: '#f00'}),
        bar: buildMetadata({id: 'bar', displayName: 'Bar name', color: '#00f'}),
      };
      fixture.componentInstance.domDim = {width: 500, height: 200};
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 250, clientY: 10});
      fixture.detectChanges();

      const [foo, bar] = overlayContainer
        .getContainerElement()
        .querySelectorAll('tbody tr');

      expect(
        (
          foo.querySelector(
            `${Selector.TOOLTIP_ROW_CIRCLE} span`
          ) as HTMLSpanElement
        ).style.backgroundColor
      ).toBe('rgb(255, 0, 0)');
      expect(
        (
          bar.querySelector(
            `${Selector.TOOLTIP_ROW_CIRCLE} span`
          ) as HTMLSpanElement
        ).style.backgroundColor
      ).toBe('rgb(0, 0, 255)');

      // In the <500, 200> sized DOM, the cursor is right in the middle (in x dim) at
      // <250, 10>. The middle data point should be rendered in the tooltip.
      expect(
        [...foo.querySelectorAll(Selector.TOOLTIP_NON_CIRCLE_COLUMN)].map(
          (td) => td.textContent
        )
      ).toEqual(['Foo', '5', '5']);
      expect(
        [...bar.querySelectorAll(Selector.TOOLTIP_NON_CIRCLE_COLUMN)].map(
          (td) => td.textContent
        )
      ).toEqual(['Bar name', '10', '5']);
    });

    it('omits not visible series', () => {
      const fixture = createComponent();
      fixture.componentInstance.seriesData = [
        createSeries('foo', (index: number) => index),
        createSeries('bar', (index: number) => index),
      ];
      fixture.componentInstance.seriesMetadataMap = {
        foo: buildMetadata({id: 'foo', displayName: 'Foo', visible: false}),
        bar: buildMetadata({id: 'bar', displayName: 'Bar name', visible: true}),
      };
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      const rows = overlayContainer
        .getContainerElement()
        .querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].querySelector('.name')!.textContent).toBe('Bar name');
    });

    it('does not render tooltip when nothing is visible', () => {
      const fixture = createComponent();
      fixture.componentInstance.seriesData = [
        createSeries('foo', (index: number) => index),
      ];
      fixture.componentInstance.seriesMetadataMap = {
        foo: buildMetadata({id: 'foo', displayName: 'Foo', visible: false}),
      };
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);
    });

    it('does not render tooltip when disableTooltip is true', () => {
      const fixture = createComponent();
      fixture.componentInstance.disableTooltip = true;
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);
    });

    it('omits data series that does not have the metadata or series', () => {
      const fixture = createComponent();
      fixture.componentInstance.seriesData = [
        createSeries('foo', (index: number) => index),
      ];
      fixture.componentInstance.seriesMetadataMap = {
        bar: buildMetadata({id: 'bar', displayName: 'Bar'}),
      };
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);
    });

    it('hides tooltip when mouse leaves the DOM', () => {
      const fixture = createComponent();
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {clientX: 10, clientY: 10});
      fixture.detectChanges();

      emitEvent(fixture, 'mouseleave', {clientX: 0, clientY: 10});
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);
    });
  });

  describe('drag zoom', () => {
    function emulateDrag(
      fixture: ComponentFixture<TestableComponent>,
      startCoord: Coord,
      endCoord: Coord
    ) {
      emitEvent(fixture, 'mouseenter', {
        clientX: startCoord.x,
        clientY: startCoord.y,
      });
      emitEvent(fixture, 'mousedown', {
        clientX: startCoord.x,
        clientY: startCoord.y,
      });
      emitEvent(fixture, 'mousemove', {
        clientX: endCoord.x,
        clientY: endCoord.y,
      });
      emitEvent(fixture, 'mouseup', {clientX: endCoord.x, clientY: endCoord.y});
    }

    it('zooms when dragging to zoom', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      emulateDrag(fixture, {x: 10, y: 10}, {x: 100, y: 100});
      expect(onViewExtentChange).toHaveBeenCalledOnceWith({
        dataExtent: {
          x: [110, 200],
          y: [500, 950],
        },
      });
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.DRAG_ZOOMING],
        [InteractionState.NONE],
      ]);
    });

    it('hides tooltip when dragging to zoom', () => {
      const fixture = createComponent();
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {
        clientX: 10,
        clientY: 20,
      });
      emitEvent(fixture, 'mousedown', {
        clientX: 10,
        clientY: 20,
      });
      emitEvent(fixture, 'mousemove', {
        clientX: 20,
        clientY: 20,
      });
      fixture.detectChanges();

      expect(overlayContainer.getContainerElement().childElementCount).toBe(0);
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.DRAG_ZOOMING],
      ]);
    });

    it('does not trigger drag zoom for right clicks', () => {
      const fixture = createComponent();
      fixture.detectChanges();

      emitEvent(fixture, 'mouseenter', {
        clientX: 10,
        clientY: 20,
        ...createPartialMouseEvent([MouseEventButtons.RIGHT]),
      });
      emitEvent(fixture, 'mousedown', {
        clientX: 10,
        clientY: 20,
        ...createPartialMouseEvent([MouseEventButtons.RIGHT]),
      });
      emitEvent(fixture, 'mousemove', {
        clientX: 20,
        clientY: 20,
        ...createPartialMouseEvent([MouseEventButtons.RIGHT]),
      });
      fixture.detectChanges();

      expect(onViewExtentChange).not.toHaveBeenCalled();
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.DRAG_ZOOMING],
      ]);
    });

    it('sets class, `dragging`, on svg while drag zooming', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      emitEvent(fixture, 'mousedown', {
        clientX: 10,
        clientY: 20,
      });
      expect(fixture.debugElement.query(ByCss.SVG_DRAGGING)).toBeDefined();
      emitEvent(fixture, 'mousemove', {
        movementX: 20,
        movementY: 20,
      });
      expect(fixture.debugElement.query(ByCss.SVG_DRAGGING)).toBeDefined();
      emitEvent(fixture, 'mouseup', {
        clientX: 20,
        clientY: 20,
      });
      expect(fixture.debugElement.query(ByCss.SVG_DRAGGING)).toBeNull();
    });
  });

  describe('zoom reset', () => {
    it('emits reset event when user double clicks', () => {
      const fixture = createComponent();
      fixture.detectChanges();

      emitEvent(fixture, 'dblclick', {});
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.NONE],
      ]);
    });
  });

  describe('pan', () => {
    const specs = [
      {
        name: 'pans when drags mouse with shiftKey down',
        eventInit: {shiftKey: true},
      },
      {
        name: 'pans when drags mouse with altKey down',
        eventInit: {altKey: true},
      },
      {
        name: 'pans when drags mouse with middle button down',
        eventInit: {button: 1, buttons: 4},
      },
    ];

    for (const {name, eventInit} of specs) {
      it(name, () => {
        const fixture = createComponent();
        fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
        fixture.componentInstance.domDim = {width: 100, height: 200};
        fixture.detectChanges();

        emitEvent(fixture, 'mousedown', {
          clientX: 20,
          clientY: 0,
          ...createPartialMouseEvent([MouseEventButtons.LEFT]),
          ...eventInit,
        });
        emitEvent(fixture, 'mousemove', {
          movementX: 20,
          movementY: -5,
          ...createPartialMouseEvent([MouseEventButtons.LEFT]),
          ...eventInit,
        });

        expect(onViewExtentChange).toHaveBeenCalledTimes(1);
        expect(onViewExtentChange).toHaveBeenCalledWith({
          dataExtent: {
            x: [80, 180],
            y: [-25, 975],
          },
        });
      });
    }

    it('does not pan when both left and middle buttons are pressed', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      emitEvent(fixture, 'mousedown', {
        clientX: 20,
        clientY: 0,
        ...createPartialMouseEvent([
          MouseEventButtons.MIDDLE,
          MouseEventButtons.LEFT,
        ]),
      });
      emitEvent(fixture, 'mousemove', {
        movementX: 20,
        movementY: -5,
        ...createPartialMouseEvent([
          MouseEventButtons.MIDDLE,
          MouseEventButtons.LEFT,
        ]),
      });

      expect(onViewExtentChange).not.toHaveBeenCalled();
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.DRAG_ZOOMING],
      ]);
    });

    it('changes mode when left button is clicked while panning', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      emitEvent(fixture, 'mousedown', {
        clientX: 20,
        clientY: 0,
        button: 1,
        buttons: 4,
      });
      emitEvent(fixture, 'mousemove', {
        movementX: 20,
        movementY: -5,
        button: 1,
        buttons: 4,
      });
      emitEvent(fixture, 'mousedown', {
        clientX: 20,
        clientY: 0,
        button: 0,
        buttons: 5,
      });
      emitEvent(fixture, 'mousemove', {
        movementX: 0,
        movementY: -10,
        button: 0,
        buttons: 5,
      });

      expect(onViewExtentChange).toHaveBeenCalledTimes(1);
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.PANNING],
        [InteractionState.DRAG_ZOOMING],
      ]);
    });

    it('does not pan when clicking middle button while drag zooming', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      emitEvent(fixture, 'mousedown', {
        clientX: 20,
        clientY: 0,
        button: 0,
        buttons: 1,
      });
      emitEvent(fixture, 'mousemove', {
        movementX: 20,
        movementY: -5,
        button: 0,
        buttons: 1,
      });
      emitEvent(fixture, 'mousedown', {
        clientX: 0,
        clientY: -5,
        button: 1,
        buttons: 5,
      });
      emitEvent(fixture, 'mousemove', {
        movementX: 0,
        movementY: -1,
        button: 1,
        buttons: 5,
      });

      expect(onViewExtentChange).not.toHaveBeenCalled();
      expect(onInteractionStateChange.calls.allArgs()).toEqual([
        [InteractionState.NONE],
        [InteractionState.DRAG_ZOOMING],
      ]);
    });

    it('sets class, `panning`, on svg while panning', () => {
      const fixture = createComponent();
      fixture.componentInstance.viewExtent = {x: [100, 200], y: [0, 1000]};
      fixture.componentInstance.domDim = {width: 100, height: 200};
      fixture.detectChanges();

      expect(fixture.debugElement.query(ByCss.SVG_PANNING)).toBeNull();
      emitEvent(fixture, 'mousedown', {
        clientX: 20,
        clientY: 0,
        ...createPartialMouseEvent([MouseEventButtons.MIDDLE]),
      });
      expect(fixture.debugElement.query(ByCss.SVG_PANNING)).toBeDefined();
      emitEvent(fixture, 'mousemove', {
        movementX: 20,
        movementY: -5,
        ...createPartialMouseEvent([MouseEventButtons.MIDDLE]),
      });
      expect(fixture.debugElement.query(ByCss.SVG_PANNING)).toBeDefined();
      emitEvent(fixture, 'mouseup', {
        clientX: 40,
        clientY: -5,
        ...createPartialMouseEvent([MouseEventButtons.MIDDLE]),
      });
      expect(fixture.debugElement.query(ByCss.SVG_PANNING)).toBeNull();
    });
  });
});
