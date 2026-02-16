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
import {
  CdkConnectedOverlay,
  ConnectedPosition,
  Overlay,
  RepositionScrollStrategy,
} from '@angular/cdk/overlay';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  BehaviorSubject,
  fromEvent,
  of,
  Subject,
  Subscription,
  timer,
} from 'rxjs';
import {filter, map, switchMap, takeUntil, tap} from 'rxjs/operators';
import {MouseEventButtons} from '../../../util/dom';
import {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  Dimension,
  Extent,
  InteractionState,
  Point,
  Rect,
  Scale,
} from '../lib/public_types';
import {getScaleRangeFromDomDim} from './chart_view_utils';
import {
  findClosestIndex,
  getProposedViewExtentOnZoom,
} from './line_chart_interactive_utils';

export interface TooltipDatum<
  Metadata extends DataSeriesMetadata = DataSeriesMetadata,
  PointDatum extends Point = Point
> {
  id: string;
  metadata: Metadata;
  closestPointIndex: number;
  dataPoint: PointDatum;
  domPoint: Point;
}

const SCROLL_ZOOM_SPEED_FACTOR = 0.01;

export function scrollStrategyFactory(
  overlay: Overlay
): RepositionScrollStrategy {
  return overlay.scrollStrategies.reposition();
}

export interface TooltipTemplateContext {
  cursorLocationInDataCoord: {x: number; y: number};
  data: TooltipDatum[];
}

export type TooltipTemplate = TemplateRef<TooltipTemplateContext>;

