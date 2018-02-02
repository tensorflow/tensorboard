/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_histogram_dashboard {

describe('Verify that the histogram format conversion works.', () => {

  function assertHistogramEquality(h1, h2) {
    h1.forEach((b1, i) => {
      const b2 = h2[i];
      chai.assert.closeTo(b1.x, b2.x, 1e-10);
      chai.assert.closeTo(b1.dx, b2.dx, 1e-10);
      chai.assert.closeTo(b1.y, b2.y, 1e-10);
    });
  }

  it('Handles data with no bins', () => {
    chai.assert.deepEqual(intermediateToD3({
      wall_time: 1234.5,
      step: 0,
      min: 0,
      max: 0,
      buckets: [],
    }, 0, 0, 0), []);
  });

  it('Handles data with one bin', () => {
    const buckets = [{left: 1.1e-12, right: 1.21e-12, count: 1}];
    const expected = [{x: 1.1e-12, dx: 1.21e-12 - 1.1e-12, y: 1}];
    const actual = intermediateToD3({
      wall_time: 1234.5,
      step: 0,
      min: 1.1e-12,
      max: 1.21e-12,
      buckets,
    }, 1.1e-12, 1.21e-12, 1);
    assertHistogramEquality(actual, expected);
  });

  it('Handles data with two bins.', () => {
    const counts = [1, 2];
    const rightEdges = [1.1e-12, 1.21e-12];
    const buckets = [
      {left: 1.0e-12, right: 1.1e-12, count: 1},
      {left: 1.1e-12, right: 1.21e-12, count: 2},
    ];
    const expected = [
      {x: 1.0e-12, dx: 1.05e-13, y: 1.09090909090909},
      {x: 1.105e-12, dx: 1.05e-13, y: 1.9090909090909},
    ];
    const actual = intermediateToD3({
      wall_time: 1234.5,
      step: 0,
      min: 1.0e-12,
      max: 1.21e-12,
      buckets,
    }, 1.0e-12, 1.21e-12, 2);
    assertHistogramEquality(actual, expected);
  });

  it('Handles a domain that crosses zero, but doesn\'t include zero as ' +
         'an edge.', () => {
    const buckets = [
      {left: -1.1e-12, right: -1.0e-12, count: 1},
      {left: -1.0e-12, right: 1.0e-12, count: 2},
    ];
    const expected = [
      {x: -1.1e-12, dx: 1.05e-12, y: 1.95},
      {x: -0.5e-13, dx: 1.05e-12, y: 1.05},
    ];
    const actual = intermediateToD3({
      wall_time: 1234.5,
      step: 0,
      min: -1.1e-12,
      max: 1.0e-12,
      buckets,
    }, -1.1e-12, 1.0e-12, 2);
    assertHistogramEquality(actual, expected);
  });

  it('Handles a histogram of all zeros', () => {
    const h = {
      wall_time: +new Date('2017-01-25T02:30:11.257Z') / 1000,
      step: 0,
      min: 0,
      max: 0,
      buckets: [
        {left: -1e-12, right: 0, count: 0},
        {left: 0, right: 1e-12, count: 51200},
        {left: 1e-12, right: 1.7976931348623157e+308, count: 0},
      ],
    };
    const actual = intermediateToD3(h, 0, 0, 5);
    const expected = [
      {x: -1, dx: 0.4, y: 0},
      {x: -0.6, dx: 0.4, y: 0},
      {x: -0.2, dx: 0.4, y: 51200},
      {x: 0.2, dx: 0.4, y: 0},
      {x: 0.6, dx: 0.4, y: 0},
    ];
    assertHistogramEquality(actual, expected);
  });

  it('Handles a right-most right edge that extends to very large number.',
      () => {
    const buckets = [
      {left: -1.0e-12, right: 0, count: 1},
      {left: 0, right: 1.0e-12, count: 2},
      {left: 1.0e-12, right: 1.0e14, count: 3},
    ];
    const expected = [
      {x: -1.0e-12, dx: 0.7e-12, y: 0.7},
      {x: -0.3e-12, dx: 0.7e-12, y: 1.1},
      {x: 0.4e-12, dx: 0.7e-12, y: 4.2},
    ];
    const actual = intermediateToD3({
      wall_time: 1234.5,
      step: 0,
      min: -1.0e-12,
      max: 1.1e-12,
      buckets,
    }, -1.0e-12, 1.1e-12, 3);
    assertHistogramEquality(actual, expected);
  });
});

}  // namespace tf_histogram_dashboard
