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
import '../../tb_polymer_interop_types';

import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';

import {
  ColorScale,
  HistogramData,
  HistogramMode,
  TimeProperty,
} from './histogram_types';

@Component({
  selector: 'tb-histogram',
  template: '',
  styles: [
    `
      :host {
        display: flex;
      }
    `,
  ],
})
export class HistogramComponent implements OnInit, OnChanges {
  private readonly element = document.createElement('vz-histogram-timeseries');

  @Input() mode: HistogramMode = HistogramMode.OFFSET;

  @Input() timeProperty: TimeProperty = TimeProperty.STEP;

  /**
   * TODO(psybuzz): VzHistogram only needs 'name', 'colorScale' properties to
   * determine the histogram color. We could replace these with a single 'color'
   * property to make the interface simpler.
   */
  @Input() colorScale?: ColorScale;

  @Input() name!: string;

  @Input() data!: HistogramData;

  constructor(private readonly host: ElementRef) {
    // Must set optional input values here since they won't be part of the
    // ngOnChanges if the parent does not override the value.
    this.element.mode = this.mode;
    this.element.timeProperty = this.timeProperty;
  }

  ngOnInit() {
    this.host.nativeElement.appendChild(this.element);
  }

  /**
   * TODO(psybuzz): perform the same re-bucketing logic as the Polymer side,
   * instead of accepting the data as-is.
   *
   * The Polymer side forces the histogram at each step into a compressed
   * histogram with exactly 30 bins for a couple reasons:
   * - High number of bins will render visual artifacts.
   * - VzHistogramTimeseries expects all histograms at each step to have the
   *   same number of bins. Hovering over a HistogramComponent with bin count
   *   inequality throws errors.
   * See tensorboard/plugins/histogram/tf_histogram_dashboard/histogramCore.ts
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['name'] || changes['data']) {
      const formattedData = this.data.map((datum) => {
        const {step, bins} = datum;
        return {step, bins, wall_time: datum.wallTime};
      });
      this.element.setSeriesData(this.name, formattedData);
    }

    if (changes['mode']) {
      this.element.mode = this.mode;
    }

    if (changes['timeProperty']) {
      this.element.timeProperty = this.timeProperty;
    }

    if (changes['colorScale'] && this.colorScale) {
      this.element.colorScale = this.colorScale;
    }
  }

  redraw() {
    this.element.redraw();
  }
}
