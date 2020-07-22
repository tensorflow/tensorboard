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

import {Result} from './types';

export function htmlTableReporter(results: Result[]) {
  const displayResults = results
    .map(
      ({
        totalTimeInMs,
        numIterations,
        timePerIterationInMs,
        timeInGcInMs,
        benchmark,
      }) => {
        if (numIterations <= 0) {
          throw new RangeError(
            `numIterations has to be positive value. Got ${numIterations}`
          );
        }
        const avgTimeInMs = totalTimeInMs / numIterations;
        const timeVariance =
          timePerIterationInMs
            .map((time) => {
              const diff = time - avgTimeInMs;
              return diff * diff;
            })
            .reduce((sigma, diff) => {
              return sigma + diff;
            }, 0) / numIterations;
        const avgTimeInGcInMs = timeInGcInMs
          ? timeInGcInMs.reduce((a, b) => a + b, 0) / numIterations
          : null;

        return {
          name: benchmark.name,
          min: Math.min(...timePerIterationInMs),
          max: Math.max(...timePerIterationInMs),
          numIterations,
          timeVariance,
          avgTimeInMs,
          avgTimeInGcInMs,
        };
      }
    )
    .map(
      ({
        name,
        min,
        max,
        numIterations,
        timeVariance,
        avgTimeInMs,
        avgTimeInGcInMs,
      }) => {
        return {
          name,
          numIterations,
          avgTimeInMs: `${avgTimeInMs.toFixed(3)}ms / run`,
          minTimeInMs: `${min.toFixed(3)}ms`,
          maxTimeInMs: `${max.toFixed(3)}ms`,
          stdDeviationTimeInMs: Math.sqrt(timeVariance).toFixed(6),
          avgTimeInGcInMs: avgTimeInGcInMs
            ? `${avgTimeInGcInMs.toFixed(3)}ms`
            : 'N/A',
        };
      }
    );

  const reporter = document.createElement('table');
  Object.assign(reporter.style, {
    borderSpacing: '10px',
    borderCollapse: 'separate',
  });

  function createTHead() {
    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const name = document.createElement('td');
    name.innerText = 'Name';
    const iterations = document.createElement('td');
    iterations.innerText = 'Iterations';
    const avgTime = document.createElement('td');
    avgTime.innerText = 'Avg Time';
    const min = document.createElement('td');
    min.innerText = 'Min';
    const max = document.createElement('td');
    max.innerText = 'Max';
    const stdDeviation = document.createElement('td');
    stdDeviation.innerText = 'Std Deviation';
    const gc = document.createElement('td');
    gc.innerText = 'Avg GC Time';

    (headerRow as any).append(
      name,
      iterations,
      avgTime,
      min,
      max,
      stdDeviation,
      gc
    );
    header.appendChild(headerRow);
    return header;
  }

  // CREATE BODY
  const reporterContent = displayResults.map(
    ({
      avgTimeInMs,
      name,
      numIterations,
      minTimeInMs,
      maxTimeInMs,
      stdDeviationTimeInMs,
      avgTimeInGcInMs,
    }) => {
      const row = document.createElement('tr');
      const nameEl = document.createElement('td');
      nameEl.innerText = name;
      const iterationsEl = document.createElement('td');
      iterationsEl.innerText = String(numIterations);
      const avgTimeEl = document.createElement('td');
      avgTimeEl.innerText = avgTimeInMs;
      const minEl = document.createElement('td');
      minEl.innerText = minTimeInMs;
      const maxEl = document.createElement('td');
      maxEl.innerText = maxTimeInMs;
      const stdDeviationEl = document.createElement('td');
      stdDeviationEl.innerText = String(stdDeviationTimeInMs);
      const gc = document.createElement('td');
      gc.innerText = avgTimeInGcInMs;
      (row as any).append(
        nameEl,
        iterationsEl,
        avgTimeEl,
        minEl,
        maxEl,
        stdDeviationEl,
        gc
      );
      return row;
    }
  );

  (reporter as any).append(createTHead(), ...reporterContent);
  (document.body as any).prepend(reporter);
}

export function consoleReporter(results: Result[]) {
  const displayResults = results.map(
    ({benchmark, totalTimeInMs, numIterations}) => {
      return {
        name: benchmark.name,
        numIterations,
        avgTime: `${totalTimeInMs / numIterations}ms / run`,
      };
    }
  );

  console.table(displayResults);
}
