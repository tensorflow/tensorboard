/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_backend {

describe('urlPathHelpers', () => {
  it('addParams leaves input untouched when there are no parameters', () => {
    const actual = addParams('http://foo', {a: undefined, b: undefined});
    const expected = 'http://foo';
    chai.assert.equal(actual, expected);
  });
  it('addParams adds parameters to a URL without parameters', () => {
    const actual = addParams(
      'http://foo',
      {a: "1", b: ["2", "3+4"], c: "5", d: undefined});
    const expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
    chai.assert.equal(actual, expected);
  });
  it('addParams adds parameters to a URL with parameters', () => {
    const actual = addParams(
      'http://foo?a=1',
      {b: ["2", "3+4"], c: "5", d: undefined});
    const expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
    chai.assert.equal(actual, expected);
  });
});

function assertIsDatum(x) {
  chai.assert.isNumber(x.step);
  chai.assert.instanceOf(x.wall_time, Date);
}

describe('backend tests', () => {
  let rm: RequestManager;
  const base = 'data';
  const demoRouter = createRouter(base, /*demoMode=*/true);
  beforeEach(() => {
    setRouter(demoRouter);
    rm = new RequestManager();
  });

  it('trailing slash removed from base route', () => {
    const r = createRouter('foo/');
    chai.assert.equal(r.runs(), 'foo/runs');
  });

  it('runToTag helpers work', () => {
    const r2t: RunToTag = {
      run1: ['foo', 'bar', 'zod'],
      run2: ['zod', 'zoink'],
      a: ['foo', 'zod']
    };
    const empty1: RunToTag = {};
    const empty2: RunToTag = {run1: [], run2: []};
    chai.assert.deepEqual(getRunsNamed(r2t), ['a', 'run1', 'run2']);
    chai.assert.deepEqual(getTags(r2t), ['bar', 'foo', 'zod', 'zoink']);
    chai.assert.deepEqual(filterTags(r2t, ['run1', 'run2']), getTags(r2t));
    chai.assert.deepEqual(filterTags(r2t, ['run1']), ['bar', 'foo', 'zod']);
    chai.assert.deepEqual(
        filterTags(r2t, ['run2', 'a']), ['foo', 'zod', 'zoink']);

    chai.assert.deepEqual(getRunsNamed(empty1), []);
    chai.assert.deepEqual(getTags(empty1), []);

    chai.assert.deepEqual(getRunsNamed(empty2), ['run1', 'run2']);
    chai.assert.deepEqual(getTags(empty2), []);
  });
});

}  // namespace tf_backend
