/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {UMAP} from 'umap-js';

const UMAP_SAMPLE_SIZE = 20000;

export interface EmbeddingDataPoint {
  vector: number[];
  name: string;
  sequenceIndex?: number;
  index: number;
  projection?: {
    x: number;
    y: number;
  };
}

export interface EmbeddingListing {
  [annotation: string]: EmbeddingDataPoint;
}

/**
 * Dataset contains a DataPoints array that should be treated as immutable. This
 * acts as a working subset of the original data, with cached properties
 * from computationally expensive operations. Because creating a subset
 * requires normalizing and shifting the vector space, we make a copy of the
 * data so we can still always create new subsets based on the original data.
 */
export interface EmbeddingDataSet {
  points: EmbeddingListing;
  pointKeys: string[];
  shuffledDataIndices: number[];

  // UMAP
  hasUmapRun: boolean;
}

/**
 * Shuffles the array in-place in O(n) time using Fisher-Yates algorithm.
 *
 * Copied from tensorboard/plugins/projector/vz_projector/util.ts.
 */
function shuffle<T>(array: T[]): T[] {
  let m = array.length;
  let t: T;
  let i: number;
  // While there remain elements to shuffle.
  while (m) {
    // Pick a remaining element
    i = Math.floor(Math.random() * m--);
    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

function range(count: number): number[] {
  return [...new Array(count)].map((_, index) => index);
}

export function buildEmbeddingDataSet(
  points: EmbeddingListing
): EmbeddingDataSet {
  const pointKeys = Object.keys(points);
  return {
    points,
    pointKeys,
    shuffledDataIndices: shuffle(range(pointKeys.length)),
    hasUmapRun: false,
  };
}

/** Runs UMAP on the data. For performance reasons, this modifies the input
 * embeddingData.*/
export async function projectUmap(
  embeddingData: EmbeddingDataSet,
  nNeighbors: number,
  minDist: number,
  umapIndices: number[],
  messageCallback: (message: string) => void
): Promise<EmbeddingDataSet> {
  return new Promise((resolve, reject) => {
    if (umapIndices.length <= nNeighbors) {
      reject('Error: Please select more data points.');
      return;
    }
    embeddingData.hasUmapRun = true;
    const epochStepSize = 10;
    const sampledIndices = umapIndices.slice(0, UMAP_SAMPLE_SIZE);
    const sampledData = sampledIndices.map(
      (i) => embeddingData.points[embeddingData.pointKeys[i]].vector
    );
    messageCallback('Calculating UMAP');
    const umap = new UMAP({nComponents: 2, nNeighbors, minDist});
    const epochs = umap.initializeFit(sampledData);
    umap.fitAsync(sampledData, (epochNumber) => {
      if (epochNumber === epochs) {
        const result = umap.getEmbedding();
        embeddingData.hasUmapRun = true;
        sampledIndices.forEach((index, i) => {
          embeddingData.points[embeddingData.pointKeys[index]].projection = {
            x: result[i][0],
            y: result[i][1],
          };
        });
        resolve(embeddingData);
      } else if (epochNumber % epochStepSize === 0) {
        messageCallback(`UMAP epoch ${epochNumber}/${epochs}`);
      }
    });
  });
}