@Component({
  standalone: false,
  selector: 'line-chart-interactive-view',
  templateUrl: './line_chart_interactive_view.ng.html',
  styleUrls: ['./line_chart_interactive_view.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: RepositionScrollStrategy,
      useFactory: scrollStrategyFactory,
      deps: [Overlay],
    },
  ],
})
export class LineChartInteractiveViewComponent
  implements OnChanges, OnDestroy, AfterViewInit
{
  @ViewChild('dots', {static: true, read: ElementRef})
  dotsContainer!: ElementRef<SVGElement>;

  @ViewChild(CdkConnectedOverlay)
  overlay!: CdkConnectedOverlay;

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
  tooltipOriginEl!: ElementRef;

  @Input()
  tooltipTemplate?: TooltipTemplate;

  @Input() disableTooltip?: boolean;

  @Output()
  onViewExtentChange = new EventEmitter<{dataExtent: Extent}>();

  @Output()
  onViewExtentReset = new EventEmitter<void>();

  @Output()
  onInteractionStateChange = new EventEmitter<InteractionState>();

  readonly InteractionState = InteractionState;

  readonly state = new BehaviorSubject<InteractionState>(InteractionState.NONE);

  // Whether alt or shiftKey is pressed down.
  specialKeyPressed: boolean = false;

  // Gray box that shows when user drags with mouse down
  zoomBoxInUiCoordinate: Rect = {x: 0, width: 0, height: 0, y: 0};

  readonly tooltipPositions: ConnectedPosition[] = [
    // Prefer align at bottom edge of the line chart
    {
      offsetY: 5,
      originX: 'start',
      overlayX: 'start',
      originY: 'bottom',
      overlayY: 'top',
    },
    // bottom, right aligned
    {
      offsetY: 5,
      originX: 'end',
      overlayX: 'end',
      originY: 'bottom',
      overlayY: 'top',
    },
    // Then top left
    {
      offsetY: -15,
      originX: 'start',
      overlayX: 'start',
      originY: 'top',
      overlayY: 'bottom',
    },
    // then top, right aligned
    {
      offsetY: -15,
      originX: 'end',
      overlayX: 'end',
      originY: 'top',
      overlayY: 'bottom',
    },
    // then right
    {
      offsetX: 5,
      originX: 'end',
      overlayX: 'start',
      originY: 'top',
      overlayY: 'top',
    },
    // then left
    {
      offsetX: -5,
      originX: 'start',
      overlayX: 'end',
      originY: 'top',
      overlayY: 'top',
    },
  ];

  cursorLocationInDataCoord: {x: number; y: number} | null = null;
  cursorLocation: {x: number; y: number} | null = null;
  cursoredData: TooltipDatum[] = [];
  tooltipDisplayAttached: boolean = false;

  @HostBinding('class.show-zoom-instruction')
  showZoomInstruction: boolean = false;

  private dragStartCoord: {x: number; y: number} | null = null;
  private isCursorInside = false;
  private readonly ngUnsubscribe = new Subject<void>();
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    readonly scrollStrategy: RepositionScrollStrategy
  ) {}

  ngAfterViewInit() {
    this.subscriptions.push(
      this.state.subscribe((state) => {
        this.onInteractionStateChange.emit(state);
      })
    );
    this.ngUnsubscribe.pipe(
      map(() => {
        this.subscriptions.forEach((subscription) =>
          subscription.unsubscribe()
        );
      })
    );
    // dblclick event cannot be prevented. Using css to disallow selecting instead.
    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'dblclick', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.onViewExtentReset.emit();
        this.state.next(InteractionState.NONE);
        this.changeDetector.markForCheck();
      });

    fromEvent<MouseEvent>(window, 'keydown', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        const newState = this.shouldPan(event);
        if (newState !== this.specialKeyPressed) {
          this.specialKeyPressed = newState;
          this.changeDetector.markForCheck();
        }
      });

    fromEvent<MouseEvent>(window, 'keyup', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        const newState = this.shouldPan(event);
        if (newState !== this.specialKeyPressed) {
          this.specialKeyPressed = newState;
          this.changeDetector.markForCheck();
        }
      });

    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'mousedown', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        const prevState = this.state.getValue();
        const nextState = this.shouldPan(event)
          ? InteractionState.PANNING
          : InteractionState.DRAG_ZOOMING;

        // Override the dragStartCoord and zoomBox only when started to zoom.
        // For instance, if you press left button then right, drag zoom should start at
        // the left button down so the second mousedown is ignored.
        if (
          prevState === InteractionState.NONE &&
          nextState === InteractionState.DRAG_ZOOMING
        ) {
          this.dragStartCoord = {x: event.offsetX, y: event.offsetY};
          this.zoomBoxInUiCoordinate = {
            x: event.offsetX,
            width: 0,
            y: event.offsetY,
            height: 0,
          };
        }

        if (prevState !== nextState) {
          this.state.next(nextState);
          this.changeDetector.markForCheck();
        }
      });

    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'mouseup', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        const leftClicked =
          (event.buttons & MouseEventButtons.LEFT) === MouseEventButtons.LEFT;
        this.dragStartCoord = null;

        const zoomBox = this.zoomBoxInUiCoordinate;
        if (
          !leftClicked &&
          this.state.getValue() === InteractionState.DRAG_ZOOMING &&
          zoomBox.width > 0 &&
          zoomBox.height > 0
        ) {
          const xMin = this.getDataX(zoomBox.x);
          const xMax = this.getDataX(zoomBox.x + zoomBox.width);
          const yMin = this.getDataY(zoomBox.y + zoomBox.height);
          const yMax = this.getDataY(zoomBox.y);

          this.onViewExtentChange.emit({
            dataExtent: {
              x: [xMin, xMax],
              y: [yMin, yMax],
            },
          });
        }
        if (this.state.getValue() !== InteractionState.NONE) {
          this.state.next(InteractionState.NONE);
          this.changeDetector.markForCheck();
        }
      });

    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'mouseenter', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        this.isCursorInside = true;
        this.updateTooltip(event);
        this.changeDetector.markForCheck();
      });

    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'mouseleave', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        this.dragStartCoord = null;
        this.isCursorInside = false;
        this.updateTooltip(event);
        this.state.next(InteractionState.NONE);
        this.changeDetector.markForCheck();
      });

    fromEvent<MouseEvent>(this.dotsContainer.nativeElement, 'mousemove', {
      passive: true,
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        switch (this.state.getValue()) {
          case InteractionState.SCROLL_ZOOMING: {
            this.state.next(InteractionState.NONE);
            this.updateTooltip(event);
            this.changeDetector.markForCheck();
            break;
          }
          case InteractionState.NONE:
            this.updateTooltip(event);
            this.changeDetector.markForCheck();
            break;
          case InteractionState.PANNING: {
            const deltaX = -event.movementX;
            const deltaY = -event.movementY;
            const {width: domWidth, height: domHeight} = this.domDim;
            const xMin = this.getDataX(deltaX);
            const xMax = this.getDataX(domWidth + deltaX);
            const yMin = this.getDataY(domHeight + deltaY);
            const yMax = this.getDataY(deltaY);
            this.onViewExtentChange.emit({
              dataExtent: {
                x: [xMin, xMax],
                y: [yMin, yMax],
              },
            });
            break;
          }
          case InteractionState.DRAG_ZOOMING:
            {
              if (!this.dragStartCoord) {
                break;
              }
              const xs = [this.dragStartCoord.x, event.offsetX];
              const ys = [this.dragStartCoord.y, event.offsetY];
              this.zoomBoxInUiCoordinate = {
                x: Math.min(...xs),
                width: Math.max(...xs) - Math.min(...xs),
                y: Math.min(...ys),
                height: Math.max(...ys) - Math.min(...ys),
              };
            }
            this.changeDetector.markForCheck();
            break;
        }
      });

    fromEvent<WheelEvent>(this.dotsContainer.nativeElement, 'wheel', {
      passive: false,
    })
      .pipe(
        takeUntil(this.ngUnsubscribe),
        switchMap((event: WheelEvent) => {
          const shouldZoom = !event.ctrlKey && !event.shiftKey && event.altKey;
          this.showZoomInstruction = !shouldZoom;
          this.changeDetector.markForCheck();

          if (shouldZoom) {
            event.preventDefault();
            return of(event);
          }
          return timer(3000).pipe(
            tap(() => {
              this.showZoomInstruction = false;
              this.changeDetector.markForCheck();
            }),
            map(() => null)
          );
        }),
        filter((eventOrNull) => Boolean(eventOrNull))
      )
      .subscribe((eventOrNull) => {
        const event = eventOrNull!;
        this.onViewExtentChange.emit({
          dataExtent: getProposedViewExtentOnZoom(
            event,
            this.viewExtent,
            this.domDim,
            SCROLL_ZOOM_SPEED_FACTOR,
            this.xScale,
            this.yScale
          ),
        });

        if (this.state.getValue() !== InteractionState.SCROLL_ZOOMING) {
          this.state.next(InteractionState.SCROLL_ZOOMING);
          this.changeDetector.markForCheck();
        }
      });
  }

  ngOnChanges() {
    this.updateCursoredDataAndTooltipVisibility();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private shouldPan(event: MouseEvent | KeyboardEvent): boolean {
    const specialKeyEngaged = event.shiftKey || event.altKey;

    if (event instanceof KeyboardEvent) {
      return specialKeyEngaged;
    }

    const leftClicked =
      (event.buttons & MouseEventButtons.LEFT) === MouseEventButtons.LEFT;
    const middleClicked =
      (event.buttons & MouseEventButtons.MIDDLE) === MouseEventButtons.MIDDLE;

    // Ignore right/forward/back clicks.
    if (!leftClicked && !middleClicked) return false;
    // At this point, either left or middle is clicked, but if both are clicked, left
    // takes precedence.
    return (middleClicked && !leftClicked) || specialKeyEngaged;
  }

  trackBySeriesName(index: number, datum: TooltipDatum) {
    return datum.id;
  }

  getDomX(uiCoord: number): number {
    return this.xScale.forward(
      this.viewExtent.x,
      getScaleRangeFromDomDim(this.domDim, 'x'),
      uiCoord
    );
  }

  private getDataX(uiCoord: number): number {
    return this.xScale.reverse(
      this.viewExtent.x,
      getScaleRangeFromDomDim(this.domDim, 'x'),
      uiCoord
    );
  }

  getDomY(uiCoord: number): number {
    return this.yScale.forward(
      this.viewExtent.y,
      getScaleRangeFromDomDim(this.domDim, 'y'),
      uiCoord
    );
  }

  private getDataY(uiCoord: number): number {
    return this.yScale.reverse(
      this.viewExtent.y,
      getScaleRangeFromDomDim(this.domDim, 'y'),
      uiCoord
    );
  }

  shouldRenderTooltipPoint(point: Point | null): boolean {
    return point !== null && !isNaN(point.x) && !isNaN(point.y);
  }

  private updateTooltip(event: MouseEvent) {
    this.cursorLocationInDataCoord = {
      x: this.getDataX(event.offsetX),
      y: this.getDataY(event.offsetY),
    };
    this.cursorLocation = {
      x: event.offsetX,
      y: event.offsetY,
    };
    this.updateCursoredDataAndTooltipVisibility();
  }

  onTooltipDisplayDetached() {
    this.tooltipDisplayAttached = false;
  }

  private updateCursoredDataAndTooltipVisibility() {
    const cursorLoc = this.cursorLocationInDataCoord;
    if (cursorLoc === null) {
      this.cursoredData = [];
      this.tooltipDisplayAttached = false;
      return;
    }

    this.cursoredData = this.isCursorInside
      ? (this.seriesData
          .map((seriesDatum) => {
            return {
              seriesDatum: seriesDatum,
              metadata: this.seriesMetadataMap[seriesDatum.id],
            };
          })
          .filter(({metadata}) => {
            return metadata && metadata.visible && !Boolean(metadata.aux);
          })
          .map(({seriesDatum, metadata}) => {
            const index = findClosestIndex(seriesDatum.points, cursorLoc.x);
            const dataPoint = seriesDatum.points[index];
            return {
              id: seriesDatum.id,
              closestPointIndex: index,
              dataPoint,
              domPoint: {
                x: this.getDomX(dataPoint.x),
                y: this.getDomY(dataPoint.y),
              },
              metadata,
            };
          })
          .filter((tooltipDatumOrNull) => tooltipDatumOrNull) as TooltipDatum[])
      : [];
    this.tooltipDisplayAttached = Boolean(this.cursoredData.length);
  }
}
