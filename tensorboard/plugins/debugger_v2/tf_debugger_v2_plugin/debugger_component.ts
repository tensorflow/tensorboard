/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {DebuggerRunListing} from './store/debugger_types';
import {requestExecutionDigests} from './actions';

@Component({
  selector: 'debugger-component',
  templateUrl: './debugger_component.ng.html',
  styleUrls: ['./debugger_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebuggerComponent implements OnChanges {
  @Input()
  runs: DebuggerRunListing = {};

  @Input()
  runIds: string[] = [];

  @Input()
  activeRunId: string | null = null;

  @Output()
  onActiveRunIdChange = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeRunId'] && changes['activeRunId'].currentValue) {
      this.onActiveRunIdChange.emit(changes['activeRunId']
        .currentValue as string);
    }
  }
}
