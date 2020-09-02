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
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';

import * as d3 from 'd3';

import {MetricFilter} from './../../../store/npmi_types';
import {ViolinChartData, ViolinBin} from './../../../util/violin_data';

@Component({
  selector: 'violin-filter-component',
  templateUrl: './violin_filter_component.ng.html',
  styleUrls: ['./violin_filter_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViolinFilterComponent implements AfterViewInit, OnChanges {
  @Input() metricName!: string;
  @Input() filter!: MetricFilter;
  @Input() chartData!: {
    violinData: ViolinChartData;
    extremes: {min: number; max: number};
  };
  @Input() width!: number;
  @Output() onRemove = new EventEmitter();
  @Output() onUpdateFilter = new EventEmitter<MetricFilter>();
  @ViewChild('chart', {static: true, read: ElementRef})
  private readonly chartContainer!: ElementRef<HTMLDivElement>;
  private height = 300;
  private margin = {top: 20, right: 10, bottom: 20, left: 10};
  private drawMargin = {top: 0, right: 0, bottom: 20, left: 20};
  get chartWidth(): number {
    return this.width - this.margin.left - this.margin.right;
  }
  get chartHeight(): number {
    return this.height - this.margin.top - this.margin.bottom;
  }
  get drawHeight(): number {
    return this.chartHeight - this.drawMargin.top - this.drawMargin.bottom;
  }
  get drawWidth(): number {
    return this.chartWidth - this.drawMargin.left - this.drawMargin.right;
  }
  // Drawing containers
  private svg!: d3.Selection<SVGElement, unknown, null, undefined>;
  private mainContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private drawContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  // Containers for axis and dots
  private dotsGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private xAxisGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private yAxisGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private miscGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  // Scales and axis
  private xScale: d3.ScalePoint<string> = d3.scalePoint();
  private xAxis?: d3.Axis<string>;
  private yScale: d3.ScaleLinear<number, number> = d3.scaleLinear();
  private yAxis?: d3.Axis<number | {valueOf(): number}>;
  private xScaleNum: d3.ScaleLinear<number, number> = d3.scaleLinear();
  // Brush
  private brush: d3.BrushBehavior<unknown> = d3.brushY();
  // Misc
  private nanLine!: d3.Selection<SVGLineElement, unknown, null, undefined>;
  private nanText!: d3.Selection<SVGTextElement, unknown, null, undefined>;
  private zeroLine!: d3.Selection<SVGLineElement, unknown, null, undefined>;

  private maxBinSize = 0;
  private readonly rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];
  private readonly area = d3
    .area<ViolinBin>()
    .x0(
      function(this: ViolinFilterComponent, d: ViolinBin) {
        return this.xScaleNum(-d.length);
      }.bind(this)
    )
    .x1(
      function(this: ViolinFilterComponent, d: ViolinBin) {
        return this.xScaleNum(d.length);
      }.bind(this)
    )
    .y(
      function(this: ViolinFilterComponent, d: ViolinBin) {
        if (d.x0! === -Infinity) {
          return this.chartHeight - this.drawMargin.top;
        }
        return this.yScale((d.x1! + d.x0!) / 2.0);
      }.bind(this)
    )
    .curve(d3.curveCatmullRom);

  ngAfterViewInit(): void {
    this.svg = d3.select(this.chartContainer.nativeElement).select('svg');
    this.svg;
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.drawContainer = this.mainContainer
      .append('g')
      .attr(
        'transform',
        `translate(${this.drawMargin.left}, ${this.drawMargin.top})`
      );
    this.dotsGroup = this.drawContainer.append('g').attr('class', 'dotsGroup');
    this.yAxisGroup = this.mainContainer
      .append('g')
      .attr('class', 'axis axis--y');
    this.xAxisGroup = this.mainContainer
      .append('g')
      .attr('class', 'axis axis--x');
    this.miscGroup = this.drawContainer.append('g');
    this.xScale = d3.scaleBand().padding(0.05);
    this.yScale = d3.scaleLinear().range([this.drawHeight, 0]);
    this.xScaleNum = d3.scaleLinear();
    this.initializeBrush();
    this.drawMisc();
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.svg) {
      this.redraw();
    }
  }

  redraw() {
    this.setMaxBinSize();
    this.updateAxes();
    this.draw();
  }

  // Initializing/Updating the visualization props
  setMaxBinSize() {
    Object.values(this.chartData.violinData).forEach((dataElement) => {
      const lengths = dataElement.map((bin) => bin.length);
      const longest: number = Math.max(...lengths);
      this.maxBinSize = Math.max(longest, this.maxBinSize);
    });
  }

  updateAxes() {
    this.xScale
      .range([0, this.drawWidth])
      .domain(Object.keys(this.chartData.violinData));
    this.xAxis = d3.axisBottom(this.xScale);

    this.yScale.domain([
      this.chartData.extremes.min,
      this.chartData.extremes.max,
    ]);
    this.yAxis = d3.axisLeft(this.yScale);

    this.xScaleNum
      .range([0, this.xScale.bandwidth()])
      .domain([-this.maxBinSize, this.maxBinSize]);
  }

  initializeBrush() {
    this.brush.on('end', this.brushMoved.bind(this));
  }

  // Drawing UI
  draw() {
    this.drawAxes();
    this.drawPlot();
    this.refreshMisc();
    this.refreshBrush();
  }

  drawAxes() {
    this.miscGroup.selectAll('*').remove();
    this.miscGroup
      .append('line')
      .style('stroke', 'black')
      .attr('x1', 0)
      .attr('y1', this.yScale(0))
      .attr('x2', this.drawWidth)
      .attr('y2', this.yScale(0));
    this.yAxisGroup
      .attr(
        'transform',
        `translate(${this.drawMargin.left},
      ${this.drawMargin.top})`
      )
      .call(this.yAxis!);
    this.xAxisGroup
      .attr(
        'transform',
        `translate(${this.drawMargin.left},
      ${this.drawMargin.top + this.chartHeight})`
      )
      .call(this.xAxis!);
  }

  drawLines() {}

  drawPlot() {
    const plots = this.dotsGroup
      .selectAll('.violin-plot')
      .data(Object.entries(this.chartData.violinData));

    plots
      .enter()
      .append('path')
      .attr('class', 'violin-plot')
      .style(
        'stroke',
        function(
          this: ViolinFilterComponent,
          d: [string, ViolinBin[]]
        ): string {
          return `rgba(${this.rgbColors[0]}, 1.0)`;
        }.bind(this)
      )
      .style(
        'fill',
        function(
          this: ViolinFilterComponent,
          d: [string, ViolinBin[]]
        ): string {
          return `rgba(${this.rgbColors[0]}, 0.3)`;
        }.bind(this)
      )
      .attr(
        'transform',
        function(
          this: ViolinFilterComponent,
          d: [string, ViolinBin[]]
        ): string {
          return `translate(${this.xScale(d[0])}, 0)`;
        }.bind(this)
      )
      .datum(function(d: [string, ViolinBin[]]): ViolinBin[] {
        return d[1];
      })
      .attr('d', this.area);

    plots
      .attr(
        'transform',
        function(
          this: ViolinFilterComponent,
          d: [string, ViolinBin[]]
        ): string {
          return `translate(${this.xScale(d[0])}, 0)`;
        }.bind(this)
      )
      .datum(function(d: [string, ViolinBin[]]): ViolinBin[] {
        return d[1];
      })
      .attr('d', this.area);

    plots.exit().remove();
  }

  drawMisc() {
    this.zeroLine = this.miscGroup
      .append('line')
      .style('stroke', 'black')
      .attr('x1', 0)
      .attr('y1', this.yScale(0))
      .attr('x2', this.drawWidth)
      .attr('y2', this.yScale(0));
    this.nanText = this.miscGroup
      .append('text')
      .style('fill', 'black')
      .text('NaN')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('x', -5)
      .attr('y', this.chartHeight - this.drawMargin.top);
    this.nanLine = this.mainContainer
      .append('line')
      .style('stroke', 'grey')
      .style('stroke-dasharray', '3, 3')
      .attr('x1', 0)
      .attr('y1', this.drawHeight + this.drawMargin.top)
      .attr('x2', this.chartWidth)
      .attr('y2', this.drawHeight + this.drawMargin.top);
  }

  refreshMisc() {
    this.zeroLine
      .attr('y1', this.yScale(0))
      .attr('x2', this.drawWidth)
      .attr('y2', this.yScale(0));
    this.nanText.attr('y', this.chartHeight - this.drawMargin.top);
    this.nanLine
      .attr('y1', this.drawHeight + this.drawMargin.top)
      .attr('x2', this.chartWidth)
      .attr('y2', this.drawHeight + this.drawMargin.top);
  }

  private refreshBrush() {
    this.brush.extent([
      [0, 0],
      [this.drawWidth, this.drawHeight + this.margin.top],
    ]);
    const brushPosition = [0, this.drawHeight + this.margin.top];
    if (this.filter.max < this.filter.min) {
      if (this.filter.includeNaN) {
        // Only NaN selected
        brushPosition[0] = this.yScale(this.chartData.extremes.min);
      } else {
        // Nothing selected
        brushPosition[0] = brushPosition[1];
      }
    } else {
      if (!this.filter.includeNaN) {
        // Min does not reach NaN
        const min = Math.max(this.chartData.extremes.min, this.filter.min);
        brushPosition[1] = this.yScale(min);
      }
      const max = Math.min(this.chartData.extremes.max, this.filter.max);
      brushPosition[0] = this.yScale(max);
    }

    this.drawContainer.call(this.brush).call(this.brush.move, brushPosition);
  }

  // Called on Interaction
  brushMoved() {
    if (!d3.event.sourceEvent) return;
    const extent = d3.event.selection;
    if (extent) {
      let includeNaN = false;
      let max = -2.0;
      let min = this.chartData.extremes.min;
      if (
        extent[0] <= this.drawHeight + this.margin.top &&
        extent[1] >= this.drawHeight
      ) {
        includeNaN = true;
      }
      if (extent[0] < this.drawHeight) {
        max = this.yScale.invert(extent[0]);
      }
      if (extent[1] < this.drawHeight) {
        min = this.yScale.invert(extent[1]);
      }
      console.log(min);
      console.log(max);
      console.log(includeNaN);
      this.onUpdateFilter.emit({
        max: max,
        min: min,
        includeNaN: includeNaN,
      });
    } else {
      this.onUpdateFilter.emit({
        max: 1.0,
        min: -1.0,
        includeNaN: true,
      });
    }
  }
}
