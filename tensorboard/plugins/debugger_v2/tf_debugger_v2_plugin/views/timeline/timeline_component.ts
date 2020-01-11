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
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

export interface ExecutionDigestForDisplay {
  // Op type for long-form display.
  op_type: string;
  // Op type for short-form display.
  short_op_type: string;
  // Whether the displayed execution digest belongs is for a graph (FuncGraph).
  is_graph: boolean;
}

@Component({
  selector: 'timeline-component',
  templateUrl: './timeline_component.ng.html',
  styleUrls: ['./timeline_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent implements OnChanges {
  @Input()
  activeRunId: string | null = null;

  @Input()
  loadingNumExecutions: boolean = false;

  @Input()
  numExecutions: number = 0;

  @Input()
  scrollBeginIndex: number = 0;

  @Input()
  pageSize: number = 0;

  @Input()
  displayCount: number = 0;

  @Input()
  displayExecutionDigests: ExecutionDigestForDisplay[] = [];

  @Output()
  onRequestExecutionDigests = new EventEmitter<{
    runId: string;
    begin: number;
    end: number;
    pageSize: number;
  }>();

  @Output()
  onNavigateLeft = new EventEmitter();

  @Output()
  onNavigateRight = new EventEmitter();

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.activeRunId) {
      return;
    }
    if (
      changes['numExecutions'] &&
      !changes['numExecutions'].previousValue &&
      changes['numExecutions'].currentValue > 0
    ) {
      // The initial request for executionDigests.
      // TODO(cais): The logic for initial loading should depend on whether any
      // alert (such as InfNanAlert) exists, when alert route is ready.
      const begin = 0;
      const end = Math.min(this.numExecutions, this.pageSize);
      this.onRequestExecutionDigests.emit({
        runId: this.activeRunId,
        begin,
        end,
        pageSize: this.pageSize,
      });
    } else if (changes['scrollBeginIndex'] && this.numExecutions > 0) {
      const begin = this.scrollBeginIndex;
      const end = Math.min(this.numExecutions, begin + this.displayCount);
      this.onRequestExecutionDigests.emit({
        runId: this.activeRunId,
        begin,
        end,
        pageSize: this.pageSize,
      });
    }
  }

  navigateLeft(): void {
    this.onNavigateLeft.emit();
  }

  navigateRight(): void {
    this.onNavigateRight.emit();
  }
}
