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
  EmbeddingDataSet,
  SortOrder,
} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function sortAnnotations(
  annotationData: AnnotationDataListing,
  sort: AnnotationSort,
  embeddingData: EmbeddingDataSet | undefined
): string[] {
  const result = Object.keys(annotationData);
  const similarityBased =
    sort.order === SortOrder.DISSIMILAR || sort.order === SortOrder.SIMILAR;
  if (
    sort.metric === '' ||
    ((embeddingData === undefined ||
      embeddingData.points[sort.metric] === undefined) &&
      similarityBased)
  ) {
    return result;
  }
  const distanceData: {[annotation: string]: number} = similarityBased
    ? calculateDistances(result, embeddingData!, sort)
    : extractExtremeData(result, annotationData, sort);
  return sortData(
    result,
    distanceData,
    sort.order === SortOrder.ASCENDNG || sort.order === SortOrder.SIMILAR
  );
}

function sortData(
  keys: string[],
  values: {[annotation: string]: number},
  ascending: boolean
) {
  if (ascending) {
    return keys.sort((a, b) => {
      return values[a] - values[b];
    });
  }
  return keys.sort((a, b) => {
    return values[b] - values[a];
  });
}

function extractExtremeData(
  keys: string[],
  annotationData: AnnotationDataListing,
  sort: AnnotationSort
) {
  const strippedMetric = stripMetricString(sort.metric);
  const extremeData: {[annotation: string]: number} = {};
  if (sort.order === SortOrder.DESCENDING) {
    for (const annotation of keys) {
      extremeData[annotation] = Math.max(
        ...annotationData[annotation]
          .filter((annotation) => annotation.metric === strippedMetric)
          .map((filtered) =>
            filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
          )
      );
    }
  } else {
    for (const annotation of keys) {
      extremeData[annotation] = Math.min(
        ...annotationData[annotation]
          .filter((annotation) => annotation.metric === strippedMetric)
          .map((filtered) =>
            filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
          )
      );
    }
  }
  return extremeData;
}

function calculateDistances(
  keys: string[],
  embeddingData: EmbeddingDataSet,
  sort: AnnotationSort
) {
  const distances: {[annotation: string]: number} = {};
  let sameDistance = Number.POSITIVE_INFINITY;
  let extremeDistance = Number.NEGATIVE_INFINITY;
  if (sort.order === SortOrder.SIMILAR) {
    sameDistance = Number.NEGATIVE_INFINITY;
    extremeDistance = Number.POSITIVE_INFINITY;
  }
  for (const annotation of keys) {
    if (annotation === sort.metric) {
      distances[annotation] = sameDistance;
    } else {
      if (embeddingData.points[annotation] === undefined) {
        distances[annotation] = extremeDistance;
      } else {
        distances[annotation] = embeddingData.points[annotation].vector
          ? calculateEmbeddingSimilarity(
              embeddingData.points[sort.metric].vector,
              embeddingData.points[annotation].vector,
              extremeDistance
            )
          : extremeDistance;
      }
    }
  }
  return distances;
}

function calculateEmbeddingSimilarity(
  reference: number[],
  toEmbedding: number[],
  faultCase: number
): number {
  if (reference.length != toEmbedding.length) return faultCase;
  const subtracted = toEmbedding.map((value, key) => value - reference[key]);
  const powered = subtracted.map((e) => Math.pow(e, 2));
  return powered.reduce((total, current) => total + current, 0);
}
