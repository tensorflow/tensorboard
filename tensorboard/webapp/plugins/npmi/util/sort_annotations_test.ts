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
import {
  AnnotationDataListing,
  SortOrder,
  AnnotationSort,
  EmbeddingListing,
} from '../store/npmi_types';
import {sortAnnotations} from './sort_annotations';
import {buildSampleAnnotationData} from '../testing';

describe('sort annotations utils', () => {
  it('sorts annotations upwards', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'nPMI@test',
      order: SortOrder.UP,
    };
    const annotations = sortAnnotations(annotationData, sort, {});
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_3',
      'annotation_2',
    ]);
  });

  it('sorts annotations downwards', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'nPMI@test',
      order: SortOrder.DOWN,
    };
    const annotations = sortAnnotations(annotationData, sort, {});
    expect(annotations).toEqual([
      'annotation_3',
      'annotation_1',
      'annotation_2',
    ]);
  });

  it('sorts annotations by similar embeddings', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'annotation_1',
      order: SortOrder.SIMILAR,
    };
    const embeddingData: EmbeddingListing = {
      annotation_1: [0.5],
      annotation_2: [-0.2],
      annotation_3: [0.1],
    };
    const annotations = sortAnnotations(annotationData, sort, embeddingData);
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_3',
      'annotation_2',
    ]);
  });

  it('sorts annotations by dissimilar embeddings', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'annotation_2',
      order: SortOrder.DISSIMILAR,
    };
    const embeddingData: EmbeddingListing = {
      annotation_1: [0.5],
      annotation_2: [-0.2],
      annotation_3: [0.1],
    };
    const annotations = sortAnnotations(annotationData, sort, embeddingData);
    expect(annotations).toEqual([
      'annotation_2',
      'annotation_1',
      'annotation_3',
    ]);
  });

  it('sorts annotations by similar embeddings with empty embedding', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'annotation_1',
      order: SortOrder.SIMILAR,
    };
    const embeddingData: EmbeddingListing = {
      annotation_1: [0.5],
      annotation_3: [0.1],
    };
    const annotations = sortAnnotations(annotationData, sort, embeddingData);
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_3',
      'annotation_2',
    ]);
  });

  it('sorts annotations by dissimilar embeddings with empty embedding', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: 'annotation_2',
      order: SortOrder.DISSIMILAR,
    };
    const embeddingData: EmbeddingListing = {
      annotation_2: [-0.2],
      annotation_3: [0.1],
    };
    const annotations = sortAnnotations(annotationData, sort, embeddingData);
    expect(annotations).toEqual([
      'annotation_2',
      'annotation_3',
      'annotation_1',
    ]);
  });

  it('does not sort annotations if no metric specified', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const sort: AnnotationSort = {
      metric: '',
      order: SortOrder.UP,
    };
    const annotations = sortAnnotations(annotationData, sort, {});
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_2',
      'annotation_3',
    ]);
  });
});
