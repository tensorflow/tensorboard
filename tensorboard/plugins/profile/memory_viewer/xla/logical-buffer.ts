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

namespace memory_viewer_xla_lb {

/**
 * HLO logical buffer representation.
 * @final
 */
export class LogicalBuffer {
  id: number;
  size: number;
  computationName: string|undefined = '';
  instructionName: string|undefined = '';
  shapeIndex: number[] = [];

  constructor(buffer) {
    this.id = parseInt(buffer.id, 10);
    this.size = parseInt(buffer.size, 10);
    this.initBufferLocation_(buffer.definedAt);
  }

  /**
   * Constructs the computation, instruction and its shape index, which
   * uniquely identifies a point where a buffer is defined.
   */
  private initBufferLocation_(location) {
    if (!location) {
      return;
    }
    this.computationName = location.computationName;
    this.instructionName = location.instructionName;
    this.shapeIndex = location.shapeIndex.map((item) => parseInt(item, 10));
  }
}

} // namespace memory_viewer_xla_lb
