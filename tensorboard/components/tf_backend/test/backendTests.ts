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

const {assert} = chai;

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

  describe('router', () => {
    describe('prod mode', () => {
      beforeEach(function() {
        this.router = createRouter(base, /*demoMode=*/false);
      });

      function assertRelativePath(actual, expectedRelativePath) {
        // Path prefix is /tf-backend/test should match path of the
        // test_web_library in the test build target.
        assert.equal(actual, `/tf-backend/test/${expectedRelativePath}`);
      }

      it('leading slash in pathPrefix is an absolute path', () => {
        const router = createRouter('/data/', /*demoMode=*/false);
        assert.equal(router.runs(), '/data/runs');
      });

      it('returns complete pathname when pathPrefix omits slash', () => {
        const router = createRouter('data/', /*demoMode=*/false);
        assertRelativePath(router.runs(), 'data/runs');
      });

      it('treats more than two slashes as absolute url', () => {
        const router = createRouter('///data/hello', /*demoMode=*/false);
        // This becomes 'http://data/hello/runs'
        assert.equal(router.runs(), '/hello/runs');
      });

      it('returns correct value for #environment', function() {
        assertRelativePath(this.router.environment(), 'data/environment');
      });

      it('returns correct value for #experiments', function() {
        assertRelativePath(this.router.experiments(), 'data/experiments');
      });

      it('returns correct value for #isDemoMode', function() {
        assert.equal(this.router.isDemoMode(), false);
      });

      describe('#pluginRoute', () => {
        it('encodes slash correctly', function() {
          assertRelativePath(
              this.router.pluginRoute('scalars', '/scalar'),
              'data/plugin/scalars/scalar');
        });

        it('encodes query param correctly', function() {
          assertRelativePath(
              this.router.pluginRoute(
                  'scalars',
                  '/a',
                  createSearchParam({b: 'c', d: ['1', '2']})),
              'data/plugin/scalars/a?b=c&d=1&d=2');
        });

        it('encodes parenthesis correctly', function() {
          assertRelativePath(
              this.router.pluginRoute('scalars', '/a',
              createSearchParam({foo: '()'})),
              'data/plugin/scalars/a?foo=%28%29');
        });

        it('encodes query param the same as #addParams', function() {
          assertRelativePath(
              this.router.pluginRoute(
                  'scalars',
                  '/a',
                  createSearchParam({b: 'c', d: ['1']})),
              addParams('data/plugin/scalars/a', {b: 'c', d: ['1']}));
          assertRelativePath(
              this.router.pluginRoute(
                  'scalars',
                  '/a',
                  createSearchParam({foo: '()'})),
              addParams('data/plugin/scalars/a', {foo: '()'}));
        });

        it('ignores custom extension', function() {
          assertRelativePath(
              this.router.pluginRoute('scalars', '/a', undefined, 'meow'),
              'data/plugin/scalars/a');
        });
      });

      it('returns correct value for #pluginsListing', function() {
        assertRelativePath(
            this.router.pluginsListing(), 'data/plugins_listing');
      });

      it('returns correct value for #runs', function() {
        assertRelativePath(this.router.runs(), 'data/runs');
      });

      it('returns correct value for #runsForExperiment', function() {
        // No experiment id is passed.
        assertRelativePath(
            this.router.runsForExperiment(''),
            'data/experiment_runs');
        assertRelativePath(
            this.router.runsForExperiment('1'),
            'data/experiment_runs?experiment=1');
        assertRelativePath(
            this.router.runsForExperiment('1&foo=false'),
            'data/experiment_runs?experiment=1%26foo%3Dfalse');
      });
    });

    describe('demoMode', () => {
      beforeEach( function() {
        this.router = createRouter(base, /*demoMode=*/true);
      });

      it('treats pathPrefix with leading slash as absolute path', () => {
        const router = createRouter('/data/', /*demoMode=*/true);
        assert.equal(router.runs(), '/data/runs.json');
      });

      it('treats pathPrefix without leading slash as absolute path', () => {
        const router = createRouter('data/', /*demoMode=*/true);
        assert.equal(router.runs(), '/data/runs.json');
      });

      it('does not form absolute url with multiple leading slashes', () => {
        const router = createRouter('///data/', /*demoMode=*/true);
        // For prod url, this would be http://data/runs
        assert.equal(router.runs(), '///data/runs.json');
      });

      it('returns correct value for #environment', function() {
        assert.equal(this.router.environment(), '/data/environment.json');
      });

      it('returns correct value for #experiments', function() {
        assert.equal(this.router.experiments(), '/data/experiments.json');
      });

      it('returns correct value for #isDemoMode', function() {
        assert.equal(this.router.isDemoMode(), true);
      });

      describe('#pluginRoute', () => {
        it('encodes slash correctly', function() {
          assert.equal(
              this.router.pluginRoute('scalars', '/scalar'),
              '/data/scalars_scalar.json');
        });

        it('encodes query param correctly', function() {
          assert.equal(
              this.router.pluginRoute(
                  'scalars',
                  '/a',
                  createSearchParam({b: 'c', d: ['1', '2']})),
              '/data/scalars_a_b_c_d_1_d_2.json');
        });

        it('encodes parenthesis correctly', function() {
          assert.equal(
              this.router.pluginRoute(
                  'scalars',
                  '/a',
                  createSearchParam({foo: '()'})),
              '/data/scalars_a_foo__28_29.json');
        });

        it('uses custom extension if provided', function() {
          assert.equal(
              this.router.pluginRoute('scalars', '/a', undefined, ''),
              '/data/scalars_a');
          assert.equal(
              this.router.pluginRoute('scalars', '/a', undefined, '.meow'),
              '/data/scalars_a.meow');
          assert.equal(
              this.router.pluginRoute('scalars', '/a'),
              '/data/scalars_a.json');
        });
      });

      it('returns correct value for #pluginsListing', function() {
        assert.equal(
            this.router.pluginsListing(),
            '/data/plugins_listing.json');
      });

      it('returns correct value for #runs', function() {
        assert.equal(this.router.runs(), '/data/runs.json');
      });

      it('returns correct value for #runsForExperiment', function() {
        // No experiment id is passed.
        assert.equal(
            this.router.runsForExperiment(''),
            '/data/experiment_runs.json');
        assert.equal(
            this.router.runsForExperiment('1'),
            '/data/experiment_runs_experiment_1.json');
        assert.equal(
            this.router.runsForExperiment('1&foo=false'),
            '/data/experiment_runs_experiment_1_26foo_3Dfalse.json');
      });
    });
  });
});

}  // namespace tf_backend
