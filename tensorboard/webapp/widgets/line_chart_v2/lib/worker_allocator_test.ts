/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

import {TEST_ONLY, getWorkerInstance} from './worker_allocator';
import * as workerLib from './worker';

describe('line_chart_v2/lib/worker_allocator', () => {
  let postMessageSpies: jasmine.Spy[];
  let getWorkerSpy: jasmine.Spy;

  beforeEach(() => {
    postMessageSpies = [];
    getWorkerSpy = spyOn(workerLib, 'getWorker').and.callFake(() => {
      const postMessageSpy = jasmine.createSpy();
      postMessageSpies.push(postMessageSpy);
      return ({
        postMessage: postMessageSpy,
      } as unknown) as Worker;
    });
  });

  afterEach(() => {
    TEST_ONLY.cleanup();
  });

  it('returns a worker like that it can postMessage to', () => {
    const workerLike = getWorkerInstance('testing');
    workerLike.postMessage('foo', []);

    expect(getWorkerSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpies.length).toBe(1);
    expect(postMessageSpies[0]).toHaveBeenCalledWith('foo', []);
  });

  describe('allocation', () => {
    it('allocates different worker for different paths', () => {
      getWorkerInstance('a');
      getWorkerInstance('b');
      expect(getWorkerSpy).toHaveBeenCalledTimes(2);
    });

    it('allocates upto 10 then allocates from first one again', () => {
      const workers = [...new Array(15)].map(() => {
        return getWorkerInstance('test_15');
      });

      expect(getWorkerSpy).toHaveBeenCalledTimes(10);
      expect(workers[0]).toBe(workers[10]);
    });
  });

  describe('freeing', () => {
    it('supports freeing and allocates freed one first', () => {
      const workerLikeBefore = getWorkerInstance('testing');
      workerLikeBefore.postMessage('foo', []);
      workerLikeBefore.free();

      const workerLikeAfter = getWorkerInstance('testing');
      workerLikeAfter.postMessage('bar', []);

      expect(getWorkerSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpies.length).toBe(1);
      expect(postMessageSpies[0]).toHaveBeenCalledWith('foo', []);
      expect(postMessageSpies[0]).toHaveBeenCalledWith('bar', []);
    });

    it('allocates the freest worker', () => {
      const workers = [...new Array(30)].map(() => {
        return getWorkerInstance('test_30');
      });

      workers[2].free();
      workers[5].free();
      workers[15].free();
      workers[25].free();

      // Because 6th one is the freest, allocating a new instance will return it.
      expect(getWorkerInstance('test_30')).toBe(workers[5]);
      // 6th one is still freest (only one user).
      expect(getWorkerInstance('test_30')).toBe(workers[5]);
      // Now, there is both 3rd and 6th one. Because 3rd one comes first in index,
      // it wins.
      expect(getWorkerInstance('test_30')).toBe(workers[2]);
      // Lastly, 6th one is allocated.
      expect(getWorkerInstance('test_30')).toBe(workers[5]);
      // Now that every one has 3 active clients, 1st one gets returned.
      expect(getWorkerInstance('test_30')).toBe(workers[0]);
    });
  });
});
