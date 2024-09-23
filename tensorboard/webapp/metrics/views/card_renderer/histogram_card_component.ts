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
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import {TimeSelectionWithAffordance} from '../../../widgets/card_fob/card_fob_types';
import {
  HistogramDatum,
  HistogramMode,
  TimeProperty,
} from '../../../widgets/histogram/histogram_types';
import {TimeSelection, XAxisType} from '../../types';
import {TimeSelectionView} from './utils';

@Component({
  standalone: false,
  selector: 'histogram-card-component',
  templateUrl: 'histogram_card_component.ng.html',
  styleUrls: ['histogram_card_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramCardComponent {
  readonly DataLoadState = DataLoadState;

  @Input() loadState!: DataLoadState;
  @Input() title!: string;
  @Input() tag!: string;
  @Input() runId!: string;
  @Input() data!: HistogramDatum[];
  @Input() mode!: HistogramMode;
  @Input() xAxisType!: XAxisType;
  @Input() runColorScale!: RunColorScale;
  @Input() showFullWidth!: boolean;
  @Input() isPinned!: boolean;
  @Input() linkedTimeSelection!: TimeSelectionView | null;
  @Input() isClosestStepHighlighted!: boolean | null;

  @Output() onFullSizeToggle = new EventEmitter<void>();
  @Output() onPinClicked = new EventEmitter<boolean>();
  @Output() onLinkedTimeSelectionChanged =
    new EventEmitter<TimeSelectionWithAffordance>();
  @Output() onLinkedTimeToggled = new EventEmitter();

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

  convertToTimeSelection(
    timeSelection: TimeSelectionView | null
  ): TimeSelection | null {
    if (timeSelection === null) {
      return null;
    }
    return {
      start: {step: timeSelection.startStep},
      end: timeSelection.endStep ? {step: timeSelection.endStep} : null,
    };
  }
}
