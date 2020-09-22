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
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {DataLoadState} from '../../../types/data';

import {RunColorScale} from '../../../types/ui';
import {HistogramComponent} from '../../../widgets/histogram/histogram_component';
import {
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from '../../../widgets/histogram/histogram_types';
import {XAxisType} from '../../types';

const RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = 50;

@Component({
  selector: 'histogram-card-component',
  templateUrl: 'histogram_card_component.ng.html',
  styleUrls: ['histogram_card_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramCardComponent {
  readonly RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS = RESIZE_REDRAW_DEBOUNCE_TIME_IN_MS;
  readonly DataLoadState = DataLoadState;

  @Input() loadState!: DataLoadState;
  @Input() title!: string;
  @Input() tag!: string;
  @Input() runId!: string;
  @Input() data!: HistogramDatum[];
  @Input() mode!: HistogramMode;
  @Input() xAxisType!: XAxisType;
  @Input() runColorScale!: RunColorScale;
  @Input() showFullSize!: boolean;
  @Input() isPinned!: boolean;

  @Output() onFullSizeToggle = new EventEmitter<void>();
  @Output() onPinClicked = new EventEmitter<boolean>();

  /* the component is rendered inside *ngIf */
  @ViewChild(HistogramComponent) histogramComponent?: HistogramComponent;

  constructor(private readonly ref: ElementRef) {}

  timeProperty(xAxisType: XAxisType) {
    switch (xAxisType) {
      case XAxisType.STEP:
        return TimeProperty.STEP;
      case XAxisType.WALL_TIME:
        return TimeProperty.WALL_TIME;
      case XAxisType.RELATIVE:
        return TimeProperty.RELATIVE;
      default:
        throw new Error('Invalid xAxisType for histogram time property.');
    }
  }

  redraw() {
    if (this.histogramComponent) {
      // Only redraw when it is visible (and thus have width and height).
      if (this.ref.nativeElement.clientHeight) {
        this.histogramComponent.redraw();
      }
    }
  }
}
