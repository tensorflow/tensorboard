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

import {expect} from 'chai';

import {
  ELLIPSES,
  formatTensorName,
  TENSOR_NAME_LENGTH_CUTOFF,
} from './string-utils';

function stringRepeat(str: string, times: number) {
  let output = '';
  for (let i = 0; i < times; ++i) {
    output += str;
  }
  return output;
}

describe('formatTensorName', () => {
  it('returns original string for under-limit lengths', () => {
    expect(formatTensorName('')).to.equal('');
    expect(formatTensorName('a')).to.equal('a');
    const onLimitName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF);
    expect(formatTensorName(onLimitName)).to.equal(onLimitName);
  });

  it('returns string with ellipses for over-limit lengths', () => {
    const longName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF + 10);
    expect(formatTensorName(longName).length).to.equal(
      TENSOR_NAME_LENGTH_CUTOFF
    );
  });
});

describe('Constants for formatTensorName', () => {
  it('TENSOR_NAME_LENGTH_CUTOFF is long-enough positive integer', () => {
    expect(TENSOR_NAME_LENGTH_CUTOFF).to.be.greaterThan(ELLIPSES.length);
    expect(Math.floor(TENSOR_NAME_LENGTH_CUTOFF)).to.equal(
      Math.floor(TENSOR_NAME_LENGTH_CUTOFF)
    );
  });
});
