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
  isBooleanDType,
  isFloatDType,
  isIntegerDType,
  isStringDType,
} from './dtype-utils';

describe('isIntegerDType', () => {
  it('returns true for unsigned ints', () => {
    expect(isIntegerDType('uint02')).to.be.true;
    expect(isIntegerDType('uint2')).to.be.true;
    expect(isIntegerDType('uint04')).to.be.true;
    expect(isIntegerDType('uint4')).to.be.true;
    expect(isIntegerDType('uint8')).to.be.true;
    expect(isIntegerDType('uint16')).to.be.true;
    expect(isIntegerDType('uint64')).to.be.true;
    expect(isIntegerDType('uint128')).to.be.true;
  });

  it('returns true for signed ints', () => {
    expect(isIntegerDType('int4')).to.be.true;
    expect(isIntegerDType('int8')).to.be.true;
    expect(isIntegerDType('int16')).to.be.true;
    expect(isIntegerDType('int32')).to.be.true;
    expect(isIntegerDType('int64')).to.be.true;
    expect(isIntegerDType('int128')).to.be.true;
  });

  it('returns false for negative cases', () => {
    expect(isIntegerDType('bool')).to.be.false;
    expect(isIntegerDType('string')).to.be.false;
    expect(isIntegerDType('float32')).to.be.false;
    expect(isIntegerDType('complex64')).to.be.false;
    expect(isIntegerDType('complex128')).to.be.false;
    expect(isIntegerDType('resource')).to.be.false;
    expect(isIntegerDType('interrupt')).to.be.false;
  });
});

describe('isFloatDType', () => {
  it('returns true for floats', () => {
    expect(isFloatDType('float32')).to.be.true;
    expect(isFloatDType('float64')).to.be.true;
  });

  it('returns true for bfloat types', () => {
    expect(isFloatDType('bfloat16')).to.be.true;
  });

  it('returns false for negative cases', () => {
    expect(isFloatDType('bool')).to.be.false;
    expect(isFloatDType('string')).to.be.false;
    expect(isFloatDType('int32')).to.be.false;
    expect(isFloatDType('uint32')).to.be.false;
    expect(isFloatDType('complex64')).to.be.false;
    expect(isFloatDType('complex128')).to.be.false;
    expect(isFloatDType('resource')).to.be.false;
  });
});

describe('isBooleanDType', () => {
  it('returns true for booleans', () => {
    expect(isBooleanDType('bool')).to.be.true;
    expect(isBooleanDType('boolean')).to.be.true;
    expect(isBooleanDType('Boolean')).to.be.true;
  });

  it('returns false for negative cases', () => {
    expect(isBooleanDType('string')).to.be.false;
    expect(isBooleanDType('int32')).to.be.false;
    expect(isBooleanDType('uint32')).to.be.false;
    expect(isBooleanDType('float32')).to.be.false;
    expect(isBooleanDType('float64')).to.be.false;
    expect(isBooleanDType('complex64')).to.be.false;
    expect(isBooleanDType('complex128')).to.be.false;
    expect(isBooleanDType('resource')).to.be.false;
  });
});

describe('isStringDType', () => {
  it('returns true for strings', () => {
    expect(isStringDType('str')).to.be.true;
    expect(isStringDType('string')).to.be.true;
    expect(isStringDType('String')).to.be.true;
  });

  it('returns false for negative cases', () => {
    expect(isStringDType('bool')).to.be.false;
    expect(isStringDType('int32')).to.be.false;
    expect(isStringDType('uint32')).to.be.false;
    expect(isStringDType('float32')).to.be.false;
    expect(isStringDType('float64')).to.be.false;
    expect(isStringDType('complex64')).to.be.false;
    expect(isStringDType('complex128')).to.be.false;
    expect(isStringDType('resource')).to.be.false;
  });
});
