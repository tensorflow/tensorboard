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
  AnnotationSort,
  EmbeddingListing,
  SortOrder,
} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function sortAnnotations(
  annotationData: AnnotationDataListing,
  sort: AnnotationSort,
  embeddingData: EmbeddingListing
): string[] {
  let result = Object.keys(annotationData);
  if (sort.metric === '') {
    return result;
  }
  if (sort.order === SortOrder.SIMILAR || sort.order === SortOrder.DISSIMILAR) {
    return (result = embeddingSort(embeddingData, result, sort));
  }
  return classicSort(annotationData, result, sort);
}

function classicSort(
  annotationData: AnnotationDataListing,
  keys: string[],
  sort: AnnotationSort
): string[] {
  const strippedMetric = stripMetricString(sort.metric);
  switch (sort.order) {
    case SortOrder.DOWN: {
      const maxData: {[annotation: string]: number} = {};
      for (const annotation of keys) {
        maxData[annotation] = Math.max(
          ...annotationData[annotation]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
            )
        );
      }
      keys = keys.sort((a, b) => {
        return maxData[b] - maxData[a];
      });
      break;
    }
    case SortOrder.UP: {
      const minData: {[annotation: string]: number} = {};
      for (const annotation of keys) {
        minData[annotation] = Math.min(
          ...annotationData[annotation]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
            )
        );
      }
      keys = keys.sort((a, b) => {
        return minData[a] - minData[b];
      });
      break;
    }
  }
  return keys;
}

function embeddingSort(
  embeddingData: EmbeddingListing,
  keys: string[],
  sort: AnnotationSort
): string[] {
  switch (sort.order) {
    case SortOrder.SIMILAR: {
      const distance: {[annotation: string]: number} = {};
      for (const annotation of keys) {
        if (annotation === sort.metric) {
          distance[annotation] = Number.NEGATIVE_INFINITY;
        } else {
          distance[annotation] = embeddingData[annotation]
            ? calculateDistance(
                embeddingData[sort.metric],
                embeddingData[annotation]
              )
            : Number.POSITIVE_INFINITY;
        }
      }
      keys = keys.sort((a, b) => {
        return distance[a] - distance[b];
      });
      break;
    }
    case SortOrder.DISSIMILAR: {
      const distance: {[annotation: string]: number} = {};
      for (const annotation of keys) {
        if (annotation === sort.metric) {
          distance[annotation] = Number.POSITIVE_INFINITY;
        } else {
          distance[annotation] = embeddingData[annotation]
            ? calculateDistance(
                embeddingData[sort.metric],
                embeddingData[annotation],
                Number.NEGATIVE_INFINITY
              )
            : Number.NEGATIVE_INFINITY;
        }
      }
      keys = keys.sort((a, b) => {
        return distance[b] - distance[a];
      });
      break;
    }
  }
  return keys;
}

function calculateDistance(
  reference: number[],
  toEmbedding: number[],
  faultCase: number = Number.POSITIVE_INFINITY
): number {
  if (reference.length != toEmbedding.length) return faultCase;
  const subtracted = toEmbedding.map((i, n) => i - reference[n]);
  const powered = subtracted.map((e) => Math.pow(e, 2));
  const sum = powered.reduce((total, current) => total + current, 0);
  return Math.sqrt(sum);
}
