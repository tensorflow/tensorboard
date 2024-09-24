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
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {Observable, ReplaySubject} from 'rxjs';
import {ChartImpl} from './lib/chart';
import {Chart} from './lib/chart_types';
import {
  ChartCallbacks,
  ChartOptions,
  DataSeries,
  DataSeriesMetadataMap,
  Extent,
  Formatter,
  InteractionState,
  RendererType,
  Scale,
  ScaleType,
} from './lib/public_types';
import {createScale} from './lib/scale';
import {ChartUtils} from './lib/utils';
import {WorkerChart} from './lib/worker/worker_chart';
import {
  computeDataSeriesExtent,
  getRendererType,
} from './line_chart_internal_utils';
import {TooltipTemplate} from './sub_view/line_chart_interactive_view';

export {TooltipTemplate} from './sub_view/line_chart_interactive_view';

const DEFAULT_EXTENT: Extent = {x: [0, 1], y: [0, 1]};

interface DomDimensions {
  main: {width: number; height: number};
  yAxis: {width: number; height: number};
  xAxis: {width: number; height: number};
}

export interface TemplateContext {
  yScale: Scale;
  xScale: Scale;
  viewExtent: Extent;
  domDimension: {width: number; height: number};
}

@Component({
  standalone: false,
  selector: 'line-chart',
  templateUrl: 'line_chart_component.ng.html',
  styleUrls: ['line_chart_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent
  implements AfterViewInit, OnInit, OnChanges, OnDestroy
{
  readonly RendererType = RendererType;

  @ViewChild('seriesView', {static: true, read: ElementRef})
  private seriesView!: ElementRef<HTMLElement>;

  @ViewChild('xAxis', {static: true, read: ElementRef})
  private xAxis!: ElementRef<HTMLElement>;

  @ViewChild('yAxis', {static: true, read: ElementRef})
  private yAxis!: ElementRef<HTMLElement>;

  @ViewChild('chartEl', {static: false, read: ElementRef})
  private chartEl?: ElementRef<HTMLCanvasElement | SVGElement>;

  /**
   * Optional ngTemplate that renders on top of line chart (not axis). This
   * template is rendered on top of interactive layer and can mask other
   * contents. Do note that this component may not intercept pointer-events.
   */
  @Input()
  customVisTemplate?: TemplateRef<TemplateContext>;

  @Input()
  customChartOverlayTemplate?: TemplateRef<
    TemplateContext & {formatter: Formatter}
  >;

  @Input()
  useDarkMode: boolean = false;

  @Input()
  preferredRendererType: RendererType = RendererType.WEBGL;

  @Input()
  seriesData!: DataSeries[];

  // In case of PR curve line chart, we do not want to compute the viewBox based on the
  // data.
  @Input()
  fixedViewBox?: Extent;

  @Input()
  seriesMetadataMap!: DataSeriesMetadataMap;

  @Input()
  xScaleType: ScaleType = ScaleType.LINEAR;

  @Input()
  yScaleType: ScaleType = ScaleType.LINEAR;

  @Input()
  customXFormatter?: Formatter;

  @Input()
  customYFormatter?: Formatter;

  @Input()
  tooltipTemplate?: TooltipTemplate;

  @Input() userViewBox: Extent | null = null;

  @Input()
  lineOnly?: boolean = false;

  @Input() disableTooltip?: boolean = false;

  @Output()
  viewBoxChanged = new EventEmitter<Extent | null>();

  private onViewBoxOverridden = new ReplaySubject<boolean>(1);

  /**
   * Optional parameter to tweak whether to propagate update to line chart implementation.
   * When not specified, it defaults to `false`. When it is `true`, it remembers what has
   * changed and applies the change when the update is enabled.
   */
  @Input()
  disableUpdate?: boolean;

  /**
   * Whether to ignore outlier when computing default viewBox from the dataSeries.
   *
   * Do note that we only take values in between approxmiately 5th to 95th percentiles.
   */
  @Input()
  ignoreYOutliers: boolean = false;

  readonly Y_GRID_COUNT = 6;
  readonly X_GRID_COUNT = 10;

  xScale: Scale = createScale(this.xScaleType);
  yScale: Scale = createScale(this.xScaleType);
  viewBox: Extent = DEFAULT_EXTENT;

  domDimensions: DomDimensions = {
    main: {width: 0, height: 0},
    xAxis: {width: 0, height: 0},
    yAxis: {width: 0, height: 0},
  };
  showChartRendererElement: boolean = true;

  interactionState = InteractionState.NONE;

  private lineChart: Chart | null = null;
  private isDataUpdated = false;
  private isMetadataUpdated = false;
  private isFixedViewBoxUpdated = false;
  private isViewBoxOverridden = false;
  private useDarkModeUpdated = false;
  private userViewBoxUpdated = false;
  // Must set the default view box since it is an optional input and won't trigger
  // onChanges.
  private isViewBoxChanged = true;
  private scaleUpdated = true;
  private isRenderingContextLost = false;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit() {
    // Let the parent component know if its initial value.
    this.onViewBoxOverridden.next(this.isViewBoxOverridden);
  }

  ngOnChanges(changes: SimpleChanges) {
    // OnChanges only decides whether props need to be updated and do not directly update
    // the line chart.

    if (changes['xScaleType']) {
      this.xScale = createScale(this.xScaleType);
      this.scaleUpdated = true;
    }

    if (changes['yScaleType']) {
      this.yScale = createScale(this.yScaleType);
      this.scaleUpdated = true;
    }

    if (changes['seriesData']) {
      this.isDataUpdated = true;
    }

    if (changes['fixedViewBox']) {
      this.isFixedViewBoxUpdated = true;
    }

    if (changes['seriesMetadataMap']) {
      this.isMetadataUpdated = true;
    }

    if (changes['useDarkMode']) {
      this.useDarkModeUpdated = true;
    }

    if (changes['userViewBox']) {
      this.userViewBoxUpdated = true;
    }

    if (this.userViewBoxUpdated) {
      this.setIsViewBoxOverridden(!!this.userViewBox);
    } else if (this.scaleUpdated) {
      this.setIsViewBoxOverridden(false);
    }

    this.isViewBoxChanged =
      this.isViewBoxChanged ||
      this.userViewBoxUpdated ||
      this.scaleUpdated ||
      (!this.isViewBoxOverridden && this.shouldUpdateDefaultViewBox(changes));

    this.updateLineChart();
  }

  ngAfterViewInit() {
    this.initializeChart();
    this.updateLineChart();

    // After view is initialized, if we ever change the Angular prop that should propagate
    // to children, we need to retrigger the Angular change.
    this.changeDetector.detectChanges();
  }

  /**
   * Ensures the renderer is ready, or recovers it if it encountered a loss of
   * context. This relies on `onContextLost` to set the appropriate flags for
   * requesting updates.
   */
  private recoverRendererIfNeeded() {
    if (!this.isRenderingContextLost || this.disableUpdate) {
      return;
    }
    // The component's template has an 'ngIf="showChartRendererElement"' we use
    // to fully replace the DOM element.
    this.showChartRendererElement = false;
    this.changeDetector.detectChanges();
    this.showChartRendererElement = true;
    this.changeDetector.detectChanges();
    this.initializeChart();

    // After recreating the renderer element, the next update should re-apply
    // any existing changes. Keep this in sync with `updateLineChart`.
    this.scaleUpdated = true;
    this.isMetadataUpdated = true;
    this.isDataUpdated = true;
    this.useDarkModeUpdated = true;
    this.isFixedViewBoxUpdated = true;
    this.isViewBoxChanged = true;

    this.isRenderingContextLost = false;
  }

  onViewResize() {
    if (!this.lineChart) return;

    this.readAndUpdateDomDimensions();
    this.lineChart.resize(this.domDimensions.main);
    this.changeDetector.detectChanges();
  }

  /**
   * Returns true when default view box changes (e.g., due to more data coming in
   * or more series becoming visible).
   *
   * Calculating the dataExtent and updating the viewBox accordingly can be an expensive
   * operation.
   */
  private shouldUpdateDefaultViewBox(changes: SimpleChanges): boolean {
    if (
      changes['xScaleType'] ||
      changes['yScaleType'] ||
      changes['ignoreYOutliers']
    ) {
      return true;
    }

    const seriesDataChange = changes['seriesData'];
    if (seriesDataChange) {
      // Technically, this is much more convoluted; we should see if the seriesData that
      // change is visible and was visible so we do not recompute the extent when an
      // invisible data series change (that did not contribute to the dataExtent
      // calculation) causes extent computation. However, for now, since seriesData dirty
      // checking is expensive, too, we simply recompute the default box when seriesData
      // changes. When this proves to be a hot spot, we can improve the logic in this
      // method to detect dirtiness to minimize the work.
      return true;
    }

    const seriesMetadataChange = changes['seriesMetadataMap'];
    if (seriesMetadataChange) {
      const prevMetadataMap = seriesMetadataChange.previousValue;
      if (
        Object.keys(this.seriesMetadataMap).length !==
        Object.keys(prevMetadataMap ?? {}).length
      ) {
        return true;
      }

      for (const [id, metadata] of Object.entries(this.seriesMetadataMap)) {
        const prevMetadata = prevMetadataMap && prevMetadataMap[id];
        if (!prevMetadata || metadata.visible !== prevMetadata.visible) {
          return true;
        }
      }
    }

    return false;
  }

  private onContextLost() {
    // Since context may be lost when the component is hidden or does not need
    // updates, the re-creation of a new chart renderer happens lazily.
    this.isRenderingContextLost = true;

    if (this.lineChart) {
      this.lineChart.dispose();
      this.lineChart = null;
    }
  }

  triggerContextLostForTest() {
    this.onContextLost();
  }

  getLineChartForTest(): Chart | null {
    return this.lineChart;
  }

  private initializeChart() {
    if (this.lineChart) {
      this.lineChart.dispose();
    }

    const rendererType = this.getRendererType();
    const callbacks: ChartCallbacks = {
      // Do not yet need to subscribe to the `onDrawEnd`.
      onDrawEnd: () => {},
      onContextLost: this.onContextLost.bind(this),
    };
    let params: ChartOptions | null = null;

    this.readAndUpdateDomDimensions();

    switch (rendererType) {
      case RendererType.SVG: {
        params = {
          type: RendererType.SVG,
          container: this.chartEl!.nativeElement as SVGElement,
          callbacks,
          domDimension: this.domDimensions.main,
          useDarkMode: this.useDarkMode,
        };
        break;
      }
      case RendererType.WEBGL:
        params = {
          type: RendererType.WEBGL,
          container: this.chartEl!.nativeElement as HTMLCanvasElement,
          devicePixelRatio: window.devicePixelRatio,
          callbacks,
          domDimension: this.domDimensions.main,
          useDarkMode: this.useDarkMode,
        };
        break;
      default:
        const neverRendererType = rendererType as never;
        throw new Error(
          `<line-chart> does not yet support rendererType: ${neverRendererType}`
        );
    }

    const useWorker =
      rendererType !== RendererType.SVG &&
      ChartUtils.isWebGl2OffscreenCanvasSupported();
    const klass = useWorker ? WorkerChart : ChartImpl;
    this.lineChart = new klass(params);
  }

  ngOnDestroy() {
    if (this.lineChart) this.lineChart.dispose();
  }

  getRendererType(): RendererType {
    return getRendererType(this.preferredRendererType);
  }

  private readAndUpdateDomDimensions(): void {
    this.domDimensions = {
      main: {
        width: this.seriesView.nativeElement.clientWidth,
        height: this.seriesView.nativeElement.clientHeight,
      },
      xAxis: {
        width: this.xAxis.nativeElement.clientWidth,
        height: this.xAxis.nativeElement.clientHeight,
      },
      yAxis: {
        width: this.yAxis.nativeElement.clientWidth,
        height: this.yAxis.nativeElement.clientHeight,
      },
    };
  }

  /**
   * Minimally and imperatively updates the chart library depending on prop
   * changed. When adding new `this.lineChart.set*()` calls, keep this in sync
   * with `recoverRendererIfNeeded`.
   */
  private updateLineChart() {
    this.recoverRendererIfNeeded();
    if (!this.lineChart || this.disableUpdate) return;

    if (this.scaleUpdated) {
      this.scaleUpdated = false;
      this.lineChart.setXScaleType(this.xScaleType);
      this.lineChart.setYScaleType(this.yScaleType);
    }

    if (this.isMetadataUpdated) {
      this.isMetadataUpdated = false;
      this.lineChart.setMetadata(this.seriesMetadataMap);
    }

    if (this.isDataUpdated) {
      this.isDataUpdated = false;
      this.lineChart.setData(this.seriesData);
    }

    if (this.useDarkModeUpdated) {
      this.useDarkModeUpdated = false;
      this.lineChart.setUseDarkMode(this.useDarkMode);
    }

    if (this.userViewBoxUpdated) {
      this.userViewBoxUpdated = false;
    }

    if (this.isViewBoxOverridden && !!this.userViewBox) {
      this.viewBox = this.userViewBox;
    } else if (!this.isViewBoxOverridden && this.fixedViewBox) {
      this.viewBox = this.fixedViewBox;
    } else if (!this.isViewBoxOverridden && this.isViewBoxChanged) {
      const dataExtent = computeDataSeriesExtent(
        this.seriesData,
        this.seriesMetadataMap,
        this.ignoreYOutliers,
        this.xScale.isSafeNumber,
        this.yScale.isSafeNumber
      );
      this.viewBox = {
        x: this.xScale.niceDomain(dataExtent.x ?? DEFAULT_EXTENT.x),
        y: this.yScale.niceDomain(dataExtent.y ?? DEFAULT_EXTENT.y),
      };
    }

    // There are below conditions in which the viewBox changes.
    const shouldSetViewBox =
      this.isFixedViewBoxUpdated || this.isViewBoxChanged;

    if (shouldSetViewBox) {
      this.isFixedViewBoxUpdated = false;
      this.isViewBoxChanged = false;
      this.lineChart.setViewBox(this.viewBox);
      // When viewBox is updated, we should also detect changes in child components.
      this.changeDetector.detectChanges();
    }
  }

  onViewBoxChanged({dataExtent}: {dataExtent: Extent}) {
    this.viewBoxChanged.emit(dataExtent);
  }

  viewBoxReset() {
    this.viewBoxChanged.emit(null);
  }

  private setIsViewBoxOverridden(newValue: boolean): void {
    const prevValue = this.isViewBoxOverridden;
    this.isViewBoxOverridden = newValue;
    if (prevValue !== newValue) {
      this.onViewBoxOverridden.next(newValue);
    }
  }

  onInteractionStateChange(event: InteractionState) {
    this.interactionState = event;
  }

  getIsViewBoxOverridden(): Observable<boolean> {
    return this.onViewBoxOverridden;
  }

  onViewBoxChangedFromAxis(extent: [number, number], axis: 'x' | 'y') {
    const nextDataExtent: Extent = {
      ...this.viewBox,
      [axis]: extent,
    };
    this.onViewBoxChanged({dataExtent: nextDataExtent});
  }
}
