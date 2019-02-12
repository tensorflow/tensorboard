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
namespace vz_projector.umap.heap {

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

export type Heap = number[][][];

/**
 *  Constructor for the heap objects. The heaps are used
 * for approximate nearest neighbor search, maintaining a list of potential
 * neighbors sorted by their distance. We also flag if potential neighbors
 * are newly added to the list or not. Internally this is stored as
 * a single array; the first axis determines whether we are looking at the
 * array of candidate indices, the array of distances, or the flag array for
 * whether elements are new or not. Each of these arrays are of shape
 * (``nPoints``, ``size``)
 */
export function makeHeap(nPoints: number, size: number): Heap {
  const makeArrays = (fillValue: number) => {
    return utils.empty(nPoints).map(() => {
      return utils.filled(size, fillValue);
    });
  };

  const heap = [];
  heap.push(makeArrays(-1));
  heap.push(makeArrays(Infinity));
  heap.push(makeArrays(0));
  return heap;
}

/**
 * Generate n_samples many integers from 0 to pool_size such that no
 * integer is selected twice. The duplication constraint is achieved via
 * rejection sampling.
 */
export function rejectionSample(nSamples: number, poolSize: number) {
  const result = utils.zeros(nSamples);
  for (let i = 0; i < nSamples; i++) {
    let rejectSample = true;
    let j = 0;
    while (rejectSample) {
      j = utils.tauRandInt(poolSize);
      let broken = false;
      for (let k = 0; k < i; k++) {
        if (j === result[k]) {
          broken = true;
          break;
        }
      }
      if (!broken) rejectSample = false;
    }
    result[i] = j;
  }
  return result;
}

/**
 * Push a new element onto the heap. The heap stores potential neighbors
 * for each data point. The ``row`` parameter determines which data point we
 * are addressing, the ``weight`` determines the distance (for heap sorting),
 * the ``index`` is the element to add, and the flag determines whether this
 * is to be considered a new addition.
 */
export function heapPush(
  heap: Heap,
  row: number,
  weight: number,
  index: number,
  flag: number
) {
  row = Math.floor(row);
  const indices = heap[0][row];
  const weights = heap[1][row];
  const isNew = heap[2][row];

  if (weight >= weights[0]) {
    return 0;
  }

  // Break if we already have this element.
  for (let i = 0; i < indices.length; i++) {
    if (index === indices[i]) {
      return 0;
    }
  }

  // Insert val at position zero
  weights[0] = weight;
  indices[0] = index;
  isNew[0] = flag;

  // Descend the heap, swapping values until the max heap criterion is met
  let i = 0;
  let iSwap = 0;
  while (true) {
    let ic1 = 2 * i + 1;
    let ic2 = ic1 + 1;

    const heapShape2 = heap[0][0].length;
    if (ic1 >= heapShape2) {
      break;
    } else if (ic2 >= heapShape2) {
      if (weights[ic1] > weight) {
        iSwap = ic1;
      } else {
        break;
      }
    } else if (weights[ic1] >= weights[ic2]) {
      if (weight < weights[ic1]) {
        iSwap = ic1;
      } else {
        break;
      }
    } else {
      if (weight < weights[ic2]) {
        iSwap = ic2;
      } else {
        break;
      }
    }

    weights[i] = weights[iSwap];
    indices[i] = indices[iSwap];
    isNew[i] = isNew[iSwap];

    i = iSwap;
  }

  weights[i] = weight;
  indices[i] = index;
  isNew[i] = flag;
}

/**
 * Build a heap of candidate neighbors for nearest neighbor descent. For
 * each vertex the candidate neighbors are any current neighbors, and any
 * vertices that have the vertex as one of their nearest neighbors.
 */
export function buildCandidates(
  currentGraph: Heap,
  nVertices: number,
  nNeighbors: number,
  maxCandidates: number
) {
  const candidateNeighbors = makeHeap(nVertices, maxCandidates);
  for (let i = 0; i < nVertices; i++) {
    for (let j = 0; j < nNeighbors; j++) {
      if (currentGraph[0][i][j] < 0) {
        continue;
      }
      const idx = currentGraph[0][i][j];
      const isn = currentGraph[2][i][j];
      const d = utils.tauRand();
      heapPush(candidateNeighbors, i, d, idx, isn);
      heapPush(candidateNeighbors, idx, d, i, isn);
      currentGraph[2][i][j] = 0;
    }
  }
  return candidateNeighbors;
}

/**
 * Given an array of heaps (of indices and weights), unpack the heap
 * out to give and array of sorted lists of indices and weights by increasing
 * weight. This is effectively just the second half of heap sort (the first
 * half not being required since we already have the data in a heap).
 */
export function deheapSort(heap: Heap) {
  const indices = heap[0];
  const weights = heap[1];

  for (let i = 0; i < indices.length; i++) {
    const indHeap = indices[i];
    const distHeap = weights[i];

    for (let j = 0; j < indHeap.length - 1; j++) {
      const indHeapIndex = indHeap.length - j - 1;
      const distHeapIndex = distHeap.length - j - 1;

      const temp1 = indHeap[0];
      indHeap[0] = indHeap[indHeapIndex];
      indHeap[indHeapIndex] = temp1;

      const temp2 = distHeap[0];
      distHeap[0] = distHeap[distHeapIndex];
      distHeap[distHeapIndex] = temp2;

      siftDown(distHeap, indHeap, distHeapIndex, 0);
    }
  }
  return { indices, weights };
}

/**
 * Restore the heap property for a heap with an out of place element
 * at position ``elt``. This works with a heap pair where heap1 carries
 * the weights and heap2 holds the corresponding elements.
 */
function siftDown(
  heap1: number[],
  heap2: number[],
  ceiling: number,
  elt: number
) {
  while (elt * 2 + 1 < ceiling) {
    const leftChild = elt * 2 + 1;
    const rightChild = leftChild + 1;
    let swap = elt;

    if (heap1[swap] < heap1[leftChild]) {
      swap = leftChild;
    }
    if (rightChild < ceiling && heap1[swap] < heap1[rightChild]) {
      swap = rightChild;
    }

    if (swap === elt) {
      break;
    } else {
      const temp1 = heap1[elt];
      heap1[elt] = heap1[swap];
      heap1[swap] = temp1;

      const temp2 = heap2[elt];
      heap2[elt] = heap2[swap];
      heap2[swap] = temp2;
      elt = swap;
    }
  }
}    
  
}  // namespace vz_projector.umap.heap