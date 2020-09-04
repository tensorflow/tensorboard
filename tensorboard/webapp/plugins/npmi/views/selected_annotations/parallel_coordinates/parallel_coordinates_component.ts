import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import * as d3 from 'd3';
import {Coordinate} from '../../../util/coordinate_data';

@Component({
  selector: 'parallel-coordinates-component',
  templateUrl: './parallel_coordinates_component.ng.html',
  styleUrls: ['./parallel_coordinates_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallelCoordinatesComponent implements AfterViewInit, OnChanges {
  @Input() coordinateData!: {
    coordinates: Coordinate[];
    extremes: {max: number; min: number};
  };
  @Input() activeMetrics!: string[];
  @ViewChild('chart', {static: true, read: ElementRef})
  private readonly svgElement!: ElementRef<SVGElement>;
  private width: number = 0;
  private chartWidth: number = 0;
  private readonly height: number = 300;
  private readonly margin = {top: 20, right: 40, bottom: 20, left: 40};
  private readonly chartHeight =
    this.height - this.margin.top - this.margin.bottom;
  // Drawing containers
  private svg!: d3.Selection<
    SVGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private mainContainer!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private coordinatesGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private labelsGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  // Scales and Axis
  private axisGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private gys: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >[] = [];
  // Scales
  private xScale!: d3.ScalePoint<string>;
  private yScale!: d3.ScaleLinear<number, number>;
  private yAxis?: d3.Axis<number | {valueOf(): number}>;

  private readonly rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];

  ngAfterViewInit(): void {
    this.svg = d3.select(this.svgElement.nativeElement);
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.coordinatesGroup = this.mainContainer.append('g');
    this.labelsGroup = this.mainContainer.append('g');
    this.axisGroup = this.mainContainer.append('g');
    this.xScale = d3.scalePoint<string>().padding(0.1);
    this.yScale = d3.scaleLinear().range([this.chartHeight, 0]);
    this.yAxis = d3.axisRight(this.yScale);
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.svg) {
      this.redraw();
    }
  }

  private redraw() {
    this.updateDimensions();
    this.updateAxes();
    this.draw();
  }

  private updateDimensions() {
    this.width = this.svgElement.nativeElement.clientWidth || 10;
    this.chartWidth = this.width - this.margin.left - this.margin.right;
  }

  private updateAxes() {
    this.xScale
      .rangeRound([0, this.chartWidth])
      .domain(this.activeMetrics.map((d) => d));
    this.yScale.domain([
      this.coordinateData.extremes.min,
      this.coordinateData.extremes.max,
    ]);
  }

  private draw() {
    this.drawAxes();
    this.drawAxisLabels();
    // this.drawCoordinates();
    // this.drawLabels();
  }

  private drawAxes() {
    const axes = this.axisGroup
      .selectAll<SVGGElement, unknown>('.axis-y')
      .data(this.activeMetrics);

    const axisEnters = axes
      .enter()
      .append('g')
      .attr('class', 'axis-y');

    axisEnters
      .merge(axes)
      .attr(
        'transform',
        function(this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)}, 0)`;
        }.bind(this)
      )
      .call(this.yAxis!);

    const gys = this.axisGroup
      .selectAll<SVGGElement, unknown>('.axis-y')
      .data(this.activeMetrics);

    axes.exit().remove();
  }

  private drawAxisLabels() {
    const axisBackgroundTexts = this.axisGroup
      .selectAll<SVGTextElement, unknown>('.axis-bg-text')
      .data(this.activeMetrics);

    const axisBackgroundTextEnters = axisBackgroundTexts
      .enter()
      .append('text')
      .attr('class', 'axis-bg-text')
      .attr('font-size', '13px')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white');

    axisBackgroundTextEnters
      .merge(axisBackgroundTexts)
      .text((d: string) => d)
      .attr(
        'transform',
        function(this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)! - 5}, ${this.yScale(
            this.coordinateData.extremes.min
          )}) rotate(-90)`;
        }.bind(this)
      );

    axisBackgroundTexts.exit().remove();

    const axisTexts = this.axisGroup
      .selectAll<SVGGElement, unknown>('.axis-text')
      .data(this.activeMetrics);

    const axisTextEnters = axisTexts
      .enter()
      .append('text')
      .attr('font-size', '13px')
      .attr('class', 'axis-text');

    axisTextEnters
      .merge(axisBackgroundTexts)
      .text((d: string) => d)
      .attr(
        'transform',
        function(this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)! - 5}, ${this.yScale(
            this.coordinateData.extremes.min
          )}) rotate(-90)`;
        }.bind(this)
      );

    axisTexts.exit().remove();
  }

  // private drawCoordinates() {
  //   let data = this.coordinatesData;
  //   // Draw the coordinate paths
  //   this.coordinatesGroup
  //     .selectAll('.coord')
  //     .data(data)
  //     .join('path')
  //     .attr('class', 'coord')
  //     .attr('fill', 'none')
  //     .attr('d', this.path.bind(this))
  //     .attr(
  //       'stroke',
  //       function(this: ParallelCoordinatesComponent, d: Coordinate) {
  //         const index = this.allRuns.indexOf(d.runId);
  //         return `rgba(${this.rgbColors[index]}, 1.0)`;
  //       }.bind(this)
  //     );
  //   // Draw invisible paths for a broader hover area
  //   this.coordinatesGroup
  //     .selectAll('.hiddenCoord')
  //     .data(data)
  //     .join('path')
  //     .attr('class', 'hiddenCoord')
  //     .attr('stroke-width', '10px')
  //     .attr('fill', 'none')
  //     .attr('d', this.path.bind(this))
  //     .attr('stroke', 'rgba(0, 0, 0, 0.0)')
  //     .on('mouseover', this.handleCoordinateMouseOver.bind(this))
  //     .on('mouseout', this.handleCoordinateMouseOut.bind(this));
  // }

  // private drawLabels() {
  //   const interpolationFactor = 30 / this.xScale.step();
  //   let data = this.coordinatesData.length < 30 ? this.coordinatesData : [];
  //   this.labelsGroup
  //     .selectAll('.label')
  //     .data(data)
  //     .join('text')
  //     .attr('class', 'label')
  //     .text(function(d: Coordinate) {
  //       return d.annotation;
  //     })
  //     .attr('font-size', '10px')
  //     .attr('x', this.xScale(this.allMetrics[0]) + 30)
  //     .attr(
  //       'y',
  //       function(this: ParallelCoordinatesComponent, d: Coordinate) {
  //         return (
  //           (1 - interpolationFactor) * this.yScale(d.data[0].value) +
  //           interpolationFactor * this.yScale(d.data[1].value)
  //         );
  //       }.bind(this)
  //     );
  // }

  // private path(d: Coordinate) {
  //   return d3.line()(
  //     d.data.map(
  //       function(this: any, p: CoordinateData) {
  //         let yPos = this.yScale(p.value);
  //         return [this.xScale(p.metric), yPos] as [number, number];
  //       }.bind(this)
  //     )
  //   );
  // }

  // private handleCoordinateMouseOver(this: any, d: Coordinate, i: number) {
  //   this.labelsGroup
  //     .selectAll('.label')
  //     .filter(function(x: Coordinate) {
  //       return !(x.annotation === d.annotation);
  //     })
  //     .style('opacity', 0.1);
  //   this.coordinatesGroup
  //     .selectAll('.coord')
  //     .filter(function(x: Coordinate) {
  //       return !(x.annotation === d.annotation);
  //     })
  //     .style('opacity', 0.1);
  // }

  // private handleCoordinateMouseOut(this: any) {
  //   this.labelsGroup.selectAll('.label').style('opacity', 1.0);
  //   this.coordinatesGroup.selectAll('.coord').style('opacity', 1.0);
  // }
}
