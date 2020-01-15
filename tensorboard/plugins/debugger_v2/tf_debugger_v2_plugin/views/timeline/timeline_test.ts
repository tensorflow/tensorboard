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
/**
 * Unit tests for the Timeline Container.
 */

import {TEST_ONLY} from './timeline_container';

describe('getExecutionDigestForDisplay', () => {
  for (const [opType, strLen, expectedShortOpType, isGraph] of [
    ['MatMul', 1, 'M', false],
    ['MatMul', 2, 'Ma', false],
    ['MatMul', 3, 'Mat', false],
    ['MatMul', 100, 'MatMul', false],
    ['__inference_batchnorm_1357', 1, 'b', true],
    ['__forward_batchnorm_1357', 2, 'ba', true],
    ['__backward_attention_1357', 3, 'att', true],
    ['__backward_attention_1357', 99, 'attention_1357', true],
  ] as Array<[string, number, string, boolean]>) {
    it(`outputs correct results for op ${opType}, strLen=${strLen}`, () => {
      const display = TEST_ONLY.getExecutionDigestForDisplay(
        {
          op_type: opType,
          output_tensor_device_ids: ['d0'],
        },
        strLen
      );
      expect(display.short_op_type).toEqual(expectedShortOpType);
      expect(display.op_type).toEqual(opType);
      expect(display.is_graph).toBe(isGraph);
    });
  }

  it(`outputs ellipses for unavailable op`, () => {
    const display = TEST_ONLY.getExecutionDigestForDisplay(null);
    expect(display.short_op_type).toEqual('..');
    expect(display.op_type).toEqual('(N/A)');
    expect(display.is_graph).toEqual(false);
  });
});
