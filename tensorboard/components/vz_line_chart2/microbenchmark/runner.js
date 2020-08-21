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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { patchAsync, flushAsync, setTimeoutP } from './async.js';
import { Size } from './types.js';
export function runner(benchmarks) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        for (const benchmark of benchmarks) {
            const status = document.createElement('div');
            Object.assign(status.style, {
                background: '#000a',
                color: '#fff',
                contain: 'content',
                left: 0,
                padding: '5px',
                position: 'fixed',
                top: 0,
            });
            status.innerText = `${benchmark.name}: Bootstraping...`;
            const container = document.createElement('div');
            Object.assign(container.style, {
                width: '600px',
                height: '400px',
                willChange: 'transform',
                contain: 'content',
            });
            document.body.append(container, status);
            const async = patchAsync();
            const context = { container, flushAsync: flushAsync.bind(null, async) };
            status.innerText = `${benchmark.name}: before`;
            if (benchmark.before)
                yield benchmark.before(context);
            yield flushAsync(async);
            const numIterations = getNumIterations(benchmark.size);
            let totalTimeInMs = 0;
            const timePerIterationInMs = [];
            const timeInGcInMs = window.gc ? [] : null;
            for (let iter = 0; iter < numIterations + 1; iter++) {
                status.innerText = `${benchmark.name}: ${iter} of ${numIterations}`;
                const timeStart = performance.now();
                console.time(`iter: ${iter}`);
                yield benchmark.run(context);
                yield flushAsync(async);
                const timeEnd = performance.now();
                console.timeEnd(`iter: ${iter}`);
                status.innerText =
                    `${benchmark.name}: ${iter} of ${numIterations}. ` +
                        'Waiting between iterations.';
                // Launch Chrome with --js-flags='--expose_gc' to enable gc.
                if (window.gc && timeInGcInMs) {
                    const gcTimeStart = performance.now();
                    window.gc();
                    timeInGcInMs.push(performance.now() - gcTimeStart);
                    yield setTimeoutP(50);
                }
                else {
                    yield setTimeoutP(500);
                }
                // Ignore the first call since it tends to be noisy.
                if (iter !== 0) {
                    totalTimeInMs += timeEnd - timeStart;
                    timePerIterationInMs.push(timeEnd - timeStart);
                }
                if (benchmark.afterEach)
                    yield benchmark.afterEach(context);
                yield flushAsync(async);
            }
            results.push({
                totalTimeInMs,
                timePerIterationInMs,
                timeInGcInMs,
                numIterations,
                benchmark,
            });
            status.innerText = `${benchmark.name}: after`;
            if (benchmark.after)
                yield benchmark.after(context);
            yield flushAsync(async);
            async.reset();
            document.body.removeChild(container);
            document.body.removeChild(status);
        }
        return results;
    });
}
function getNumIterations(size) {
    switch (size) {
        case Size.SMALL:
            return 100;
        case Size.MEDIUM:
            return 25;
        case Size.LARGE:
            return 10;
    }
}
