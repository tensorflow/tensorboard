/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_projector;
(function (vz_projector) {
    /**
     * Min-heap data structure. Provides O(1) for peek, returning the smallest key.
     */
    // TODO(@jart): Rename to Heap and use Comparator.
    var MinHeap = /** @class */ (function () {
        function MinHeap() {
            this.arr = [];
        }
        /** Push an element with the provided key. */
        MinHeap.prototype.push = function (key, value) {
            this.arr.push({ key: key, value: value });
            this.bubbleUp(this.arr.length - 1);
        };
        /** Pop the element with the smallest key. */
        MinHeap.prototype.pop = function () {
            if (this.arr.length === 0) {
                throw new Error('pop() called on empty binary heap');
            }
            var item = this.arr[0];
            var last = this.arr.length - 1;
            this.arr[0] = this.arr[last];
            this.arr.pop();
            if (last > 0) {
                this.bubbleDown(0);
            }
            return item;
        };
        ;
        /** Returns, but doesn't remove the element with the smallest key */
        MinHeap.prototype.peek = function () { return this.arr[0]; };
        /**
         * Pops the element with the smallest key and at the same time
         * adds the newly provided element. This is faster than calling
         * pop() and push() separately.
         */
        MinHeap.prototype.popPush = function (key, value) {
            if (this.arr.length === 0) {
                throw new Error('pop() called on empty binary heap');
            }
            var item = this.arr[0];
            this.arr[0] = { key: key, value: value };
            if (this.arr.length > 0) {
                this.bubbleDown(0);
            }
            return item;
        };
        /** Returns the number of elements in the heap. */
        MinHeap.prototype.size = function () { return this.arr.length; };
        /** Returns all the items in the heap. */
        MinHeap.prototype.items = function () { return this.arr; };
        MinHeap.prototype.swap = function (a, b) {
            var temp = this.arr[a];
            this.arr[a] = this.arr[b];
            this.arr[b] = temp;
        };
        MinHeap.prototype.bubbleDown = function (pos) {
            var left = (pos << 1) + 1;
            var right = left + 1;
            var largest = pos;
            if (left < this.arr.length && this.arr[left].key < this.arr[largest].key) {
                largest = left;
            }
            if (right < this.arr.length &&
                this.arr[right].key < this.arr[largest].key) {
                largest = right;
            }
            if (largest !== pos) {
                this.swap(largest, pos);
                this.bubbleDown(largest);
            }
        };
        MinHeap.prototype.bubbleUp = function (pos) {
            if (pos <= 0) {
                return;
            }
            var parent = ((pos - 1) >> 1);
            if (this.arr[pos].key < this.arr[parent].key) {
                this.swap(pos, parent);
                this.bubbleUp(parent);
            }
        };
        return MinHeap;
    }());
    vz_projector.MinHeap = MinHeap;
    /** List that keeps the K elements with the smallest keys. */
    var KMin = /** @class */ (function () {
        /** Constructs a new k-min data structure with the provided k. */
        function KMin(k) {
            this.maxHeap = new MinHeap();
            this.k = k;
        }
        /** Adds an element to the list. */
        KMin.prototype.add = function (key, value) {
            if (this.maxHeap.size() < this.k) {
                this.maxHeap.push(-key, value);
                return;
            }
            var largest = this.maxHeap.peek();
            // If the new element is smaller, replace the largest with the new element.
            if (key < -largest.key) {
                this.maxHeap.popPush(-key, value);
            }
        };
        /** Returns the k items with the smallest keys. */
        KMin.prototype.getMinKItems = function () {
            var items = this.maxHeap.items();
            items.sort(function (a, b) { return b.key - a.key; });
            return items.map(function (a) { return a.value; });
        };
        /** Returns the size of the list. */
        KMin.prototype.getSize = function () { return this.maxHeap.size(); };
        /** Returns the largest key in the list. */
        KMin.prototype.getLargestKey = function () {
            return this.maxHeap.size() === 0 ? null : -this.maxHeap.peek().key;
        };
        return KMin;
    }());
    vz_projector.KMin = KMin;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
