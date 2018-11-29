/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_data_selector {

const {assert} = chai;

describe('storageUtils', () => {
  describe('decodeIdArray', () => {
    it('decodes list of ids from a string', () => {
      const actual = tf_data_selector.decodeIdArray('1,2,3,100');
      assert.deepEqual(actual, [1, 2, 3, 100]);
    });

    it('ignores stringified float', () => {
      const actual = tf_data_selector.decodeIdArray('1.weeeeeeeee');
      assert.deepEqual(actual, [1]);
    });

    it('filters non-number (including inf) from decoded ids', () => {
      const actual = tf_data_selector.decodeIdArray(',1, 2,0,!a,Infinity');
      assert.deepEqual(actual, [1, 2, 0]);
    });
  });

  describe('encodeIdArray', () => {
    it('encodes list of ids', () => {
      const actual = tf_data_selector.encodeIdArray([1, 2, 3, 100]);
      assert.deepEqual(actual, '1,2,3,100');
    });

    it('behaves ok for floats', () => {
      const actual = tf_data_selector.encodeIdArray([1, 1.9]);
      assert.equal(actual, '1,1.9');
    });

    it('behaves ok with large numbers', () => {
      const actual = tf_data_selector.encodeIdArray([-Infinity, Infinity]);
      assert.equal(actual, '-Infinity,Infinity');
    });
  });
});

}  // namespace tf_data_selector
