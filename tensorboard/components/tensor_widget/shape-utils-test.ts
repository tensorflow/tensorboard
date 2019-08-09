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

import {formatShapeForDisplay} from './shape-utils';

describe('formatShapeForDisplay', () => {
  it('returns string scalar for []', () => {
    expect(formatShapeForDisplay([])).to.equal('scalar');
  });

  it('returns array strings for non-scalar shapes', () => {
    expect(formatShapeForDisplay([0])).to.equal('[0]');
    expect(formatShapeForDisplay([12])).to.equal('[12]');
    expect(formatShapeForDisplay([4, 8])).to.equal('[4,8]');
    expect(formatShapeForDisplay([1, 32, 8])).to.equal('[1,32,8]');
    expect(formatShapeForDisplay([8, 32, 32, 128])).to.equal('[8,32,32,128]');
    expect(formatShapeForDisplay([0, 8, 32, 32, 128])).to.equal(
      '[0,8,32,32,128]'
    );
  });
});
