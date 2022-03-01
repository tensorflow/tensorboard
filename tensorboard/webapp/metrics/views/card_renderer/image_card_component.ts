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
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import {ViewSelectedTime} from './utils';

const TICK_WIDTH = 14; // In px

@Component({
  selector: 'image-card-component',
  templateUrl: 'image_card_component.ng.html',
  styleUrls: ['image_card_component.css'],
  host: {
    '[class.actual-size]': 'showActualSize',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCardComponent {
  readonly DataLoadState = DataLoadState;
  sliderStartPosition = '';
  sliderTrackWidth = '';

  @Input() loadState!: DataLoadState;
  @Input() title!: string;
  @Input() tag!: string;
  @Input() runId!: string;
  @Input() sample!: number;
  @Input() numSample!: number;
  @Input() imageUrl!: string | null;
  @Input() stepIndex!: number | null;
  @Input() stepValues!: number[];
  @Input() brightnessInMilli!: number;
  @Input() contrastInMilli!: number;
  @Input() showActualSize!: boolean;
  @Input() runColorScale!: RunColorScale;
  @Input() allowToggleActualSize!: boolean;
  @Input() isPinned!: boolean;
  @Input() selectedSteps!: number[];
  @Input() selectedTime?: ViewSelectedTime | null = null;

  @Output() onActualSizeToggle = new EventEmitter<void>();
  @Output() stepIndexChange = new EventEmitter<number>();
  @Output() onPinClicked = new EventEmitter<boolean>();

  cssFilter() {
    const brightnessScale = this.brightnessInMilli / 1000;
    const contrastPercent = this.contrastInMilli / 10;
    return `contrast(${contrastPercent}%) brightness(${brightnessScale})`;
  }

  onSliderInput($event: any) {
    // Angular Material Slider's MatSliderChange has a loose `number | null`
    // type for 'value'. However, it's actual implementation can only emit a
    // `number` on input events.
    // https://github.com/angular/components/blob/master/src/material/slider/slider.ts
    this.stepIndexChange.emit($event.value as number);
  }

  changeDistinct(change: SimpleChange) {
    return change.currentValue !== change.previousValue;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['selectedSteps'] &&
        this.changeDistinct(changes['selectedSteps'])) ||
      (changes['selectedTime'] && this.changeDistinct(changes['selectedTime']))
    ) {
      this.renderRangeSlider();
    }
  }

  renderRangeSlider() {
    if (
      !this.selectedTime ||
      !this.selectedTime.endStep ||
      this.selectedTime.clipped
    ) {
      return;
    }

    const boundSize = this.stepValues.length - 1;
    const startStep =
      this.selectedTime.startStep < this.stepValues[0]
        ? this.stepValues[0]
        : this.selectedTime.startStep;
    const endStep =
      this.selectedTime.endStep > this.stepValues[boundSize]
        ? this.stepValues[boundSize]
        : this.selectedTime.endStep;

    const {startPosition, width} = this.getTrackStartPositionAndWidth(
      startStep,
      endStep,
      boundSize
    );

    this.sliderStartPosition = `${startPosition * 100}%`;
    this.sliderTrackWidth = `${width * 100}%`;
  }

  getTrackStartPositionAndWidth(
    startStep: number,
    endStep: number,
    boundSize: number
  ) {
    const sliderUnit = 1 / boundSize;
    let startPosition = 0;
    let width = 0;
    let i = 0;

    // Calculates the track start position
    for (; i < this.stepValues.length - 1; i++) {
      const currentStep = this.stepValues[i];
      const nextStep = this.stepValues[i + 1];
      if (currentStep <= startStep && startStep <= nextStep) {
        startPosition += (startStep - currentStep) / (nextStep - currentStep);
        break;
      }
    }
    startPosition = (startPosition + i) * sliderUnit;

    // Calculates the track width
    for (; i < this.stepValues.length - 1; i++) {
      const currentStep = this.stepValues[i];
      const nextStep = this.stepValues[i + 1];
      // --o--S====E--o--
      //  cur        next
      if (startStep >= currentStep && endStep <= nextStep) {
        width = (endStep - startStep) / (nextStep - currentStep);
        break;
      }
      // --o--S==o==E--o--
      //  cur   next
      if (startStep >= currentStep && endStep >= nextStep) {
        width += (nextStep - startStep) / (nextStep - currentStep);
        continue;
      }

      // -=o=====o==E--o--
      //  cur   next
      if (endStep >= nextStep) {
        width += 1;
      } else {
        // -=o==E--o--
        //  cur   next
        width += (endStep - currentStep) / (nextStep - currentStep);
        break;
      }
    }
    width = width * sliderUnit;

    if (startPosition > 1 || startPosition < 0) {
      startPosition = 0;
    }

    return {startPosition, width};
  }

  getLinkedTimeTickLeftStyle(step: number) {
    if (this.stepValues.indexOf(step) == -1) {
      throw new Error(
        'Invalid stepIndex: stepIndex value is not included in stepValues'
      );
    }
    return `${
      (this.stepValues.indexOf(step) / (this.stepValues.length - 1)) * 100
    }%`;
  }

  getLinkedTimeTickMarginLeftStyle(step: number) {
    if (this.stepValues.indexOf(step) == -1) {
      throw new Error(
        'Invalid stepIndex: stepIndex value is not included in stepValues'
      );
    }
    // Moves the tick position to the left for a fixed value because of the tick width.
    // The length is correlated to the slider proportion.
    return `-${
      (this.stepValues.indexOf(step) / (this.stepValues.length - 1)) *
      TICK_WIDTH
    }px`;
  }
}
