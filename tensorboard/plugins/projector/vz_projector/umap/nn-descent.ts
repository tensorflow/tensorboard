/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_projector.umap.nnDescent {

/**
 * This is a JavaScript reimplementation of UMAP (original license below), from
 * the python implementation found at https://github.com/lmcinnes/umap.
 *
 * @author andycoenen@google.com (Andy Coenen)
 */

/**
 * @license
 * BSD 3-Clause License
 * 
 * Copyright (c) 2017, Leland McInnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */  

export function makeNNDescent(distanceFn: DistanceFn) {
  return function nNDescent(
    data: Vectors,
    leafArray: Vectors,
    nNeighbors: number,
    nIters = 10,
    maxCandidates = 50,
    delta = 0.001,
    rho = 0.5,
    rpTreeInit = true
  ) {
    const nVertices = data.length;
    const currentGraph = heap.makeHeap(data.length, nNeighbors);

    for (let i = 0; i < data.length; i++) {
      const indices = heap.rejectionSample(nNeighbors, data.length);
      for (let j = 0; j < indices.length; j++) {
        const d = distanceFn(data[i], data[indices[j]]);

        heap.heapPush(currentGraph, i, d, indices[j], 1);
        heap.heapPush(currentGraph, indices[j], d, i, 1);
      }
    }
    if (rpTreeInit) {
      for (let n = 0; n < leafArray.length; n++) {
        for (let i = 0; i < leafArray[n].length; i++) {
          if (leafArray[n][i] < 0) {
            break;
          }
          for (let j = i + 1; j < leafArray[n].length; j++) {
            if (leafArray[n][j] < 0) {
              break;
            }
            const d = distanceFn(data[leafArray[n][i]], data[leafArray[n][j]]);
            heap.heapPush(currentGraph, leafArray[n][i], d, leafArray[n][j], 1);
            heap.heapPush(currentGraph, leafArray[n][j], d, leafArray[n][i], 1);
          }
        }
      }
    }

    for (let n = 0; n < nIters; n++) {
      const candidateNeighbors = heap.buildCandidates(
        currentGraph,
        nVertices,
        nNeighbors,
        maxCandidates
      );

      let c = 0;
      for (let i = 0; i < nVertices; i++) {
        for (let j = 0; j < maxCandidates; j++) {
          let p = Math.floor(candidateNeighbors[0][i][j]);
          if (p < 0 || utils.tauRand() < rho) {
            continue;
          }
          for (let k = 0; k < maxCandidates; k++) {
            const q = Math.floor(candidateNeighbors[0][i][k]);
            const cj = candidateNeighbors[2][i][j];
            const ck = candidateNeighbors[2][i][k];
            if (q < 0 || (!cj && !ck)) {
              continue;
            }

            const d = distanceFn(data[p], data[q]);
            c += heap.heapPush(currentGraph, p, d, q, 1);
            c += heap.heapPush(currentGraph, q, d, p, 1);
          }
        }
      }
      if (c <= delta * nNeighbors * data.length) {
        break;
      }
    }
    const sorted = heap.deheapSort(currentGraph);
    return sorted;
  };
}
  
}  // namespace vz_projector.umap.nnDescent