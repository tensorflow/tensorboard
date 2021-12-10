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
  ArithmeticElement,
  ArithmeticKind,
  MetricFilterListing,
  Operator,
} from '../store/npmi_types';
import {buildSampleAnnotationData} from '../testing';
import {filterAnnotations, removeHiddenAnnotations} from './filter_annotations';

describe('filter annotations utils', () => {
  const annotationData: AnnotationDataListing = buildSampleAnnotationData();
  const activeRuns = ['run_1', 'run_2'];
  const metricArithmetic: ArithmeticElement[] = [
    {kind: ArithmeticKind.METRIC, metric: 'nPMI@test'},
    {kind: ArithmeticKind.OPERATOR, operator: Operator.AND},
    {kind: ArithmeticKind.METRIC, metric: 'nPMI@other'},
  ];
  const metricFilters: MetricFilterListing = {
    'nPMI@test': {
      max: 1.0,
      min: -1.0,
      includeNaN: false,
    },
    'nPMI@other': {
      max: 1.0,
      min: 0,
      includeNaN: false,
    },
  };
  const metrics = ['nPMI@test', 'nPMI@other'];
  const hiddenAnnotations = ['annotation_2', 'annotation_3'];

  describe('filter annotations', () => {
    it('returns correct result filtered by runs, active metrics, and metric filters', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        metricArithmetic,
        metricFilters,
        metrics,
        ''
      );
      expect(result).toEqual({
        annotation_1: [
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
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_2',
            nPMIValue: 0.02157,
            countValue: 101,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.02157,
            countValue: 101,
          },
        ],
        annotation_3: [
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_1',
            nPMIValue: 0.757,
            countValue: 572,
          },
          {
            annotation: 'annotation3',
            metric: 'other',
            run: 'run_1',
            nPMIValue: 0.05,
            countValue: 53,
          },
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_2',
            nPMIValue: -0.157,
            countValue: 572,
          },
          {
            annotation: 'annotation3',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.05,
            countValue: 53,
          },
        ],
      });
    });

    it('filters out null values if includeNaN is false', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        [{kind: ArithmeticKind.METRIC, metric: 'nPMI@test'}],
        {
          'nPMI@test': {
            max: -0.9,
            min: -1.0,
            includeNaN: false,
          },
        },
        metrics,
        ''
      );
      expect(result).toEqual({});
    });

    it('preserves null values if includeNaN is true', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        [{kind: ArithmeticKind.METRIC, metric: 'nPMI@test'}],
        {
          'nPMI@test': {
            max: -0.9,
            min: -1.0,
            includeNaN: true,
          },
        },
        metrics,
        ''
      );
      expect(result).toEqual({
        annotation_2: [
          {
            annotation: 'annotation_2',
            metric: 'test',
            run: 'run_1',
            nPMIValue: null,
            countValue: 572,
          },
          {
            annotation: 'annotation_2',
            metric: 'other',
            run: 'run_1',
            nPMIValue: -1.0,
            countValue: 53,
          },
        ],
      });
    });

    it('returns correct result if no filters active', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        [],
        {},
        metrics,
        ''
      );
      expect(result).toEqual({
        annotation_1: [
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
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_2',
            nPMIValue: 0.02157,
            countValue: 101,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.02157,
            countValue: 101,
          },
        ],
        annotation_2: [
          {
            annotation: 'annotation_2',
            metric: 'test',
            run: 'run_1',
            nPMIValue: null,
            countValue: 572,
          },
          {
            annotation: 'annotation_2',
            metric: 'other',
            run: 'run_1',
            nPMIValue: -1.0,
            countValue: 53,
          },
        ],
        annotation_3: [
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_1',
            nPMIValue: 0.757,
            countValue: 572,
          },
          {
            annotation: 'annotation3',
            metric: 'other',
            run: 'run_1',
            nPMIValue: 0.05,
            countValue: 53,
          },
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_2',
            nPMIValue: -0.157,
            countValue: 572,
          },
          {
            annotation: 'annotation3',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.05,
            countValue: 53,
          },
        ],
      });
    });

    it('returns empty result if no runs active', () => {
      const result = filterAnnotations(
        annotationData,
        [],
        metricArithmetic,
        metricFilters,
        metrics,
        ''
      );
      expect(result).toEqual({});
    });

    it('returns empty result if no metrics active', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        metricArithmetic,
        metricFilters,
        [],
        ''
      );
      expect(result).toEqual({});
    });

    it('returns empty result if no annotation data', () => {
      const result = filterAnnotations(
        {},
        activeRuns,
        metricArithmetic,
        metricFilters,
        metrics,
        ''
      );
      expect(result).toEqual({});
    });

    it('returns correct result with annotations regex active', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        metricArithmetic,
        metricFilters,
        metrics,
        'Ann.+_1$'
      );
      expect(result).toEqual({
        annotation_1: [
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
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_2',
            nPMIValue: 0.02157,
            countValue: 101,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.02157,
            countValue: 101,
          },
        ],
      });
    });

    it('returns empty result if filters exclude all annotations', () => {
      const result = filterAnnotations(
        annotationData,
        activeRuns,
        metricArithmetic,
        {
          'nPMI@test': {
            max: 1.0,
            min: 0.8,
            includeNaN: false,
          },
          'nPMI@other': {
            max: 0,
            min: -1.0,
            includeNaN: false,
          },
        },
        metrics,
        ''
      );
      expect(result).toEqual({});
    });
  });

  describe('remove hidden annotations', () => {
    it('returns correct non-hidden annotations', () => {
      const result = removeHiddenAnnotations(
        annotationData,
        hiddenAnnotations,
        false
      );
      expect(result).toEqual({
        annotation_1: [
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
          {
            annotation: 'annotation_1',
            metric: 'test',
            run: 'run_2',
            nPMIValue: 0.02157,
            countValue: 101,
          },
          {
            annotation: 'annotation_1',
            metric: 'other',
            run: 'run_2',
            nPMIValue: -0.02157,
            countValue: 101,
          },
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
      });
    });

    it('returns all annotations if showHidden is true', () => {
      const result = removeHiddenAnnotations(
        annotationData,
        hiddenAnnotations,
        true
      );
      expect(result).toEqual(annotationData);
    });

    it('returns all annotations if no annotations hidden', () => {
      const result = removeHiddenAnnotations(annotationData, [], false);
      expect(result).toEqual(annotationData);
    });

    it('returns empty object if no annotation data', () => {
      const result = removeHiddenAnnotations({}, hiddenAnnotations, false);
      expect(result).toEqual({});
    });
  });
});
