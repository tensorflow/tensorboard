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
  Input,
  ViewChild,
} from '@angular/core';
import * as d3 from '../../../../../../third_party/d3';

@Component({
  selector: 'npmi-legend-element',
  templateUrl: './legend_element_component.ng.html',
  styleUrls: ['./legend_element_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendElementComponent implements AfterViewInit {
  @Input() text!: string;
  @Input() color!: string;
  @Input() shape!: string;
  @ViewChild('glyph', {static: true, read: ElementRef})
  private readonly glyphSVG!: ElementRef<SVGElement>;
  // Drawing containers
  private svg: any;
  private mainContainer: any;

  ngAfterViewInit(): void {
    this.svg = d3.select(this.glyphSVG.nativeElement);
    this.mainContainer = this.svg.append('g');
    this.draw();
  }

  private draw() {
    if (this.shape == 'circle') {
      this.mainContainer
        .append('circle')
        .attr('fill', this.color)
        .attr('stroke', 'black')
        .attr('cx', 5)
        .attr('cy', 5)
        .attr('r', 5);
    } else if (this.shape == 'bar') {
      this.mainContainer
        .append('rect')
        .attr('fill', this.color)
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 10)
        .attr('height', 10);
    } else if (this.shape == 'runIndicator') {
      this.mainContainer
        .append('g')
        .append('path')
        .attr('fill', this.color)
        .attr('stroke', 'black')
        .attr('d', 'M 2 0 L 10 0 L 7 5 L 10 10 L 2 10 Z');
    }
  }
}
