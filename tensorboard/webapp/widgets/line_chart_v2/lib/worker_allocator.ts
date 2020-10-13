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

import {getWorker} from './worker';

const MAX_WORKER_INSTANCE = 10;

export interface WorkerLike {
  activeCount: number;
  postMessage: (message: any, transfer: Transferable[]) => void;
  free: () => void;
}

class WorkerAllocator {
  private readonly workers: WorkerLike[] = [];

  constructor(private readonly workerResourcePath: string) {
    // TODO(tensorboard-team): consider pre-allocating with the IdleCallback.
  }

  getNext(): WorkerLike {
    let workerLike: WorkerLike;

    const shouldAllocateNew =
      this.workers.every(({activeCount}) => activeCount > 0) &&
      this.workers.length < MAX_WORKER_INSTANCE;

    if (shouldAllocateNew) {
      const worker = getWorker(this.workerResourcePath);
      workerLike = {
        activeCount: 0,
        postMessage: (mesasge: any, transfer: Transferable[]) => {
          worker.postMessage(mesasge, transfer);
        },
        free: () => {
          workerLike.activeCount--;
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
const workerAllocators = new Map<string, WorkerAllocator>();

/**
 * Returns a worker-like object that can be used to offload computation like Worker.
 * This method allocates new Worker upto 10 instances. Depending on its usage (not by CPU
 * utilization but merely number of instance holder), it allocates the freest one. Upon
 * disposal (e.g., Angular's ngOnDestroy), please invoke `free` for recycle.
 *
 * @param workerResourcePath path to worker JavaScript resource.
 */
export function getWorkerInstance(workerResourcePath: string): WorkerLike {
  if (!workerAllocators.has(workerResourcePath)) {
    workerAllocators.set(
      workerResourcePath,
      new WorkerAllocator(workerResourcePath)
    );
  }

  return workerAllocators.get(workerResourcePath)!.getNext();
}

export const TEST_ONLY = {
  cleanup: () => {
    workerAllocators.clear();
  },
};
