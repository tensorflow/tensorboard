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

import {WorkerPool} from './worker_pool';

describe('line_chart_v2/lib/worker_pool', () => {
  let workerFactory: jasmine.Spy;

  beforeEach(() => {
    workerFactory = jasmine.createSpy().and.callFake(() => {
      return {postMessage: jasmine.createSpy()};
    });
  });

  it('returns a worker like that it can postMessage to', () => {
    const worker = {postMessage: jasmine.createSpy()};
    workerFactory.and.returnValue(worker);

    const workerLike = new WorkerPool('testing', 2, workerFactory).getNext();
    workerLike.postMessage('foo', []);

    expect(workerFactory).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith('foo', []);
  });

  describe('allocation', () => {
    it('allocates pools even when instantiated pool with the same path', () => {
      new WorkerPool('a', 1, workerFactory).getNext();
      new WorkerPool('a', 1, workerFactory).getNext();
      expect(workerFactory).toHaveBeenCalledTimes(2);
    });

    it('allocates upto maxPoolSize then allocates from first one again', () => {
      const pool = new WorkerPool('a', 3, workerFactory);
      const workers = [...new Array(5)].map(() => {
        return pool.getNext();
      });

      expect(workerFactory).toHaveBeenCalledTimes(3);
      expect(workers[0]).toBe(workers[3]);
    });
  });

  describe('freeing', () => {
    it('supports freeing and allocates freed one first', () => {
      const pool = new WorkerPool('a', 3, workerFactory);

      const firstWorker = pool.getNext();
      const secondWorker = pool.getNext();
      secondWorker.free();

      const thirdWorker = pool.getNext();
      thirdWorker.postMessage('bar', []);

      expect(firstWorker).not.toBe(thirdWorker);
      expect(secondWorker).toBe(thirdWorker);
    });

    it('allocates the freest worker', () => {
      const pool = new WorkerPool('a', 3, workerFactory);
      const workers = [...new Array(15)].map(() => pool.getNext());

      workers[1].free();
      workers[2].free();
      workers[5].free();
      workers[8].free();

      // Because 3rd one is the freest, allocating a new instance will return it.
      expect(pool.getNext()).toBe(workers[2]);
      // 3rd one is still freest: activeCount = [5, 4, 3].
      expect(pool.getNext()).toBe(workers[2]);
      // Now, activeCont is [5, 4, 4]. Because 2nd one comes first in array index,
      // it wins.
      expect(pool.getNext()).toBe(workers[1]);
      // 3rd one is allocated again.
      expect(pool.getNext()).toBe(workers[2]);
      // Now that every one has 5 active clients, 0th index one gets returned.
      expect(pool.getNext()).toBe(workers[0]);
    });
  });
});
