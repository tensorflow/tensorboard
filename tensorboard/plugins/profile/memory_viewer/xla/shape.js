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
var memory_viewer;
(function (memory_viewer) {
    /**
     * A shape describes the number of dimensions in the array, the size of each
     * dimension, and the primitive component type. Tuples are a special case in
     * that they have rank zero and have tuple_shapes defined.
     * @final
     */
    var Shape = /** @class */ (function () {
        function Shape(shape) {
            this.elementType = shape.elementType.toString();
            this.dimensions = shape.dimensions.map(function (item) { return parseInt(item, 10); });
            if (shape.tupleShapes) {
                this.tupleShapes = shape.tupleShapes.map(function (item) { return new Shape(item); });
            }
            this.layout = shape.layout;
        }
        /**
         * Resolve the right shape from the shapeIndex.
         */
        Shape.prototype.resolveShapeIndex = function (shapeIndex) {
            return shapeIndex.reduce(function (shape, item) { return shape.tupleShapes[item]; }, this);
        };
        /**
         * Returns the size of shape with out padding.
         */
        Shape.prototype.unpaddedHeapSizeBytes = function () {
            var INT64_BYTES = 8;
            // We make a simplifying assumption here that the minimum size of a tuple
            // member is int64.
            if (this.elementType === 'TUPLE') {
                return INT64_BYTES * this.tupleShapes.length;
            }
            var byteSize = 0;
            if (this.layout.format == 'DENSE') {
                var allocatedElementCount = this.dimensions.reduce(function (count, item) { return count * item; }, 1);
                byteSize += allocatedElementCount *
                    memory_viewer.byteSizeOfPrimitiveType(this.elementType);
            }
            if (this.layout.format == 'SPARSE') {
                var maxElements = parseInt(this.layout.maxSparseElements, 10);
                byteSize = maxElements * memory_viewer.byteSizeOfPrimitiveType(this.elementType);
                // Add byte size of sparse indices, assume each indice is int64 type.
                byteSize += maxElements * this.dimensions.length * INT64_BYTES;
            }
            return byteSize;
        };
        /**
         * Returns a human-readable string that represents the given shape, with
         * layout. e.g. "f32[42x12] {0, 1}"
         */
        Shape.prototype.humanStringWithLayout = function () {
            if (this.elementType === 'TUPLE') {
                var text = '(';
                var prefix = '';
                for (var _i = 0, _a = this.tupleShapes; _i < _a.length; _i++) {
                    var ele_shape = _a[_i];
                    text = text + prefix + ele_shape.humanStringWithLayout();
                    prefix = ', ';
                }
                text += ')';
                return text;
            }
            else {
                var result = this.elementType.toLowerCase() + '[';
                result += this.dimensions.join() + ']';
                if (!(this.elementType === 'OPAQUE') && this.dimensions.length > 0) {
                    if (this.layout) {
                        result += this.humanLayoutString(this.layout);
                    }
                }
                return result;
            }
        };
        /**
         * Returns a human-readable string that represents the given layout.
         */
        Shape.prototype.humanLayoutString = function (layout) {
            if (layout.format == 'SPARSE') {
                return 'sparse{' + layout.maxSparseElements + '}';
            }
            else {
                if (layout.format == 'DENSE') {
                    return '{' + layout.minorToMajor.join() + '}';
                }
                else {
                    return '';
                }
            }
        };
        return Shape;
    }());
    memory_viewer.Shape = Shape;
})(memory_viewer || (memory_viewer = {})); // namespace memory_viewer
