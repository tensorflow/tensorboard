import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  EventEmitter,
} from '@angular/core';

import * as d3 from 'd3';

import {MetricFilter, ValueData} from './../../../store/npmi_types';

@Component({
  selector: 'violin-filter-component',
  templateUrl: './violin_filter_component.ng.html',
  styleUrls: ['./violin_filter_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViolinFilterComponent implements AfterViewInit, OnChanges {
  @Input() metricName!: string;
  @Input() filter!: MetricFilter;
  @Input() activeRuns!: string[];
  @Input() violinData!: {data: ValueData[]; dataNaN: ValueData[]};
  @Output() onRemove = new EventEmitter<string>();
  extremeValues = {max: 1.0, min: -1.0};
  // get extremeValues(): {max: number; min: number} {
  //   let result = {max: -1.0, min: 1.0};
  //   this.violinData.forEach((value) => {
  //     result.max = result.max < value.value ? value.value : result.max;
  //     result.min = result.min > value.value ? value.value : result.min;
  //   });
  //   return result;
  // }
  get height(): number {
    return parseInt(
      d3.select(`#${CSS.escape(this.metricName)}`).style('height'),
      10
    );
  }
  get width(): number {
    return parseInt(
      d3.select(`#${CSS.escape(this.metricName)}`).style('width'),
      10
    );
  }
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
  private svg: any;
  private mainContainer: any;
  private drawContainer: any;
  // // Containers for axis and dots
  private dotsGroup: any;
  private yAxisGroup: any;
  private xAxisGroup: any;
  private miscGroup: any;
  private brushGroup: any;
  // Scales and axis
  private xScale: any;
  private xAxis: any;
  private yAxis: any;
  private yScale: any;
  private histogram: any;
  private xScaleNum: any;
  // Data Summary for the Histogram
  private sumStat: any;
  private maxNum = 0;
  private rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];

  ngAfterViewInit(): void {
    this.svg = d3.select(`#${CSS.escape(this.metricName)}`).select('svg');
    this.xScale = d3.scalePoint();
    this.yScale = d3.scaleLinear();
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
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.redraw();
  }

  redraw() {
    if (this.initialized()) {
      this.setAxisStyles();
      this.draw();
    }
  }

  private initialized() {
    if (this.svg === undefined) {
      return false;
    }
    return true;
  }

  setAxisStyles() {
    this.xScale = d3
      .scaleBand()
      .range([0, this.drawWidth])
      .domain(this.activeRuns)
      .padding(0.05);
    this.xAxis = d3.axisBottom(this.xScale);

    this.yScale = d3
      .scaleLinear()
      .range([this.drawHeight, 0])
      .domain([this.extremeValues.min, this.extremeValues.max]);
    this.yAxis = d3.axisLeft(this.yScale);

    this.histogram = d3
      .histogram()
      .domain(this.yScale.domain())
      .thresholds(this.yScale.ticks(20))
      .value((d) => d);

    this.sumStat = d3
      .nest()
      .key(function(d: any) {
        console.log(d.constructor.name);
        return d.run;
      })
      .rollup(
        function(this: ViolinFilterComponent, d: any) {
          let input = d.map(function(g: ValueData) {
            return g.nPMIValue;
          });
          let bins = this.histogram(input);
          return bins;
        }.bind(this)
      )
      .entries(this.violinData.data);

    let nanValues: {[runId: string]: number[]} = {};
    this.violinData.dataNaN.map((value) => {
      if (nanValues[value.run]) {
        nanValues[value.run].push(NaN);
      } else {
        nanValues[value.run] = [NaN];
      }
    });
    let bin = d3
      .histogram()
      .domain([-Infinity, Infinity])
      .thresholds(0)
      .value((d) => d);
    for (let i in this.sumStat) {
      if (nanValues[this.sumStat[i].key]) {
        let buckets = bin(nanValues[this.sumStat[i].key]);
        if (buckets[0].length > 0) {
          this.sumStat[i].value.unshift(buckets[0]);
        }
      }
      let allBins = this.sumStat[i].value;
      let lengths: number[] = allBins.map(function(a: any) {
        return a.length;
      });
      let longest: number = d3.max(lengths) as number;
      this.maxNum = longest > this.maxNum ? longest : this.maxNum;
    }

    this.xScaleNum = d3
      .scaleLinear()
      .range([0, this.xScale.bandwidth()])
      .domain([-this.maxNum, this.maxNum]);
  }

  draw() {
    this.drawAxis();
    this.drawPlot();
    // this.drawBrush();
  }

  drawAxis() {
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
      .call(this.yAxis);
    this.xAxisGroup
      .attr(
        'transform',
        `translate(${this.drawMargin.left},
      ${this.drawMargin.top + this.chartHeight})`
      )
      .call(this.xAxis);
    this.miscGroup
      .append('text')
      .style('fill', 'black')
      .text('NaN')
      .attr('font-size', '10px')
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('x', -5)
      .attr('y', this.chartHeight - this.drawMargin.top);
    this.mainContainer
      .append('line')
      .style('stroke', 'grey')
      .style('stroke-dasharray', '3, 3')
      .attr('x1', 0)
      .attr('y1', this.drawHeight + this.drawMargin.top)
      .attr('x2', this.chartWidth)
      .attr('y2', this.drawHeight + this.drawMargin.top);
  }

  drawPlot() {
    this.dotsGroup.selectAll('*').remove();
    this.dotsGroup
      .selectAll('.violinPlot')
      .data(this.sumStat)
      .join('g')
      .attr('class', 'violinPlot')
      .attr(
        'transform',
        function(this: ViolinFilterComponent, d: any) {
          return 'translate(' + this.xScale(d.key) + ' ,0)';
        }.bind(this)
      )
      .append('path')
      .style(
        'stroke',
        function(this: ViolinFilterComponent, d: any) {
          return `rgba(${this.rgbColors[0]}, 1.0)`;
        }.bind(this)
      )
      .style(
        'fill',
        function(this: ViolinFilterComponent, d: any) {
          return `rgba(${this.rgbColors[0]}, 0.3)`;
        }.bind(this)
      )
      .datum(function(d: any) {
        return d.value;
      })
      .attr(
        'd',
        d3
          .area()
          .x0(
            function(this: ViolinFilterComponent, d: any) {
              return this.xScaleNum(-d.length);
            }.bind(this)
          )
          .x1(
            function(this: ViolinFilterComponent, d: any) {
              return this.xScaleNum(d.length);
            }.bind(this)
          )
          .y(
            function(this: ViolinFilterComponent, d: any) {
              if (d.x0 === -Infinity) {
                return this.chartHeight - this.drawMargin.top;
              }
              return this.yScale((d.x1 + d.x0) / 2.0);
            }.bind(this)
          )
          .curve(d3.curveCatmullRom)
      );
  }

  /*
  drawBrush() {
    let brush = d3
      .brushY()
      .extent([
        [
          this.margin.left + this.drawMargin.left,
          this.margin.top + this.drawMargin.top,
        ],
        [
          this.width - this.margin.right,
          this.height - this.margin.bottom / 2.0,
        ],
      ])
      .on('end', this.updateBrush.bind(this));
    this.svg.selectAll('.brush').remove();
    this.brushGroup = this.svg
      .append('g')
      .attr('class', 'brush')
      .call(brush)
      .call(brush.move, this.getBrushPosition());
  }

  private getBrushPosition(): number[] {
    let brushPosition = [
      this.margin.top + this.drawMargin.top,
      this.height - this.margin.bottom / 2.0,
    ];
    let topMargins = this.margin.top + this.drawMargin.top;
    if (this.filter.max < this.filter.min) {
      if (this.filter.includeNaN) {
        // Only NaN selected
        brushPosition[0] = this.chartHeight + this.margin.top - 20;
      } else {
        // Nothing selected
        brushPosition[0] = brushPosition[1];
      }
    } else {
      const max =
        this.filter.max > this.extremeValues.max
          ? this.extremeValues.max
          : this.filter.max;
      const min =
        this.filter.min < this.extremeValues.min
          ? this.extremeValues.min
          : this.filter.min;
      if (!this.filter.includeNaN) {
        // Min does not reach NaN
        brushPosition[1] = this.yScale(min) + topMargins;
      }
      brushPosition[0] = this.yScale(max) + topMargins;
    }
    return brushPosition;
  }

  updateBrush() {
    let extent = d3.event.selection;
    if (extent) {
      let includeNaN = false;
      let max = -2.0;
      let min = this.extremeValues.min;
      let topMargins = this.margin.top + this.drawMargin.top;
      if (
        extent[0] < this.chartHeight + topMargins &&
        extent[1] > this.chartHeight + topMargins
      ) {
        includeNaN = true;
      }
      if (extent[0] < this.chartHeight + this.drawMargin.top) {
        max = this.yScale.invert(extent[0] - topMargins);
      }
      if (extent[1] < this.chartHeight + this.drawMargin.top) {
        min = this.yScale.invert(extent[1] - topMargins);
      }
      this.store.dispatch(
        updateAnnotationFilter({metric: this.metricName, max, min, includeNaN})
      );
    } else {
      this.store.dispatch(
        updateAnnotationFilter({
          metric: this.metricName,
          max: 1.0,
          min: -1.0,
          includeNaN: true,
        })
      );
    }
  }

  removeMetric() {
    this.store.dispatch(removeAnnotationFilter({metric: this.metricName}));
    this.store.dispatch(removeMetricActive({metric: this.metricName}));
  }
  */
}
