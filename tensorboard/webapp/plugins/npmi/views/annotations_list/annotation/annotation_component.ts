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
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {Run} from '../../../../../runs/store/runs_types';
import * as d3 from '../../../../../third_party/d3';
import {RunColorScale} from '../../../../../types/ui';
import {AnnotationSort, SortOrder, ValueData} from '../../../store/npmi_types';
import {stripMetricString} from '../../../util/metric_type';

@Component({
  selector: 'annotation-component',
  templateUrl: './annotation_component.ng.html',
  styleUrls: ['./annotation_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AnnotationComponent implements AfterViewInit, OnChanges {
  @Input() data!: ValueData[];
  @Input() maxCount!: number;
  @Input() selectedAnnotations!: string[];
  @Input() flaggedAnnotations!: string[];
  @Input() hiddenAnnotations!: string[];
  @Input() activeMetrics!: string[];
  @Input() numActiveRuns!: number;
  @Input() showCounts!: boolean;
  @Input() annotation!: string;
  @Input() runHeight!: number;
  @Input() hasEmbedding!: boolean;
  @Input() sort!: AnnotationSort;
  // Only to trigger OnChanges to re-render the component.
  @Input() sidebarWidth!: number;
  @Input() colorScale!: RunColorScale;
  @Input() runIdToRuns!: Map<string, Run>;
  @ViewChild('chart', {static: true, read: ElementRef})
  private readonly annotationContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('hintClip', {static: true, read: ElementRef})
  private readonly clipPathElement!: ElementRef<SVGClipPathElement>;
  @HostBinding('class.selected-row') selected = false;
  @HostListener('window:resize')
  onResize(event: Event) {
    this.redraw();
  }
  @Output() onShowSimilarAnnotations = new EventEmitter();
  readonly SortOrder = SortOrder;
  private width: number = 10;
  private chartWidth: number = 10;
  private chartHeight: number = 10;
  private readonly maxDotRadius = 10;
  private readonly countDotOffset = 70;
  private readonly countTextPadding = 2;
  private readonly margin = {top: 0, right: 0, bottom: 0, left: 100};
  private readonly strokeColor = '#fff';
  private textClass = 'default-text';
  private runs: string[] = [];
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
  private barsGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private countDotsGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private textsGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private countTextsGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  private runHintGroup!: d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement | null,
    undefined
  >;
  // Scales
  private xScale!: d3.ScalePoint<string>;
  private yScale!: d3.ScalePoint<string>;
  private sizeScale!: d3.ScaleLinear<number, number>;
  private countSizeScale!: d3.ScaleLinear<number, number>;

  ngAfterViewInit(): void {
    this.svg = d3.select(this.annotationContainer.nativeElement).select('svg');
    this.xScale = d3.scalePoint<string>().padding(0);
    this.yScale = d3.scalePoint<string>().padding(0);
    this.sizeScale = d3.scaleLinear().domain([0.0, 1.0]);
    this.countSizeScale = d3.scaleLinear().range([2, this.maxDotRadius]);
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.barsGroup = this.mainContainer.append('g');
    this.countDotsGroup = this.mainContainer.append('g');
    this.textsGroup = this.mainContainer.append('g');
    this.countTextsGroup = this.mainContainer.append('g');
    this.runHintGroup = this.svg.append('g');
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.svg) {
      this.redraw();
    }
  }

  private redraw() {
    this.selected = this.selectedAnnotations.includes(this.annotation);
    this.updateDimensions();
    this.setTextClass();
    this.updateAxes();
    this.draw();
  }

  // Initializing/Updating the visualization props.
  private updateDimensions() {
    const runs = new Set<string>();
    this.data.forEach((element) => {
      runs.add(element.run);
    });
    this.runs = [...runs];
    // Needs to be numActiveRuns * runHeight because of cdk-virtual-croll
    this.svg.style('height', `${this.numActiveRuns * this.runHeight}px`);
    // Needs to be runs.length * runHeight as this is used for y-pos scales
    this.chartHeight =
      this.runs.length * this.runHeight - this.margin.top - this.margin.bottom;
    this.width = this.annotationContainer.nativeElement.clientWidth || 10;
    this.chartWidth = this.width - this.margin.left - this.margin.right;
  }

  private setTextClass() {
    this.textClass = 'default-text';
    if (this.flaggedAnnotations.includes(this.annotation)) {
      this.textClass = 'flag-text';
    } else if (this.hiddenAnnotations.includes(this.annotation)) {
      this.textClass = 'hidden-text';
    }
  }

  private updateAxes() {
    this.xScale
      .rangeRound([
        0,
        this.chartWidth - this.chartWidth / this.activeMetrics.length,
      ])
      .domain(this.activeMetrics.map((d) => stripMetricString(d)));

    this.yScale
      .rangeRound([0, this.chartHeight - this.runHeight])
      .domain(this.runs);

    this.sizeScale.range([0, this.chartWidth / this.activeMetrics.length]);

    this.countSizeScale.domain([0, this.maxCount]);
  }

  // Drawing UI
  private draw() {
    this.drawRunIndicators();
    this.drawRunHintTexts();
    this.drawBars();
    this.drawTexts();
    if (this.showCounts) {
      this.drawCountDots();
      this.drawCountTexts();
    } else {
      this.countDotsGroup.selectAll('.count-dot').remove();
      this.countTextsGroup.selectAll('.count-background-text').remove();
      this.countTextsGroup.selectAll('.count-text').remove();
    }
  }

  private drawRunIndicators() {
    d3.select(this.clipPathElement.nativeElement)
      .select('rect')
      .attr('width', this.margin.left - 30)
      .attr('height', this.chartHeight);

    const indicators = this.runHintGroup
      .selectAll<SVGGElement, unknown>('.hint')
      .data(this.runs);

    const indicatorEnters = indicators
      .enter()
      .append('g')
      .attr('class', 'hint');

    indicatorEnters
      .append('path')
      .attr('d', 'M 0 0 L 15 0 L 10 10 L 15 20 L 0 20 Z');

    indicatorEnters
      .merge(indicators)
      .attr(
        'transform',
        function (this: AnnotationComponent, d: string) {
          return `translate(10, ${this.yScale(d)! + 5})`;
        }.bind(this)
      )
      .attr(
        'fill',
        function (this: AnnotationComponent, d: string) {
          return this.colorScale(d);
        }.bind(this)
      );

    indicators.exit().remove();
  }

  private drawRunHintTexts() {
    const hintTexts = this.runHintGroup
      .selectAll<SVGTextElement, unknown>('.hint-text')
      .data(this.runs);

    const hintTextEnters = hintTexts
      .enter()
      .append('text')
      .attr('x', 25)
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .attr('clip-path', 'url(#hint-clip)');

    hintTextEnters
      .merge(hintTexts)
      .attr(
        'y',
        function (this: AnnotationComponent, d: string) {
          return this.yScale(d)! + 15;
        }.bind(this)
      )
      .attr('class', `hint-text ${this.textClass}`)
      .text((d: string) => {
        return this.runIdToRuns.get(d)?.name || '';
      });

    hintTexts.exit().remove();
  }

  private drawBars() {
    const bars = this.barsGroup
      .selectAll<SVGRectElement, unknown>('.bar')
      .data(this.data);

    const barEnters = bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('height', 20);

    barEnters
      .merge(bars)
      .attr('fill', (d: ValueData) => {
        if (d.nPMIValue === null) {
          return '';
        } else if (d.nPMIValue >= 0) {
          return d3.interpolateBlues(d.nPMIValue);
        } else {
          return d3.interpolateReds(d.nPMIValue * -1);
        }
      })
      .attr(
        'x',
        function (this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)!;
        }.bind(this)
      )
      .attr(
        'y',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 5;
        }.bind(this)
      )
      .attr(
        'width',
        function (this: AnnotationComponent, d: ValueData) {
          if (d.nPMIValue === null) {
            return 0;
          } else {
            return this.sizeScale(Math.abs(d.nPMIValue));
          }
        }.bind(this)
      );

    bars.exit().remove();
  }

  private drawCountDots() {
    const countDots = this.countDotsGroup
      .selectAll<SVGCircleElement, unknown>('.count-dot')
      .data(this.data);

    const countDotEnters = countDots
      .enter()
      .append('circle')
      .attr('class', 'count-dot')
      .attr('stroke', 'black');

    countDotEnters
      .merge(countDots)
      .attr(
        'fill',
        function (this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return '';
          } else {
            return d3.interpolateGreys(d.countValue / this.maxCount);
          }
        }.bind(this)
      )
      .attr(
        'cx',
        function (this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + this.countDotOffset;
        }.bind(this)
      )
      .attr(
        'cy',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + this.runHeight / 2.0;
        }.bind(this)
      )
      .attr(
        'r',
        function (this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return 0;
          } else {
            return this.countSizeScale(d.countValue);
          }
        }.bind(this)
      );

    countDots.exit().remove();
  }

  private drawTexts() {
    const backgroundTexts = this.textsGroup
      .selectAll<SVGTextElement, unknown>('.npmi-background-text')
      .data(this.data);

    const backgroundTextEnters = backgroundTexts
      .enter()
      .append('text')
      .attr('class', 'npmi-background-text')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', this.strokeColor)
      .attr('font-size', '13px')
      .attr('alignment-baseline', 'middle');

    backgroundTextEnters
      .merge(backgroundTexts)
      .attr(
        'x',
        function (this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + this.runHeight / 2.0;
        }.bind(this)
      )
      .text((d: ValueData) => {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    backgroundTexts.exit().remove();

    const texts = this.textsGroup
      .selectAll<SVGTextElement, unknown>('.npmi-text')
      .data(this.data);

    const textEnters = texts
      .enter()
      .append('text')
      .attr('class', 'npmi-text')
      .attr('font-size', '13px')
      .attr('alignment-baseline', 'middle');

    textEnters
      .merge(texts)
      .attr(
        'x',
        function (this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + this.runHeight / 2.0;
        }.bind(this)
      )
      .text((d: ValueData) => {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    texts.exit().remove();
  }

  private drawCountTexts() {
    const countBackgroundTexts = this.countTextsGroup
      .selectAll<SVGTextElement, unknown>('.count-background-text')
      .data(this.data);

    const countBackgroundTextEnters = countBackgroundTexts
      .enter()
      .append('text')
      .attr('class', 'count-background-text')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', this.strokeColor)
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle');

    countBackgroundTextEnters
      .merge(countBackgroundTexts)
      .attr(
        'x',
        function (this: AnnotationComponent, d: ValueData) {
          return (
            this.xScale(d.metric)! +
            this.countDotOffset +
            this.countTextPadding +
            this.maxDotRadius
          );
        }.bind(this)
      )
      .attr(
        'y',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + this.runHeight / 2.0;
        }.bind(this)
      )
      .text((d: ValueData) => {
        if (d.countValue === null) {
          return '';
        }
        return Intl.NumberFormat().format(d.countValue);
      });

    countBackgroundTexts.exit().remove();

    const countTexts = this.countTextsGroup
      .selectAll<SVGTextElement, unknown>('.count-text')
      .data(this.data);

    const countTextEnters = countTexts
      .enter()
      .append('text')
      .attr('class', 'count-text')
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle');

    countTextEnters
      .merge(countTexts)
      .attr(
        'x',
        function (this: AnnotationComponent, d: ValueData) {
          return (
            this.xScale(d.metric)! +
            this.countDotOffset +
            this.countTextPadding +
            this.maxDotRadius
          );
        }.bind(this)
      )
      .attr(
        'y',
        function (this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + this.runHeight / 2.0;
        }.bind(this)
      )
      .text((d: ValueData) => {
        if (d.countValue === null) {
          return '';
        }
        return Intl.NumberFormat().format(d.countValue);
      });

    countTexts.exit().remove();
  }

  similaritySort(event: Event) {
    if (this.hasEmbedding) {
      event.stopPropagation();
      this.onShowSimilarAnnotations.emit();
    }
  }
}
