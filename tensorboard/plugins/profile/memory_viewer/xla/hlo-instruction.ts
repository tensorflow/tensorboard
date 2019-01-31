/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

namespace memory_viewer_xla_hi {

/**
 * HLO instructions are the IR used by the high-level XLA compiler.
 * @final
 */
export class HloInstruction {
  name: string;
  opcode: string;
  shape: memory_viewer_xla_s.Shape|null;
  tfOpName: string;

  constructor(inst) {
    this.name = inst.name ? inst.name : '';
    this.opcode = inst.opcode ? inst.opcode : '';
    this.shape = inst.shape ? new memory_viewer_xla_s.Shape(inst.shape) : null;
    if (inst.metadata) {
      this.tfOpName = inst.metadata.opName ? inst.metadata.opName : '';
    }
  }
}

} // namespace memory_viewer_xla_hi
