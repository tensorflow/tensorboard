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
} from '../store/npmi_types';
import {sortAnnotations} from './sort_annotations';

describe('sort annotations utils', () => {
  it('sorts annotations upwards', () => {
    const annotationData: AnnotationDataListing = {
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
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.02157,
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
      annotation_2: [
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_1',
          nPMIValue: null,
          countValue: 572,
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
          annotation: 'annotation_3',
          metric: 'test',
          run: 'run_2',
          nPMIValue: -0.157,
          countValue: 572,
        },
      ],
    };
    const sort: AnnotationSort = {
      metric: 'nPMI@test',
      order: SortOrder.UP,
    };
    const annotations = sortAnnotations(annotationData, sort);
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_3',
      'annotation_2',
    ]);
  });

  it('sorts annotations downwards', () => {
    const annotationData: AnnotationDataListing = {
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
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.02157,
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
          nPMIValue: 1.0,
          countValue: 53,
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
          annotation: 'annotation_3',
          metric: 'test',
          run: 'run_2',
          nPMIValue: -0.157,
          countValue: 572,
        },
      ],
    };
    const sort: AnnotationSort = {
      metric: 'nPMI@test',
      order: SortOrder.DOWN,
    };
    const annotations = sortAnnotations(annotationData, sort);
    expect(annotations).toEqual([
      'annotation_3',
      'annotation_1',
      'annotation_2',
    ]);
  });

  it('does not sort annotations if no metric specified', () => {
    const annotationData: AnnotationDataListing = {
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
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.02157,
          countValue: 101,
        },
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_3',
          nPMIValue: -0.1,
          countValue: 53,
        },
        {
          annotation: 'annotation_1',
          metric: 'other',
          run: 'run_3',
          nPMIValue: -0.1,
          countValue: 53,
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
      ],
      annotation_3: [
        {
          annotation: 'annotation_3',
          metric: 'test',
          run: 'run_1',
          nPMIValue: 0.757,
          countValue: 572,
        },
      ],
    };
    const sort: AnnotationSort = {
      metric: '',
      order: SortOrder.UP,
    };
    const annotations = sortAnnotations(annotationData, sort);
    expect(annotations).toEqual([
      'annotation_1',
      'annotation_2',
      'annotation_3',
    ]);
  });
});
