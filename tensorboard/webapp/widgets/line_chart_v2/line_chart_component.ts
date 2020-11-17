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
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {MainThreadChart} from './lib/chart';
import {Chart} from './lib/chart_types';
import {
  ChartCallbacks,
  ChartOptions,
  DataSeries,
  DataSeriesMetadataMap,
  Extent,
  RendererType,
  Scale,
  ScaleType,
} from './lib/public_types';
import {createScale} from './lib/scale';
import {
  areExtentsEqual,
  isOffscreenCanvasSupported,
  isWebGl2Supported,
} from './lib/utils';
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

@Component({
  selector: 'line-chart',
  templateUrl: 'line_chart_component.ng.html',
  styleUrls: ['line_chart_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  readonly RendererType = RendererType;

  @ViewChild('main', {static: true, read: ElementRef})
  private main!: ElementRef<HTMLElement>;

  @ViewChild('xAxis', {static: true, read: ElementRef})
  private xAxis!: ElementRef<HTMLElement>;

  @ViewChild('yAxis', {static: true, read: ElementRef})
  private yAxis!: ElementRef<HTMLElement>;

  @ViewChild('chartEl', {static: false, read: ElementRef})
  private chartEl?: ElementRef<HTMLCanvasElement | SVGElement>;

  @Input()
  preferredRendererType: RendererType = isWebGl2Supported()
    ? RendererType.WEBGL
    : RendererType.SVG;

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
  tooltipTemplate?: TooltipTemplate;

  xScale: Scale = createScale(this.xScaleType);
  yScale: Scale = createScale(this.xScaleType);
  viewBox: Extent = DEFAULT_EXTENT;

  domDimensions: DomDimensions = {
    main: {width: 0, height: 0},
    xAxis: {width: 0, height: 0},
    yAxis: {width: 0, height: 0},
  };

  private lineChart?: Chart;
  private dataExtent: Extent = DEFAULT_EXTENT;
  private isDataUpdated = false;
  private isMetadataUpdated = false;
  // Must set the default view extent since it is an optional input.
  private isViewBoxUpdated = true;
  private isFixedViewBoxUpdataed = false;
  private maybeSetViewBoxToDefault = true;
  private scaleUpdated = false;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

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

    if (changes['defaultViewExtent']) {
      this.isFixedViewBoxUpdataed = true;
    }

    if (changes['seriesMetadataMap']) {
      this.isMetadataUpdated = true;
    }

    this.maybeSetViewBoxToDefault = this.shouldResetViewExtent(changes);

    this.updateLineChart();
  }

  ngAfterViewInit() {
    this.initializeChart();
    this.updateLineChart();
  }

  onViewResize() {
    if (!this.lineChart) return;

    this.readAndUpdateDomDimensions();
    this.lineChart.resize(this.domDimensions.main);
    this.changeDetector.detectChanges();
  }

  private shouldResetViewExtent(changes: SimpleChanges): boolean {
    if (changes['xScaleType'] || changes['yScaleType']) {
      return true;
    }

    const prevDefaultExtent = this.getDefaultViewBox();
    const wasViewExtentChanged = !areExtentsEqual(
      prevDefaultExtent,
      this.viewBox
    );

    // Don't modify view extent if user has manually changed the view box.
    if (wasViewExtentChanged) {
      return false;
    }

    if (changes['seriesData']) {
      return true;
    }

    const seriesMetadataChange = changes['seriesMetadataMap'];
    if (seriesMetadataChange) {
      const prevMetadataMap = seriesMetadataChange.previousValue;
      for (const [id, metadata] of Object.entries(this.seriesMetadataMap)) {
        const prevMetadata = prevMetadataMap && prevMetadataMap[id];
        if (!prevMetadata || metadata.visible !== prevMetadata.visible) {
          return true;
        }
      }
    }

    return false;
  }

  private initializeChart() {
    if (this.lineChart) {
      throw new Error('LineChart should not be initialized multiple times.');
    }

    const rendererType = this.getRendererType();
    // Do not yet need to subscribe to the `onDrawEnd`.
    const callbacks: ChartCallbacks = {onDrawEnd: () => {}};
    let params: ChartOptions | null = null;

    this.readAndUpdateDomDimensions();

    switch (rendererType) {
      case RendererType.SVG: {
        params = {
          type: RendererType.SVG,
          container: this.chartEl!.nativeElement as SVGElement,
          callbacks,
          domDimension: this.domDimensions.main,
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
        };
        break;
      default:
        const neverRendererType = rendererType as never;
        throw new Error(
          `<line-chart> does not yet support rendererType: ${neverRendererType}`
        );
    }

    const useWorker =
      rendererType !== RendererType.SVG && isOffscreenCanvasSupported();
    const klass = useWorker ? WorkerChart : MainThreadChart;
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
        width: this.main.nativeElement.clientWidth,
        height: this.main.nativeElement.clientHeight,
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
   * Minimally and imperatively updates the chart library depending on prop changed.
   */
  private updateLineChart() {
    if (!this.lineChart) return;

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

    // There are below conditions in which the viewExtent changes.
    const viewBoxChange =
      this.isFixedViewBoxUpdataed ||
      this.isViewBoxUpdated ||
      this.maybeSetViewBoxToDefault;

    if (this.isFixedViewBoxUpdataed && this.fixedViewBox) {
      this.viewBox = this.fixedViewBox;
    } else if (this.maybeSetViewBoxToDefault) {
      const dataExtent = computeDataSeriesExtent(
        this.seriesData,
        this.seriesMetadataMap
      );

      this.dataExtent = {
        x: dataExtent.x ?? DEFAULT_EXTENT.x,
        y: dataExtent.y ?? DEFAULT_EXTENT.y,
      };
      this.viewBox = this.getDefaultViewBox();
    }

    if (viewBoxChange) {
      this.isFixedViewBoxUpdataed = false;
      this.isViewBoxUpdated = false;
      this.maybeSetViewBoxToDefault = false;
      this.lineChart.setViewBox(this.viewBox);
    }
  }

  onViewBoxChanged({dataExtent}: {dataExtent: Extent}) {
    this.isViewBoxUpdated = true;
    this.viewBox = dataExtent;
    this.updateLineChart();
  }

  onViewBoxReset() {
    this.maybeSetViewBoxToDefault = true;
    this.updateLineChart();
  }

  private getDefaultViewBox(): Extent {
    return this.fixedViewBox
      ? this.fixedViewBox
      : {
          x: this.xScale.niceDomain(this.dataExtent.x),
          y: this.yScale.niceDomain(this.dataExtent.y),
        };
  }
}
