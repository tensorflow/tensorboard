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
import {Backend, filterTags, getRuns, getTags, RunToTag, TYPES} from '../backend';
import {RequestManager} from '../requestManager';
import {createRouter, setRouter} from '../router';
import {BAD_CHARACTERS, demoify, queryEncoder} from '../urlPathHelpers';

describe('urlPathHelpers', () => {
  it('demoify works as expected', () => {
    const demoified = demoify(BAD_CHARACTERS);
    let allClean = '';
    for (let i = 0; i < BAD_CHARACTERS.length; i++) {
      allClean += '_';
    }
    chai.assert.equal(demoified, allClean, 'cleaning the BAD_CHARACTERS works');
    chai.assert.equal(demoify('foozod'), 'foozod', 'doesnt change safe string');
    chai.assert.equal(demoify('foo zod (2)'), 'foo_zod__2_', 'simple case');
  });

  it('queryEncoder works with demoify on spaces and parens', () => {
    const params = {foo: 'something with spaces and (parens)'};
    const actual = demoify(queryEncoder(params));
    const expected = '_foo_something_with_spaces_and__28parens_29';
    chai.assert.equal(actual, expected);
  });
});

function assertIsDatum(x) {
  chai.assert.isNumber(x.step);
  chai.assert.instanceOf(x.wall_time, Date);
}

describe('backend tests', () => {
  let backend: Backend;
  let rm: RequestManager;
  const base = 'data';
  const demoRouter = createRouter(base, /*demoMode=*/true);
  beforeEach(() => {
    // Construct a demo Backend (third param is true)
    setRouter(demoRouter);
    backend = new Backend();
    rm = new RequestManager();
  });

  it('runs are loaded properly', (done) => {
    const runsResponse = backend.runs();
    const actualRuns = rm.request(demoRouter.runs());
    Promise.all([runsResponse, actualRuns]).then((values) => {
      chai.assert.deepEqual(values[0], values[1]);
      done();
    });
  });

  it('all registered types have handlers', () => {
    TYPES.forEach((t: string) => {
      chai.assert.isDefined(backend[t], t);
      chai.assert.isDefined(backend[t + 'Runs'], t + 'Runs');
    });
  });

  it('audio is loaded properly', (done) => {
    backend.audio('audio1', 'run1').then((audioClips) => {
      const audio = audioClips[0];
      assertIsDatum(audio);
      chai.assert.equal(audio.content_type, 'audio/wav');
      done();
    });
  });

  it('trailing slash removed from base route', () => {
    const r = createRouter('foo/');
    chai.assert.equal(r.runs(), 'foo/runs');
  });

  it('run helper methods work', (done) => {
    const audio = {run1: ['audio1'], fake_run_no_data: ['audio1', 'audio2']};
    const runMetadata = {run1: ['step99'], fake_run_no_data: ['step99']};
    const graph = ['fake_run_no_data'];
    let count = 0;
    function next() {
      count++;
      if (count === 4) {
        done();
      }
    }
    backend.audioTags().then((x) => {
      chai.assert.deepEqual(x, audio);
      next();
    });
    backend.runMetadataTags().then((x) => {
      chai.assert.deepEqual(x, runMetadata);
      next();
    });
    backend.graphRuns().then((x) => {
      chai.assert.deepEqual(x, graph);
      next();
    });
  });

  it('runToTag helpers work', () => {
    const r2t: RunToTag = {
      run1: ['foo', 'bar', 'zod'],
      run2: ['zod', 'zoink'],
      a: ['foo', 'zod']
    };
    const empty1: RunToTag = {};
    const empty2: RunToTag = {run1: [], run2: []};
    chai.assert.deepEqual(getRuns(r2t), ['a', 'run1', 'run2']);
    chai.assert.deepEqual(getTags(r2t), ['bar', 'foo', 'zod', 'zoink']);
    chai.assert.deepEqual(filterTags(r2t, ['run1', 'run2']), getTags(r2t));
    chai.assert.deepEqual(filterTags(r2t, ['run1']), ['bar', 'foo', 'zod']);
    chai.assert.deepEqual(
        filterTags(r2t, ['run2', 'a']), ['foo', 'zod', 'zoink']);

    chai.assert.deepEqual(getRuns(empty1), []);
    chai.assert.deepEqual(getTags(empty1), []);

    chai.assert.deepEqual(getRuns(empty2), ['run1', 'run2']);
    chai.assert.deepEqual(getTags(empty2), []);
  });
});
