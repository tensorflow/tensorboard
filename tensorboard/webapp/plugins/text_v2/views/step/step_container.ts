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
import {Component, Input} from '@angular/core';

@Component({
  selector: 'step-container',
  template: `
    <step
      [step_number]="step_number"
      [run_name]="run_name"
      [tag_name]="tag_name"
      [data_source]="data_source"
      [not_rank_zero]="isNotRankZero(data_source)"
      [step_text]="getStepText()"
    ></step>
  `,
})
export class StepContainer {
  @Input()
  step_number: number = 0;

  @Input()
  run_name: string = '';

  @Input()
  tag_name: string = '';

  @Input()
  data_source: string[][] = [];

  isNotRankZero(dataArray: string[][]) {
    return dataArray.length > 0 && dataArray[0].length > 1;
  }

  getStepText() {
    return 'step ' + this.step_number.toString();
  }
}
