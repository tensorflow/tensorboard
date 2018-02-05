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
var tf_backend;
(function (tf_backend) {
    describe('urlPathHelpers', function () {
        it('addParams leaves input untouched when there are no parameters', function () {
            var actual = tf_backend.addParams('http://foo', { a: undefined, b: undefined });
            var expected = 'http://foo';
            chai.assert.equal(actual, expected);
        });
        it('addParams adds parameters to a URL without parameters', function () {
            var actual = tf_backend.addParams('http://foo', { a: "1", b: ["2", "3+4"], c: "5", d: undefined });
            var expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
            chai.assert.equal(actual, expected);
        });
        it('addParams adds parameters to a URL with parameters', function () {
            var actual = tf_backend.addParams('http://foo?a=1', { b: ["2", "3+4"], c: "5", d: undefined });
            var expected = 'http://foo?a=1&b=2&b=3%2B4&c=5';
            chai.assert.equal(actual, expected);
        });
    });
    function assertIsDatum(x) {
        chai.assert.isNumber(x.step);
        chai.assert.instanceOf(x.wall_time, Date);
    }
    describe('backend tests', function () {
        var rm;
        var base = 'data';
        var demoRouter = tf_backend.createRouter(base, /*demoMode=*/ true);
        beforeEach(function () {
            tf_backend.setRouter(demoRouter);
            rm = new tf_backend.RequestManager();
        });
        it('trailing slash removed from base route', function () {
            var r = tf_backend.createRouter('foo/');
            chai.assert.equal(r.runs(), 'foo/runs');
        });
        it('runToTag helpers work', function () {
            var r2t = {
                run1: ['foo', 'bar', 'zod'],
                run2: ['zod', 'zoink'],
                a: ['foo', 'zod']
            };
            var empty1 = {};
            var empty2 = { run1: [], run2: [] };
            chai.assert.deepEqual(tf_backend.getRunsNamed(r2t), ['a', 'run1', 'run2']);
            chai.assert.deepEqual(tf_backend.getTags(r2t), ['bar', 'foo', 'zod', 'zoink']);
            chai.assert.deepEqual(tf_backend.filterTags(r2t, ['run1', 'run2']), tf_backend.getTags(r2t));
            chai.assert.deepEqual(tf_backend.filterTags(r2t, ['run1']), ['bar', 'foo', 'zod']);
            chai.assert.deepEqual(tf_backend.filterTags(r2t, ['run2', 'a']), ['foo', 'zod', 'zoink']);
            chai.assert.deepEqual(tf_backend.getRunsNamed(empty1), []);
            chai.assert.deepEqual(tf_backend.getTags(empty1), []);
            chai.assert.deepEqual(tf_backend.getRunsNamed(empty2), ['run1', 'run2']);
            chai.assert.deepEqual(tf_backend.getTags(empty2), []);
        });
    });
})(tf_backend || (tf_backend = {})); // namespace tf_backend
