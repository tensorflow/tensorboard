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

namespace memory_viewer_xla_s {

/**
 * A shape describes the number of dimensions in the array, the size of each
 * dimension, and the primitive component type. Tuples are a special case in
 * that they have rank zero and have tuple_shapes defined.
 * @final
 */
export class Shape {
  elementType: string;
  dimensions: number[];
  tupleShapes: Shape[];
  layout;

  constructor(shape) {
    this.elementType = shape.elementType.toString();
    this.dimensions = shape.dimensions.map((item) => parseInt(item, 10));
    if (shape.tupleShapes) {
      this.tupleShapes = shape.tupleShapes.map((item) => new Shape(item));
    }
    this.layout = shape.layout;
  }

  /**
   * Resolve the right shape from the shapeIndex.
   */
  resolveShapeIndex(shapeIndex: number[]): Shape {
    return shapeIndex.reduce((shape, item) => shape.tupleShapes[item], this);
  }

  /**
   * Returns the size of shape with out padding.
   */
  unpaddedHeapSizeBytes(): number {
    const INT64_BYTES = 8;

    if (this.elementType === 'TOKEN') {
      return 0;
    }
    // We make a simplifying assumption here that the minimum size of a tuple
    // member is int64.
    if (this.elementType === 'TUPLE') {
      return INT64_BYTES * this.tupleShapes.length;
    }
    let byteSize = 0;
    // We assume the layout format is 'DENSE' by default.
    if (!this.layout || this.layout.format == 'DENSE') {
      const allocatedElementCount =
          this.dimensions.reduce((count, item) => count * item, 1);
      byteSize += allocatedElementCount *
          memory_viewer_utils.byteSizeOfPrimitiveType(this.elementType);
    }else if (this.layout.format == 'SPARSE') {
      const maxElements = parseInt(this.layout.maxSparseElements, 10);
      byteSize = maxElements *
          memory_viewer_utils.byteSizeOfPrimitiveType(this.elementType);

      // Add byte size of sparse indices, assume each indice is int64 type.
      byteSize += maxElements * this.dimensions.length * INT64_BYTES;
    }
    return byteSize;
  }

  /**
   * Returns a human-readable string that represents the given shape, with
   * layout. e.g. "f32[42x12] {0, 1}"
   */
  humanStringWithLayout(): string {
    if (this.elementType === 'TUPLE') {
      let text = '(';
      let prefix = '';
      for (const ele_shape of this.tupleShapes) {
        text = text + prefix + ele_shape.humanStringWithLayout();
        prefix = ', ';
      }
      text += ')';
      return text;
    }
    let result = this.elementType.toLowerCase() + '[';
    result += this.dimensions.join() + ']';
    if (!(this.elementType === 'OPAQUE') && !(this.elementType === 'TOKEN') &&
        this.dimensions.length > 0) {
      if (this.layout) {
        result += this.humanLayoutString(this.layout);
      }
    }
    return result;
  }

  /**
   * Returns a human-readable string that represents the given layout.
   */
  humanLayoutString(layout): string {
    if (layout.format == 'SPARSE') {
      return 'sparse{' + layout.maxSparseElements + '}';
    } else {
      if (layout.format == 'DENSE') {
        return '{' + layout.minorToMajor.join() + '}';
      } else {
        return '';
      }
    }
  }
}

} // namespace memory_viewer_xla_s
