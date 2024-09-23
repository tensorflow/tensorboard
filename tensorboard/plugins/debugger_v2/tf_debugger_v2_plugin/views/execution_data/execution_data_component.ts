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
import {Execution, TensorDebugMode} from '../../store/debugger_types';
import {parseDebugTensorValue} from '../../store/debug_tensor_value';

@Component({
  standalone: false,
  selector: 'execution-data-component',
  templateUrl: './execution_data_component.ng.html',
  styleUrls: ['./execution_data_component.css'],
})
export class ExecutionDataComponent {
  @Input()
  focusedExecutionIndex!: number;

  @Input()
  focusedExecutionData!: Execution;

  @Input()
  tensorDebugMode: TensorDebugMode = TensorDebugMode.UNSPECIFIED;

  /**
   * Whether any debug tensor values exist, under non-FULL_TENSOR debug
   * modes.
   */
  @Input()
  hasDebugTensorValues: boolean = false;

  /** Debug tensor values under non-FULL_TENSOR debug modes. */
  @Input()
  debugTensorValues: number[][] | null = null;

  /**
   * Dtypes of the tensors.
   * Dtypes are available under tensor debug modes such as FULL_HEALTH.
   */
  @Input()
  debugTensorDtypes: string[] | null = null;

  // So that the enum can be used in the template html.
  public TensorDebugMode = TensorDebugMode;
  parseDebugTensorValue = parseDebugTensorValue;
}
