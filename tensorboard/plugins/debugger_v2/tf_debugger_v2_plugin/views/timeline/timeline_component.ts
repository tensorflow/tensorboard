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
import {AlertType, Execution} from '../../store/debugger_types';

export interface ExecutionDigestForDisplay {
  // Op type for long-form display.
  op_type: string;
  // Op type for short-form display.
  short_op_type: string;
  // Whether the displayed execution digest belongs is for a graph (FuncGraph).
  is_graph: boolean;
}

@Component({
  standalone: false,
  selector: 'timeline-component',
  templateUrl: './timeline_component.ng.html',
  styleUrls: ['./timeline_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  @Input()
  activeRunId: string | null = null;

  @Input()
  loadingNumExecutions: boolean = false;

  @Input()
  numExecutions: number = 0;

  @Input()
  scrollBeginIndex: number = 0;

  @Input()
  scrollBeginIndexUpperLimit: number = 0;

  @Input()
  pageSize: number = 0;

  @Input()
  displayCount: number = 0;

  @Input()
  displayExecutionDigests: ExecutionDigestForDisplay[] = [];

  @Input()
  displayFocusedAlertTypes: Array<AlertType | null> = [];

  @Input()
  focusedExecutionIndex: number | null = null;

  @Input()
  focusedExecutionDisplayIndex: number | null = null;

  @Input()
  focusedExecutionData: Execution | null = null;

  @Output()
  onNavigateLeft = new EventEmitter();

  @Output()
  onNavigateRight = new EventEmitter();

  @Output()
  onExecutionDigestClicked = new EventEmitter<number>();

  @Output()
  onSliderChange = new EventEmitter<number>();
}
