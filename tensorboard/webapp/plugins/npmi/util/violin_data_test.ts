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
import {violinData} from './violin_data';

class TestableBin extends Array<number | any> {
  x0: number;
  x1: number;
  constructor(array: number[] | any[], x0: number, x1: number) {
    if (array.length === 1) {
      super();
      this.push(array[0]);
    } else {
      super(...array);
    }
    this.x0 = x0;
    this.x1 = x1;
  }
}

describe('violin data utils', () => {
  it('creates violin data containing only selected metric and active runs', () => {
    const annotationData: AnnotationDataListing = buildSampleAnnotationData();
    const activeRuns = ['run_1', 'run_3'];
    const metric = 'nPMI@test';
    const data = violinData(annotationData, activeRuns, metric);
    expect(data.extremes).toEqual({min: -0.31, max: 0.757});
    expect(data.violinData).toEqual({
      run_1: [
        new TestableBin([null], -Infinity, Infinity),
        new TestableBin([], -0.31, 0),
        new TestableBin([], 0, 0.5),
        new TestableBin([0.5178, 0.757], 0.5, 0.757),
      ],
      run_3: [
        new TestableBin([-0.31], -0.31, 0),
        new TestableBin([], 0, 0.757),
      ],
    });
  });
});
