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

import {
  isBooleanDType,
  isFloatDType,
  isIntegerDType,
  isStringDType,
} from './dtype-utils';

describe('isIntegerDType', () => {
  it('returns true for unsigned ints', () => {
    expect(isIntegerDType('uint02')).toBe(true);
    expect(isIntegerDType('uint2')).toBe(true);
    expect(isIntegerDType('uint04')).toBe(true);
    expect(isIntegerDType('uint4')).toBe(true);
    expect(isIntegerDType('uint8')).toBe(true);
    expect(isIntegerDType('uint16')).toBe(true);
    expect(isIntegerDType('uint64')).toBe(true);
    expect(isIntegerDType('uint128')).toBe(true);
  });

  it('returns true for signed ints', () => {
    expect(isIntegerDType('int4')).toBe(true);
    expect(isIntegerDType('int8')).toBe(true);
    expect(isIntegerDType('int16')).toBe(true);
    expect(isIntegerDType('int32')).toBe(true);
    expect(isIntegerDType('int64')).toBe(true);
    expect(isIntegerDType('int128')).toBe(true);
  });

  it('returns false for negative cases', () => {
    expect(isIntegerDType('bool')).toBe(false);
    expect(isIntegerDType('string')).toBe(false);
    expect(isIntegerDType('float32')).toBe(false);
    expect(isIntegerDType('complex64')).toBe(false);
    expect(isIntegerDType('complex128')).toBe(false);
    expect(isIntegerDType('resource')).toBe(false);
    expect(isIntegerDType('interrupt')).toBe(false);
  });
});

describe('isFloatDType', () => {
  it('returns true for floats', () => {
    expect(isFloatDType('float32')).toBe(true);
    expect(isFloatDType('float64')).toBe(true);
  });

  it('returns true for bfloat types', () => {
    expect(isFloatDType('bfloat16')).toBe(true);
  });

  it('returns false for negative cases', () => {
    expect(isFloatDType('bool')).toBe(false);
    expect(isFloatDType('string')).toBe(false);
    expect(isFloatDType('int32')).toBe(false);
    expect(isFloatDType('uint32')).toBe(false);
    expect(isFloatDType('complex64')).toBe(false);
    expect(isFloatDType('complex128')).toBe(false);
    expect(isFloatDType('resource')).toBe(false);
  });
});

describe('isBooleanDType', () => {
  it('returns true for booleans', () => {
    expect(isBooleanDType('bool')).toBe(true);
    expect(isBooleanDType('boolean')).toBe(true);
    expect(isBooleanDType('Boolean')).toBe(true);
  });

  it('returns false for negative cases', () => {
    expect(isBooleanDType('string')).toBe(false);
    expect(isBooleanDType('int32')).toBe(false);
    expect(isBooleanDType('uint32')).toBe(false);
    expect(isBooleanDType('float32')).toBe(false);
    expect(isBooleanDType('float64')).toBe(false);
    expect(isBooleanDType('complex64')).toBe(false);
    expect(isBooleanDType('complex128')).toBe(false);
    expect(isBooleanDType('resource')).toBe(false);
  });
});

describe('isStringDType', () => {
  it('returns true for strings', () => {
    expect(isStringDType('str')).toBe(true);
    expect(isStringDType('string')).toBe(true);
    expect(isStringDType('String')).toBe(true);
  });

  it('returns false for negative cases', () => {
    expect(isStringDType('bool')).toBe(false);
    expect(isStringDType('int32')).toBe(false);
    expect(isStringDType('uint32')).toBe(false);
    expect(isStringDType('float32')).toBe(false);
    expect(isStringDType('float64')).toBe(false);
    expect(isStringDType('complex64')).toBe(false);
    expect(isStringDType('complex128')).toBe(false);
    expect(isStringDType('resource')).toBe(false);
  });
});
