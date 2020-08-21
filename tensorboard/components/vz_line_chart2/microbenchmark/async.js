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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const realRaf = window.requestAnimationFrame;
const realCaf = window.cancelAnimationFrame;
const realSetTimeout = window.setTimeout;
const realClearTimeout = window.clearTimeout;
const realSetInterval = window.setInterval;
export function patchAsync() {
    const async = {
        promises: new Map(),
        reset: () => {
            window.setTimeout = realSetTimeout;
            window.requestAnimationFrame = realRaf;
            window.setInterval = realSetInterval;
            window.cancelAnimationFrame = realCaf;
            window.clearTimeout = realClearTimeout;
        },
    };
    const idToResolve = new Map();
    const anyWindow = window;
    anyWindow.setInterval = () => {
        throw new Error('Benchmark cannot run when there is an interval');
    };
    anyWindow.setTimeout = (cb, time = 0, ...args) => {
        const id = realSetTimeout(() => {
            cb();
            if (idToResolve.get(stringId)) {
                idToResolve.get(stringId).resolve();
            }
            async.promises.delete(stringId);
            idToResolve.delete(stringId);
        }, time, ...args);
        const stringId = `to_${id}`;
        if (!(time > 0)) {
            async.promises.set(stringId, new Promise((resolve) => {
                idToResolve.set(stringId, { resolve });
            }));
        }
        return id;
    };
    anyWindow.clearTimeout = (id) => {
        realClearTimeout(id);
        const stringId = `to_${id}`;
        if (idToResolve.get(stringId)) {
            idToResolve.get(stringId).resolve();
        }
        async.promises.delete(stringId);
        idToResolve.delete(stringId);
    };
    anyWindow.requestAnimationFrame = (cb) => {
        const id = realRaf(() => {
            cb();
            if (idToResolve.get(stringId)) {
                idToResolve.get(stringId).resolve();
            }
            async.promises.delete(stringId);
            idToResolve.delete(stringId);
        });
        const stringId = `raf_${id}`;
        async.promises.set(stringId, new Promise((resolve) => {
            idToResolve.set(stringId, { resolve });
        }));
        return id;
    };
    anyWindow.cancelAnimationFrame = (id) => {
        realCaf(id);
        const stringId = `raf_${id}`;
        if (idToResolve.get(stringId)) {
            idToResolve.get(stringId).resolve();
        }
        async.promises.delete(stringId);
        idToResolve.delete(stringId);
    };
    return async;
}
function rafP() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            realRaf(resolve);
        });
    });
}
export function setTimeoutP(time) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            realSetTimeout(resolve, time);
        });
    });
}
export function flushAsync(async) {
    return __awaiter(this, void 0, void 0, function* () {
        while (async.promises.size) {
            yield Promise.all([...async.promises.values()]);
        }
        // Make sure layout, paint, and composite to happen by waiting an animation
        // frame.
        yield rafP();
    });
}
