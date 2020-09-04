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
import {coordinateData} from './coordinate_data';

describe('coordinate data utils', () => {
  it('creates violin data containing only selected metric and active runs', () => {
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
          metric: 'other',
          run: 'run_1',
          nPMIValue: -0.1,
          countValue: 53,
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
        {
          annotation: 'annotation_1',
          metric: 'third',
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
    };
    const selectedAnnotations = ['annotation_1'];
    const activeRuns = ['run_1', 'run_3'];
    const activeMetrics = ['test', 'other'];
    const data = coordinateData(
      annotationData,
      selectedAnnotations,
      activeRuns,
      activeMetrics
    );
    expect(data.extremes).toEqual({min: -0.1, max: 0.5178});
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
            nPMIValue: -0.1,
            countValue: 53,
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
      },
    ]);
  });
});
