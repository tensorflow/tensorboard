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
import {
  GraphOpConsumerSpec,
  GraphOpInfo,
  GraphOpInputSpec,
} from '../../store/debugger_types';

@Component({
  standalone: false,
  selector: 'graph-component',
  templateUrl: './graph_component.ng.html',
  styleUrls: ['./graph_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphComponent {
  @Input()
  opInfo!: GraphOpInfo;

  @Input()
  inputOps!: GraphOpInputSpec[];

  @Input()
  consumerOps!: GraphOpConsumerSpec[][];

  @Output()
  onGraphOpNavigate = new EventEmitter<{graph_id: string; op_name: string}>();

  /**
   * Get the ID of the immediately-enclosing graph of the op.
   */
  get graphId() {
    return this.opInfo.graph_ids[this.opInfo.graph_ids.length - 1];
  }

  /**
   * Total number of consumers of all output tensors of the op.
   */
  get totalNumConsumers() {
    return this.consumerOps.reduce((count, slotConsumers) => {
      return count + slotConsumers.length;
    }, 0);
  }
}
