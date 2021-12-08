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
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as d3 from '../../../../../third_party/d3';
import {RunColorScale} from '../../../../../types/ui';
import {Coordinate} from '../../../util/coordinate_data';
import {ValueData} from './../../../store/npmi_types';

@Component({
  selector: 'parallel-coordinates-component',
  templateUrl: './parallel_coordinates_component.ng.html',
  styleUrls: ['./parallel_coordinates_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallelCoordinatesComponent implements AfterViewInit, OnChanges {
  @Input() activeMetrics!: string[];
  @Input() coordinateData!: {
    coordinates: Coordinate[];
    extremes: {max: number; min: number};
  };
  // Only to trigger OnChanges to re-render the component.
  @Input() sidebarWidth!: number;
  @Input() colorScale!: RunColorScale;
  @ViewChild('chart', {static: true, read: ElementRef})
  private readonly svgElement!: ElementRef<SVGElement>;
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.redraw();
  }
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
  // Scales
  private xScale!: d3.ScalePoint<string>;
  private yScale!: d3.ScaleLinear<number, number>;
  private yAxis?: d3.Axis<number | {valueOf(): number}>;

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
    this.xScale.rangeRound([0, this.chartWidth]).domain(this.activeMetrics);
    this.yScale.domain([
      this.coordinateData.extremes.min,
      this.coordinateData.extremes.max,
    ]);
  }

  private draw() {
    this.drawAxes();
    this.drawAxisLabels();
    this.drawCoordinates();
    this.drawLabels();
  }

  private drawAxes() {
    const axes = this.axisGroup
      .selectAll<SVGGElement, unknown>('.axis-y')
      .data(this.activeMetrics);

    const axisEnters = axes.enter().append('g').attr('class', 'axis-y');

    axisEnters
      .merge(axes)
      .attr(
        'transform',
        function (this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)}, 0)`;
        }.bind(this)
      )
      .call(this.yAxis!);

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
        function (this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)! - 5}, ${this.yScale(
            this.coordinateData.extremes.min
          )}) rotate(-90)`;
        }.bind(this)
      );

    axisBackgroundTexts.exit().remove();

    const axisTexts = this.axisGroup
      .selectAll<SVGTextElement, unknown>('.axis-text')
      .data(this.activeMetrics);

    const axisTextEnters = axisTexts
      .enter()
      .append('text')
      .attr('font-size', '13px')
      .attr('class', 'axis-text');

    axisTextEnters
      .merge(axisTexts)
      .text((d: string) => d)
      .attr(
        'transform',
        function (this: ParallelCoordinatesComponent, d: string) {
          return `translate(${this.xScale(d)! - 5}, ${this.yScale(
            this.coordinateData.extremes.min
          )}) rotate(-90)`;
        }.bind(this)
      );

    axisTexts.exit().remove();
  }

  private drawCoordinates() {
    // Draw the coordinate paths
    const coords = this.coordinatesGroup
      .selectAll<SVGPathElement, unknown>('.coord')
      .data(this.coordinateData.coordinates);

    const coordEnters = coords
      .enter()
      .append('path')
      .attr('class', 'coord')
      .attr('fill', 'none');

    coordEnters
      .merge(coords)
      .attr('d', this.path.bind(this))
      .attr(
        'stroke',
        function (this: ParallelCoordinatesComponent, d: Coordinate) {
          return this.colorScale(d.runId);
        }.bind(this)
      );

    coords.exit().remove();

    // Draw invisible paths for a broader hover area
    const hiddenCoords = this.coordinatesGroup
      .selectAll<SVGPathElement, unknown>('.hiddenCoord')
      .data(this.coordinateData.coordinates);

    const hiddenCoordEnters = hiddenCoords
      .enter()
      .append('path')
      .attr('class', 'hiddenCoord')
      .attr('stroke-width', '10px')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0, 0, 0, 0.0)')
      .on('mouseover', this.handleCoordinateMouseOver.bind(this))
      .on('mouseout', this.handleCoordinateMouseOut.bind(this));

    hiddenCoordEnters.merge(hiddenCoords).attr('d', this.path.bind(this));

    hiddenCoords.exit().remove();
  }

  private path(d: Coordinate) {
    const sorted = d.values.sort(
      (a, b) =>
        this.activeMetrics.indexOf(a.metric) -
        this.activeMetrics.indexOf(b.metric)
    );
    return d3.line()(
      d.values.map(
        function (this: any, p: ValueData) {
          let yPos = this.yScale(p.nPMIValue);
          return [this.xScale(p.metric), yPos] as [number, number];
        }.bind(this)
      )
    );
  }

  private handleCoordinateMouseOver(
    this: ParallelCoordinatesComponent,
    d: Coordinate,
    i: number
  ) {
    this.labelsGroup
      .selectAll<SVGTextElement, Coordinate>('.coordinate-label')
      .filter(function (x: Coordinate) {
        return !(x.annotation === d.annotation);
      })
      .style('opacity', 0.1);
    this.coordinatesGroup
      .selectAll<SVGPathElement, Coordinate>('.coord')
      .filter(function (x: Coordinate) {
        return !(x.annotation === d.annotation);
      })
      .style('opacity', 0.1);
  }

  private handleCoordinateMouseOut(this: ParallelCoordinatesComponent) {
    this.labelsGroup.selectAll('.coordinate-label').style('opacity', 1.0);
    this.coordinatesGroup.selectAll('.coord').style('opacity', 1.0);
  }

  private drawLabels() {
    const interpolationFactor = 30 / this.xScale.step();
    const data =
      this.coordinateData.coordinates.length < 30
        ? this.coordinateData.coordinates
        : [];

    const coordinateLabels = this.labelsGroup
      .selectAll<SVGTextElement, unknown>('.coordinate-label')
      .data(data);

    const coordinateLabelEnters = coordinateLabels
      .enter()
      .append('text')
      .attr('class', 'coordinate-label')
      .attr('font-size', '10px');

    coordinateLabelEnters
      .merge(coordinateLabels)
      .text(function (d: Coordinate) {
        return d.annotation;
      })
      .attr('x', this.xScale(this.activeMetrics[0])! + 30)
      .attr(
        'y',
        function (this: ParallelCoordinatesComponent, d: Coordinate) {
          const y0 = this.yScale(
            d.values[0].nPMIValue ? d.values[0].nPMIValue : 0
          );
          const y1 = this.yScale(
            d.values[1].nPMIValue ? d.values[1].nPMIValue : 0
          );
          return (1 - interpolationFactor) * y0 + interpolationFactor * y1;
        }.bind(this)
      );

    coordinateLabels.exit().remove();
  }
}
