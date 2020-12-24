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
/**
 * @fileoverview Overrides global async functions to support "wait" (or flush).
 *
 * It allows, when invoked `patchAsync`, user to wait for all `setTimeout` and
 * `requestAnimationFrame` for an appropriate amount of time with the
 * `flushAsync` method.
 */

const realRaf = window.requestAnimationFrame;
const realCaf = window.cancelAnimationFrame;
const realSetTimeout = window.setTimeout;
const realClearTimeout = window.clearTimeout;
const realSetInterval = window.setInterval;

interface Async {
  promises: Map<string, Promise<void>>;
  reset: () => void;
}

export function patchAsync(): Async {
  const async = {
    promises: new Map<string, Promise<void>>(),
    reset: () => {
      window.setTimeout = realSetTimeout;
      window.requestAnimationFrame = realRaf;
      window.setInterval = realSetInterval;
      window.cancelAnimationFrame = realCaf;
      window.clearTimeout = realClearTimeout;
    },
  };

  const idToResolve = new Map<string, {resolve: () => void}>();

  const anyWindow = window as any;
  anyWindow.setInterval = () => {
    throw new Error('Benchmark cannot run when there is an interval');
  };

  anyWindow.setTimeout = (cb: any, time: number = 0, ...args: any[]) => {
    const id = realSetTimeout(
      () => {
        cb();
        if (idToResolve.get(stringId)) {
          idToResolve.get(stringId)!.resolve();
        }
        async.promises.delete(stringId);
        idToResolve.delete(stringId);
      },
      time,
      ...args
    );
    const stringId = `to_${id}`;
    if (!(time > 0)) {
      async.promises.set(
        stringId,
        new Promise<void>((resolve) => {
          idToResolve.set(stringId, {resolve});
        })
      );
    }
    return id;
  };

  anyWindow.clearTimeout = (id: number) => {
    realClearTimeout(id);
    const stringId = `to_${id}`;
    if (idToResolve.get(stringId)) {
      idToResolve.get(stringId)!.resolve();
    }
    async.promises.delete(stringId);
    idToResolve.delete(stringId);
  };

  anyWindow.requestAnimationFrame = (cb: any) => {
    const id = realRaf(() => {
      cb();
      if (idToResolve.get(stringId)) {
        idToResolve.get(stringId)!.resolve();
      }
      async.promises.delete(stringId);
      idToResolve.delete(stringId);
    });
    const stringId = `raf_${id}`;
    async.promises.set(
      stringId,
      new Promise((resolve) => {
        idToResolve.set(stringId, {resolve});
      })
    );
    return id;
  };

  anyWindow.cancelAnimationFrame = (id: number) => {
    realCaf(id);
    const stringId = `raf_${id}`;
    if (idToResolve.get(stringId)) {
      idToResolve.get(stringId)!.resolve();
    }
    async.promises.delete(stringId);
    idToResolve.delete(stringId);
  };

  return async;
}

async function rafP() {
  return new Promise((resolve) => {
    realRaf(resolve);
  });
}

export async function setTimeoutP(time: number) {
  return new Promise((resolve) => {
    realSetTimeout(resolve, time);
  });
}

export async function flushAsync(async: Async) {
  while (async.promises.size) {
    await Promise.all([...async.promises.values()]);
  }

  // Make sure layout, paint, and composite to happen by waiting an animation
  // frame.
  await rafP();
}
