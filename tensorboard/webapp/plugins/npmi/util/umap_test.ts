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
import {createSampleEmbeddingListing} from '../testing';
import {buildEmbeddingDataSet, projectUmap} from './umap';

describe('umap utils', () => {
  it('builds embedding dataset', () => {
    const embeddingListing = createSampleEmbeddingListing();
    const embeddingDataSet = buildEmbeddingDataSet(embeddingListing);
    expect(embeddingDataSet.points).toEqual(embeddingListing);
    expect(embeddingDataSet.pointKeys).toEqual(Object.keys(embeddingListing));
    expect(embeddingDataSet.shuffledDataIndices.length).toBe(
      Object.keys(embeddingListing).length
    );
    expect(embeddingDataSet.hasUmapRun).toBeFalse();
  });

  it('projects embedding dataset', async () => {
    const inputDataSet = buildEmbeddingDataSet({
      annotation_1: {
        vector: [0.5, 0.6, 0.1],
        name: 'annotation_1',
        index: 0,
      },
      annotation_2: {
        vector: [-0.2, 0.3, 0.5],
        name: 'annotation_2',
        index: 1,
      },
      annotation_3: {
        vector: [0.1, -0.5, -0.8],
        name: 'annotation_3',
        index: 2,
      },
      annotation_4: {
        vector: [0.1, 0.5, 0.8],
        name: 'annotation_4',
        index: 2,
      },
      annotation_5: {
        vector: [0.3, 0.5, -0.3],
        name: 'annotation_5',
        index: 2,
      },
    });
    const embeddingDataSet = await projectUmap(
      inputDataSet,
      2,
      0.1,
      [0, 1, 2, 3, 4],
      () => {}
    );
    expect(embeddingDataSet.hasUmapRun).toBeTrue();
    for (const key of embeddingDataSet.pointKeys) {
      expect(embeddingDataSet.points[key].projection).toBeTruthy();
    }
  });

  it('does not project if not more data points than neighbors', async () => {
    const embeddingDataSet = buildEmbeddingDataSet({
      annotation_1: {
        vector: [0.5, 0.6, 0.1],
        name: 'annotation_1',
        index: 0,
      },
      annotation_2: {
        vector: [-0.2, 0.3, 0.5],
        name: 'annotation_2',
        index: 1,
      },
      annotation_3: {
        vector: [0.1, -0.5, -0.8],
        name: 'annotation_3',
        index: 2,
      },
      annotation_4: {
        vector: [0.1, 0.5, 0.8],
        name: 'annotation_4',
        index: 2,
      },
      annotation_5: {
        vector: [0.3, 0.5, -0.3],
        name: 'annotation_5',
        index: 2,
      },
    });
    return projectUmap(
      embeddingDataSet,
      5,
      0.1,
      [0, 1, 2, 3, 4],
      () => {}
    ).then(
      () => {
        fail('Did project even though not enough data points.');
      },
      (message) => {
        expect(message).toBe('Error: Please select more data points.');
      }
    );
  });
});
