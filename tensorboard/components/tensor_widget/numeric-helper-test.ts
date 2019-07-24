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

import {numericValueToString} from './numeric-helper';

describe('numericValueToString', () => {
  it('NaN', () => {
    expect(numericValueToString(NaN)).toEqual('NaN');
    const decimalPlaces = 4;
    expect(numericValueToString(NaN, decimalPlaces)).toEqual('NaN');
    expect(numericValueToString(NaN, decimalPlaces, 'exponential'))
        .toEqual('NaN');
  });

  it('Infinity', () => {
    expect(numericValueToString(-Infinity)).toEqual('-∞');
    expect(numericValueToString(Infinity)).toEqual('+∞');
    const decimalPlaces = 4;
    expect(numericValueToString(-Infinity, decimalPlaces)).toEqual('-∞');
    expect(numericValueToString(Infinity, decimalPlaces)).toEqual('+∞');
    expect(numericValueToString(-Infinity, decimalPlaces, 'exponential'))
        .toEqual('-∞');
    expect(numericValueToString(Infinity, decimalPlaces, 'exponential'))
        .toEqual('+∞');
  });

  it('zero', () => {
    const x = 0;
    expect(numericValueToString(x)).toEqual('0.00');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('0');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('0.0');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('0e+0');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('0.00e+0');
  });

  it('Large positive value', () => {
    const x = 12345;
    expect(numericValueToString(x)).toEqual('1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('1.2e+4');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('12345');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('12345.00');
  });

  it('Large negative value', () => {
    const x = -12345;
    expect(numericValueToString(x)).toEqual('-1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-1.2e+4');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('-12345');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('-12345.00');
  });

  it('Medium magnitude positive value', () => {
    const x = 42.6;
    expect(numericValueToString(x)).toEqual('42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('43');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('42.6');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('4e+1');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('4.26e+1');
  });

  it('Medium magnitude negative value', () => {
    const x = -42.6;
    expect(numericValueToString(x)).toEqual('-42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-43');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-42.6');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('-4e+1');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'exponential'))
        .toEqual('-4.26e+1');
  });

  it('Tiny magnitude positive value', () => {
    const x = 1.337e-8;
    expect(numericValueToString(x)).toEqual('1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('1.3e-8');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('0');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('0.00');
  });

  it('Tiny magnitude negative value', () => {
    const x = -1.337e-8;
    expect(numericValueToString(x)).toEqual('-1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, decimalPlaces)).toEqual('-1.3e-8');

    decimalPlaces = 0;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('-0');
    decimalPlaces = 2;
    expect(numericValueToString(x, decimalPlaces, 'fixed'))
        .toEqual('-0.00');
  });
});
