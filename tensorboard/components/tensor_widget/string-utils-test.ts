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
  booleanValueToDisplayString,
  ELLIPSES,
  formatTensorName,
  numericValueToString,
  TENSOR_NAME_LENGTH_CUTOFF,
  stringValueToDisplayString,
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

  it('includes ellipses, prefix and suffix', () => {
    const longName = stringRepeat('A', TENSOR_NAME_LENGTH_CUTOFF + 10);
    const output = formatTensorName(longName);
    expect(output.indexOf(ELLIPSES)).to.equal(
      Math.floor(TENSOR_NAME_LENGTH_CUTOFF / 2)
    );
    expect(output.slice(0, 1)).to.equal('A');
    expect(output.slice(output.length - 1, output.length)).to.equal('A');
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

describe('numericValueToString', () => {
  it('returns NaN string for NaN', () => {
    const isInteger = false;
    expect(numericValueToString(NaN, isInteger)).to.equal('NaN');
    const decimalPlaces = 4;
    expect(numericValueToString(NaN, isInteger, decimalPlaces)).to.equal('NaN');
    expect(
      numericValueToString(NaN, isInteger, decimalPlaces, 'exponential')
    ).to.equal('NaN');
  });

  it('returns unicode infinity for +/- Infinity', () => {
    const isInteger = false;
    expect(numericValueToString(-Infinity, isInteger)).to.equal('-∞');
    expect(numericValueToString(Infinity, isInteger)).to.equal('+∞');
    const decimalPlaces = 4;
    expect(numericValueToString(-Infinity, isInteger, decimalPlaces)).to.equal(
      '-∞'
    );
    expect(numericValueToString(Infinity, isInteger, decimalPlaces)).to.equal(
      '+∞'
    );
    expect(
      numericValueToString(-Infinity, isInteger, decimalPlaces, 'exponential')
    ).to.equal('-∞');
    expect(
      numericValueToString(Infinity, isInteger, decimalPlaces, 'exponential')
    ).to.equal('+∞');
  });

  it('float zeros are formatted correctly', () => {
    const isInteger = false;
    const x = 0;
    expect(numericValueToString(x, isInteger)).to.equal('0.00');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('0');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('0.0');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('0e+0');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('0.00e+0');
  });

  it('Large positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 12345;
    expect(numericValueToString(x, isInteger)).to.equal('1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal(
      '1.2e+4'
    );

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '12345'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '12345.00'
    );
  });

  it('Large negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -12345;
    expect(numericValueToString(x, isInteger)).to.equal('-1.23e+4');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('-1e+4');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal(
      '-1.2e+4'
    );

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '-12345'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '-12345.00'
    );
  });

  it('Medium magnitude positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 42.6;
    expect(numericValueToString(x, isInteger)).to.equal('42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('43');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('42.6');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('4e+1');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('4.26e+1');
  });

  it('Medium magnitude negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -42.6;
    expect(numericValueToString(x, isInteger)).to.equal('-42.60');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('-43');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('-42.6');

    decimalPlaces = 0;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('-4e+1');
    decimalPlaces = 2;
    expect(
      numericValueToString(x, isInteger, decimalPlaces, 'exponential')
    ).to.equal('-4.26e+1');
  });

  it('Small magnitude positive float values are formatted correctly', () => {
    const isInteger = false;
    const x = 1.337e-8;
    expect(numericValueToString(x, isInteger)).to.equal('1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal(
      '1.3e-8'
    );

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '0'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '0.00'
    );
  });

  it('Small magnitude negative float values are formatted correctly', () => {
    const isInteger = false;
    const x = -1.337e-8;
    expect(numericValueToString(x, isInteger)).to.equal('-1.34e-8');

    let decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal('-1e-8');

    decimalPlaces = 1;
    expect(numericValueToString(x, isInteger, decimalPlaces)).to.equal(
      '-1.3e-8'
    );

    decimalPlaces = 0;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '-0'
    );
    decimalPlaces = 2;
    expect(numericValueToString(x, isInteger, decimalPlaces, 'fixed')).to.equal(
      '-0.00'
    );
  });

  it('Zero integer is formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(0, isInteger)).to.equal('0');
  });

  it('Small magnitude positive integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(42, isInteger)).to.equal('42');
  });

  it('Small magnitude negative integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(-42, isInteger)).to.equal('-42');
  });

  it('Large magnitude positive integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(12345678, isInteger)).to.equal('1.23e+7');
  });

  it('Large magnitude negative integers are formatted correctly', () => {
    const isInteger = true;
    expect(numericValueToString(-12345678, isInteger)).to.equal('-1.23e+7');
  });
});

describe('booleanValueToString', () => {
  it('correct return values for boolean arguments', () => {
    expect(booleanValueToDisplayString(true)).to.eql('T');
    expect(booleanValueToDisplayString(false)).to.eql('F');
    const shortForm = false;
    expect(booleanValueToDisplayString(true, shortForm)).to.eql('True');
    expect(booleanValueToDisplayString(false, shortForm)).to.eql('False');
  });

  it('correct return values for number arguments', () => {
    expect(booleanValueToDisplayString(1)).to.eql('T');
    expect(booleanValueToDisplayString(0)).to.eql('F');
    const shortForm = false;
    expect(booleanValueToDisplayString(1, shortForm)).to.eql('True');
    expect(booleanValueToDisplayString(0, shortForm)).to.eql('False');
  });
});

describe('stringValueToString', () => {
  it('cutoff with default length limit', () => {
    expect(stringValueToDisplayString('')).to.eql('');
    expect(stringValueToDisplayString('ABC')).to.eql('ABC');
    expect(stringValueToDisplayString('ABCDE')).to.eql('ABC…');
  });

  it('cutoff with custom length limit', () => {
    const lengthLimit = 2;
    expect(stringValueToDisplayString('', lengthLimit)).to.eql('');
    expect(stringValueToDisplayString('ABC', lengthLimit)).to.eql('A…');
  });

  it('cutoff with explicitly disabled limit', () => {
    expect(stringValueToDisplayString('', null)).to.eql('');
    expect(stringValueToDisplayString('ABC', null)).to.eql('ABC');
    expect(stringValueToDisplayString('ABCDE', null)).to.eql('ABCDE');
    expect(stringValueToDisplayString(stringRepeat('V', 1000), null)).to.eql(
      stringRepeat('V', 1000)
    );
  });
});
