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
    var assert = chai.assert;
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
        describe('router', function () {
            describe('prod mode', function () {
                var router;
                beforeEach(function () {
                    router = tf_backend.createRouter(base, /*demoMode=*/ false);
                });
                it('leading slash in pathPrefix is an absolute path', function () {
                    var router = tf_backend.createRouter('/data/', /*demoMode=*/ false);
                    assert.equal(router.runs(), '/data/runs');
                });
                it('returns complete pathname when pathPrefix omits slash', function () {
                    var router = tf_backend.createRouter('data/', /*demoMode=*/ false);
                    assert.equal(router.runs(), 'data/runs');
                });
                it('does not prune many leading slashes that forms full url', function () {
                    var router = tf_backend.createRouter('///data/hello', /*demoMode=*/ false);
                    // This becomes 'http://data/hello/runs'
                    assert.equal(router.runs(), '///data/hello/runs');
                });
                it('returns correct value for #environment', function () {
                    assert.equal(router.environment(), 'data/environment');
                });
                it('returns correct value for #experiments', function () {
                    assert.equal(router.experiments(), 'data/experiments');
                });
                it('returns correct value for #isDemoMode', function () {
                    assert.equal(router.isDemoMode(), false);
                });
                describe('#pluginRoute', function () {
                    it('encodes slash correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/scalar'), 'data/plugin/scalars/scalar');
                    });
                    it('encodes query param correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ b: 'c', d: ['1', '2'] })), 'data/plugin/scalars/a?b=c&d=1&d=2');
                    });
                    it('does not put ? when passed an empty URLSearchParams', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', new URLSearchParams()), 'data/plugin/scalars/a');
                    });
                    it('encodes parenthesis correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ foo: '()' })), 'data/plugin/scalars/a?foo=%28%29');
                    });
                    it('deals with existing query param correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a?foo=bar', tf_backend.createSearchParam({ hello: 'world' })), 'data/plugin/scalars/a?foo=bar&hello=world');
                    });
                    it('encodes query param the same as #addParams', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ b: 'c', d: ['1'] })), tf_backend.addParams('data/plugin/scalars/a', { b: 'c', d: ['1'] }));
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ foo: '()' })), tf_backend.addParams('data/plugin/scalars/a', { foo: '()' }));
                    });
                    it('ignores custom extension', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', undefined, 'meow'), 'data/plugin/scalars/a');
                    });
                });
                it('returns correct value for #pluginsListing', function () {
                    assert.equal(router.pluginsListing(), 'data/plugins_listing');
                });
                it('returns correct value for #runs', function () {
                    assert.equal(router.runs(), 'data/runs');
                });
                it('returns correct value for #runsForExperiment', function () {
                    assert.equal(router.runsForExperiment(1), 'data/experiment_runs?experiment=1');
                });
            });
            describe('demoMode', function () {
                var router;
                beforeEach(function () {
                    router = tf_backend.createRouter(base, /*demoMode=*/ true);
                });
                it('treats pathPrefix with leading slash as absolute path', function () {
                    var router = tf_backend.createRouter('/data/', /*demoMode=*/ true);
                    assert.equal(router.runs(), '/data/runs.json');
                });
                it('treats pathPrefix without leading slash as absolute path', function () {
                    var router = tf_backend.createRouter('data/', /*demoMode=*/ true);
                    assert.equal(router.runs(), '/data/runs.json');
                });
                it('does not form absolute url with multiple leading slashes', function () {
                    var router = tf_backend.createRouter('///data/', /*demoMode=*/ true);
                    // For prod url, this would be http://data/runs
                    assert.equal(router.runs(), '///data/runs.json');
                });
                it('returns correct value for #environment', function () {
                    assert.equal(router.environment(), '/data/environment.json');
                });
                it('returns correct value for #experiments', function () {
                    assert.equal(router.experiments(), '/data/experiments.json');
                });
                it('returns correct value for #isDemoMode', function () {
                    assert.equal(router.isDemoMode(), true);
                });
                describe('#pluginRoute', function () {
                    it('encodes slash correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/scalar'), '/data/scalars_scalar.json');
                    });
                    it('encodes query param correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ b: 'c', d: ['1', '2'] })), '/data/scalars_a_b_c_d_1_d_2.json');
                    });
                    it('deals with existing query param correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a?foo=bar', tf_backend.createSearchParam({ hello: 'world' })), '/data/scalars_a_foo_bar_hello_world.json');
                    });
                    it('encodes parenthesis correctly', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', tf_backend.createSearchParam({ foo: '()' })), '/data/scalars_a_foo__28_29.json');
                    });
                    it('uses custom extension if provided', function () {
                        assert.equal(router.pluginRoute('scalars', '/a', undefined, ''), '/data/scalars_a');
                        assert.equal(router.pluginRoute('scalars', '/a', undefined, '.meow'), '/data/scalars_a.meow');
                        assert.equal(router.pluginRoute('scalars', '/a'), '/data/scalars_a.json');
                    });
                });
                it('returns correct value for #pluginsListing', function () {
                    assert.equal(router.pluginsListing(), '/data/plugins_listing.json');
                });
                it('returns correct value for #runs', function () {
                    assert.equal(router.runs(), '/data/runs.json');
                });
                it('returns correct value for #runsForExperiment', function () {
                    assert.equal(router.runsForExperiment(1), '/data/experiment_runs_experiment_1.json');
                });
            });
        });
    });
})(tf_backend || (tf_backend = {})); // namespace tf_backend
