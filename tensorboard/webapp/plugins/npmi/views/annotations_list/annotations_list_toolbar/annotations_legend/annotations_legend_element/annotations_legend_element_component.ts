import {
  ChangeDetectionStrategy,
  Component,
  Input,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'npmi-annotations-legend-element',
  templateUrl: './annotations_legend_element_component.ng.html',
  styleUrls: ['./annotations_legend_element_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsLegendElementComponent
  implements AfterViewInit, OnChanges {
  @Input() text!: string;
  @Input() color!: string;
  @Input() shape!: string;
  @Input() fromComponent!: string;
  // Drawing containers
  private svg: any;
  private mainContainer: any;

  ngOnChanges(changes: SimpleChanges) {
    this.redraw();
  }

  ngAfterViewInit(): void {
    this.svg = d3
      .select(
        `#annotations-legend-element-glyph-${CSS.escape(
          this.fromComponent
        )}-${CSS.escape(this.text)}`
      )
      .select('svg');
    this.mainContainer = this.svg.append('g');
    this.redraw();
  }

  private redraw() {
    if (this.initialized()) {
      this.draw();
    }
  }

  private initialized() {
    if (this.svg === undefined) {
      return false;
    }
    return true;
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
    } else if (this.shape == 'triangle') {
      this.mainContainer
        .append('g')
        .append('path')
        .attr('fill', this.color)
        .attr('stroke', 'black')
        .attr('d', 'M 2 0 L 10 0 L 7 5 L 10 10 L 2 10 Z');
    }
  }
}
