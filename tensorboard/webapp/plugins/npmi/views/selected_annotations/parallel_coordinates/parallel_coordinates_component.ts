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

  private readonly height: number = 300;
  private width: number = 0;
  private margin = {top: 20, right: 40, bottom: 20, left: 40};
  private backgroundMargin = {top: 10, right: 10, bottom: 10, left: 10};
  get chartWidth(): number {
    return this.width - this.margin.left - this.margin.right;
  }
  get chartHeight(): number {
    return this.height - this.margin.top - this.margin.bottom;
  }
  // group containers (X axis, Y axis and coordinates)
  private axisGroup: any;
  private gys: any[] = [];
  // Scales and Axis
  private xScale: any;
  private yAxis: any;
  private yScale: any;
  // Drawing containers
  private svg: any;
  private mainContainer: any;
  private coordinatesGroup: any;
  private labelsGroup: any;
  private backgroundGroup: any;
  private rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];

  ngAfterViewInit(): void {
    this.svg = d3.select(this.svgElement.nativeElement);
    this.xScale = d3.scalePoint();
    this.yScale = d3.scaleLinear();
    this.backgroundGroup = this.svg.append('g').attr(
      'transform',
      `translate(${this.backgroundMargin.left},
                   ${this.backgroundMargin.top})`
    );
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.coordinatesGroup = this.mainContainer.append('g');
    this.labelsGroup = this.mainContainer.append('g');
    this.axisGroup = this.mainContainer.append('g');
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.svg) {
      this.redraw();
    }
  }

  private redraw() {
    this.width = this.svgElement.nativeElement.clientWidth || 10;
    this.updateAxes();
    this.draw();
  }

  private updateAxes() {
    this.xScale = d3.scalePoint();
    this.yScale = d3.scaleLinear();

    this.xScale
      .rangeRound([0, this.chartWidth])
      .padding(0.1)
      .domain(this.activeMetrics.map((d) => d));
    this.yScale
      .range([this.chartHeight, 0])
      .domain([
        this.coordinateData.extremes.min,
        this.coordinateData.extremes.max,
      ]);
    this.yAxis = d3.axisRight(this.yScale);
  }

  private draw() {
    this.drawAxis();
    // this.drawCoordinates();
    // this.drawLabels();
  }

  private drawAxis() {
    this.gys = [];
    this.axisGroup.selectAll('*').remove();
    for (const it of this.activeMetrics) {
      this.gys.push(this.axisGroup.append('g').attr('class', 'axis axis--y'));
    }
    for (const it in this.activeMetrics) {
      if (this.activeMetrics[it]) {
        this.gys[it]
          .attr(
            'transform',
            `translate(${this.xScale(this.activeMetrics[it])}, 0)`
          )
          .call(this.yAxis);
        this.drawAxisLabel(this.gys[it], parseInt(it));
      }
    }
  }

  private drawAxisLabel(group: any, iterator: number) {
    group
      .append('text')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white')
      .text(this.activeMetrics[iterator])
      .attr(
        'transform',
        `translate(-5, ${this.yScale(this.coordinateData.extremes.min)})
                                    rotate(-90)`
      );
    group
      .append('text')
      .attr('text-anchor', 'start')
      .style('fill', 'black')
      .text(this.activeMetrics[iterator])
      .attr(
        'transform',
        `translate(-5, ${this.yScale(this.coordinateData.extremes.min)})
                                    rotate(-90)`
      );
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
