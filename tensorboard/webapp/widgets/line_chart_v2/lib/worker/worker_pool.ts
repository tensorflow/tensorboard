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

import {getWorker} from '../worker';

/**
 * An object that that provides facility to interact with a Worker process. Because
 * WorkerPool maintains lifecycle of a Worker, it does not permit `terminate` or any other
 * direct binding to Worker events.
 *
 * For listening to events from Worker, please use MessageChannel pattern:
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
 */
export interface WorkerProxy {
  activeCount: number;
  postMessage: (message: any, transfer: Transferable[]) => void;
  free: () => void;
}

/**
 * Worker pool load balancing module.
 *
 * Module attempts, without knowing the CPU workload, balance number of active users while
 * minimally instantiating Workers.
 *
 * For a transient or for more control over Worker, please instiate one manually.
 *
 * Example usage:
 *
 * ```ts
 * const workerPool = new WorkerPool('my_js_path.js');
 *
 * @Component({...})
 * export class MyComponent {
 *   this.worker = workerPool.getNext();
 *
 *   ngOnDestory() {
 *     this.worker.free();
 *   }
 * }
 * ```
 */
export class WorkerPool {
  private readonly workers: WorkerProxy[] = [];
  constructor(
    private readonly workerResourcePath: Parameters<typeof getWorker>[0],
    private readonly maxPoolSize: number = 10,
    private readonly workerFactory: typeof getWorker = getWorker
  ) {
    // TODO(tensorboard-team): consider pre-allocating with the IdleCallback.
  }

  /**
   * Returns a worker-like object that can be used to offload computation like Worker.
   * This method allocates new Worker upto 10 instances. Depending on its usage (not by CPU
   * utilization but merely number of instance holder), it allocates the freest one. Upon
   * disposal (e.g., Angular's ngOnDestroy), please invoke `free` for recycle. Failing to
   * invoke `free` will impact load balancing, but it will not impact correctness of the
   * program. Similarly, invoking `free` multiple times do not impact correctness but
   * impacts load balancing; please invoke it correctly.
   *
   * Important: to reduce the overhead of fetch and instantiating a worker, we do not
   * terminate a worker once it is completedly freed up. For more control over the lifecycle
   * of a Worker, please instantiate a Worker directly.
   */
  getNext(): WorkerProxy {
    let workerLike: WorkerProxy;

    const shouldAllocateNew =
      this.workers.every(({activeCount}) => activeCount > 0) &&
      this.workers.length < this.maxPoolSize;

    if (shouldAllocateNew) {
      const worker = this.workerFactory(this.workerResourcePath);
      workerLike = {
        activeCount: 0,
        postMessage: (message: any, transfer: Transferable[]) => {
          worker.postMessage(message, transfer);
        },
        free: () => {
          workerLike.activeCount = Math.max(workerLike.activeCount - 1, 0);
        },
      };
      this.workers.push(workerLike);
    } else {
      const activeCounts = this.workers.map(({activeCount}) => activeCount);
      const freestIndex = activeCounts.indexOf(Math.min(...activeCounts));
      workerLike = this.workers[freestIndex];
    }

    workerLike.activeCount++;
    return workerLike;
  }
}
