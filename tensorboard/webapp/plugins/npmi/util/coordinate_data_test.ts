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
import {AnnotationDataListing} from '../store/npmi_types';
import {buildSampleAnnotationData} from '../testing';
import {convertToCoordinateData} from './coordinate_data';

describe('coordinate data utils', () => {
  it('creates coordinate data', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const selectedAnnotations = ['annotation_1'];
    const activeRuns = ['run_1', 'run_3'];
    const activeMetrics = ['test', 'other'];
    const data = convertToCoordinateData(
      annotationData,
      selectedAnnotations,
      activeRuns,
      activeMetrics
    );
    expect(data.extremes).toEqual({min: -1, max: 0.815});
    expect(data.coordinates).toEqual([
      {
        runId: 'run_1',
        annotation: 'annotation_1',
        values: [
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_1',
            nPMIValue: 0.5178,
            countValue: 100,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_1',
            nPMIValue: 0.815,
            countValue: 100,
          },
        ],
      },
      {
        runId: 'run_3',
        annotation: 'annotation_1',
        values: [
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_3',
            nPMIValue: -0.31,
            countValue: 53,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_3',
            nPMIValue: -1.0,
            countValue: 53,
          },
        ],
      },
    ]);
  });

  it('returns empty coordinates when no runs active', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const selectedAnnotations = ['annotation_1'];
    const activeRuns: string[] = [];
    const activeMetrics = ['test', 'other'];
    const data = convertToCoordinateData(
      annotationData,
      selectedAnnotations,
      activeRuns,
      activeMetrics
    );
    expect(data.extremes).toEqual({min: -1.0, max: 1.0});
    expect(data.coordinates).toEqual([]);
  });

  it('returns empty coordinates when no annotations are present', () => {
    const annotationData: AnnotationDataListing = {};
    const selectedAnnotations: string[] = [];
    const activeRuns = ['run_1'];
    const activeMetrics = ['test', 'other'];
    const data = convertToCoordinateData(
      annotationData,
      selectedAnnotations,
      activeRuns,
      activeMetrics
    );
    expect(data.extremes).toEqual({min: -1.0, max: 1.0});
    expect(data.coordinates).toEqual([]);
  });

  it('returns empty coordinates when nothing matches the active metrics', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const selectedAnnotations = ['annotation_1'];
    const activeRuns = ['run_1'];
    const activeMetrics = ['more', 'metrics'];
    const data = convertToCoordinateData(
      annotationData,
      selectedAnnotations,
      activeRuns,
      activeMetrics
    );
    expect(data.extremes).toEqual({min: -1.0, max: 1.0});
    expect(data.coordinates).toEqual([]);
  });
});
