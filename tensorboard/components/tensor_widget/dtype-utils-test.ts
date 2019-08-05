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

import {isIntegerDType, isFloatDType} from './dtype-utils';

describe('isIntegerDType', () => {
  it('unsigned ints', () => {
    expect(isIntegerDType('uint8')).to.be.true;
    // expect(isIntegerDType('uint16')).toEqual(true);
  });

  // it('signed ints', () => {
  //   expect(isIntegerDType('int8')).toEqual(true);
  //   expect(isIntegerDType('int16')).toEqual(true);
  //   expect(isIntegerDType('int32')).toEqual(true);
  //   expect(isIntegerDType('int64')).toEqual(true);
  // });

  // it('negative cases', () => {
  //   expect(isIntegerDType('bool')).toEqual(false);
  //   expect(isIntegerDType('string')).toEqual(false);
  //   expect(isIntegerDType('float32')).toEqual(false);
  //   expect(isIntegerDType('complex64')).toEqual(false);
  // });
});

// describe('isFloatDType', () => {
//   it('floats', () => {
//     expect(isFloatDType('float32')).toEqual(true);
//     expect(isFloatDType('float64')).toEqual(true);
//   });

//   it('bfloat', () => {
//     expect(isFloatDType('bfloat16')).toEqual(true);
//   });

//   it('negative cases', () => {
//     expect(isFloatDType('bool')).toEqual(false);
//     expect(isFloatDType('string')).toEqual(false);
//     expect(isFloatDType('int32')).toEqual(false);
//     expect(isFloatDType('uint32')).toEqual(false);
//     expect(isFloatDType('complex64')).toEqual(false);
//   });
// });
