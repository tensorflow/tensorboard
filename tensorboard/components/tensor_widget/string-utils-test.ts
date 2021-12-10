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
  booleanValueToDisplayString,
  ELLIPSES,
  formatTensorName,
  numericValueToString,
  stringValueToDisplayString,
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
    expect(formatTensorName('')).toBe('');
    expect(formatTensorName('a')).toBe('a');
    const onLimitName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF);
    expect(formatTensorName(onLimitName)).toBe(onLimitName);
  });

  it('returns string with ellipses for over-limit lengths', () => {
    const longName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF + 10);
    expect(formatTensorName(longName).length).toBe(TENSOR_NAME_LENGTH_CUTOFF);
  });

  it('includes ellipses, prefix and suffix', () => {
    const longName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF + 10);
    const output = formatTensorName(longName);
    expect(output.indexOf(ELLIPSES)).toBe(
      Math.floor(TENSOR_NAME_LENGTH_CUTOFF / 2)
    );
    expect(output.slice(0, 1)).toBe('A');
    expect(output.slice(output.length - 1, output.length)).toBe('A');
  });
});

describe('Constants for formatTensorName', () => {
  it('TENSOR_NAME_LENGTH_CUTOFF is long-enough positive integer', () => {
    expect(TENSOR_NAME_LENGTH_CUTOFF).toBeGreaterThan(ELLIPSES.length);
    expect(Math.floor(TENSOR_NAME_LENGTH_CUTOFF)).toBe(
      Math.floor(TENSOR_NAME_LENGTH_CUTOFF)
    );
  });
});

describe('numericValueToString', () => {
  it('returns NaN string for NaN', () => {
    const isInteger = false;
    expect(numericValueToString(NaN, isInteger)).toBe('NaN');
    const decimalPlaces = 4;
    expect(numericValueToString(NaN, isInteger, decimalPlaces)).toBe('NaN');
    expect(
      numericValueToString(NaN, isInteger, decimalPlaces, 'exponential')
    ).toBe('NaN');
  });

  it('returns unicode infinity for +/- Infinity', () => {
    const isInteger = false;
    expect(numericValueToString(-Infinity, isInteger)).toBe('-∞');
    expect(numericValueToString(Infinity, isInteger)).toBe('+∞');
    const decimalPlaces = 4;
    expect(numericValueToString(-Infinity, isInteger, decimalPlaces)).toBe(
      '-∞'
    );
    expect(numericValueToString(Infinity, isInteger, decimalPlaces)).toBe('+∞');
    expect(
      numericValueToString(-Infinity, isInteger, decimalPlaces, 'exponential')
    ).toBe('-∞');
    expect(
      numericValueToString(Infinity, isInteger, decimalPlaces, 'exponential')
    ).toBe('+∞');
  });

  it('float zeros are formatted correctly', () => {
    const isInteger = false;
    const x = 0;
    expect(numericValueToString(x, isInteger)).toBe('0.00');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('0');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('0.0');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('0e+0');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('0.00e+0');
  });

  it('Large positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 12345;
    expect(numericValueToString(x, isInteger)).toBe('1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('1.2e+4');

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '12345'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '12345.00'
    );
  });

  it('Large negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -12345;
    expect(numericValueToString(x, isInteger)).toBe('-1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-1.2e+4');

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '-12345'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '-12345.00'
    );
  });

  it('Medium magnitude positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 42.6;
    expect(numericValueToString(x, isInteger)).toBe('42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('43');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('42.6');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('4e+1');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('4.26e+1');
  });

  it('Medium magnitude negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -42.6;
    expect(numericValueToString(x, isInteger)).toBe('-42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-43');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-42.6');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('-4e+1');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).toBe('-4.26e+1');
  });

  it('Small magnitude positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 1.337e-8;
    expect(numericValueToString(x, isInteger)).toBe('1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('1.3e-8');

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '0'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '0.00'
    );
  });

  it('Small magnitude negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -1.337e-8;
    expect(numericValueToString(x, isInteger)).toBe('-1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).toBe('-1.3e-8');

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '-0'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).toBe(
      '-0.00'
    );
  });

  it('Zero integer is formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(0, isInteger)).toBe('0');
  });

  it('Small magnitude positive integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(42, isInteger)).toBe('42');
  });

  it('Small magnitude negative integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(-42, isInteger)).toBe('-42');
  });

  it('Large magnitude positive integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(12345678, isInteger)).toBe('1.23e+7');
  });

  it('Large magnitude negative integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(-12345678, isInteger)).toBe('-1.23e+7');
  });
});

describe('booleanValueToString', () => {
  it('correct return values for boolean arguments', () => {
    expect(booleanValueToDisplayString(true)).toBe('T');
    expect(booleanValueToDisplayString(false)).toBe('F');
    const shortForm = false;
    expect(booleanValueToDisplayString(true, shortForm)).toBe('True');
    expect(booleanValueToDisplayString(false, shortForm)).toBe('False');
  });

  it('correct return values for number arguments', () => {
    expect(booleanValueToDisplayString(1)).toBe('T');
    expect(booleanValueToDisplayString(0)).toBe('F');
    const shortForm = false;
    expect(booleanValueToDisplayString(1, shortForm)).toBe('True');
    expect(booleanValueToDisplayString(0, shortForm)).toBe('False');
  });
});

describe('stringValueToString', () => {
  it('cutoff with default length limit', () => {
    expect(stringValueToDisplayString('')).toBe('');
    expect(stringValueToDisplayString('ABC')).toBe('ABC');
    expect(stringValueToDisplayString('ABCDE')).toBe('ABC…');
  });

  it('cutoff with custom length limit', () => {
    const lengthLimit = 2;
    expect(stringValueToDisplayString('', lengthLimit)).toBe('');
    expect(stringValueToDisplayString('ABC', lengthLimit)).toBe('A…');
  });

  it('cutoff with explicitly disabled limit', () => {
    expect(stringValueToDisplayString('', null)).toBe('');
    expect(stringValueToDisplayString('ABC', null)).toBe('ABC');
    expect(stringValueToDisplayString('ABCDE', null)).toBe('ABCDE');
    expect(stringValueToDisplayString(stringRepeat('V', 1000), null)).toBe(
      stringRepeat('V', 1000)
    );
  });
});
