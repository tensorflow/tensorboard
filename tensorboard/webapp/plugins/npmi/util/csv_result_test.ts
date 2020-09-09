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
import {ValueData} from '../store/npmi_types';
import {convertToCSVResult} from './csv_result';

describe('csv result utils', () => {
  it('returns converted csv result', () => {
    const flaggedData: [string, ValueData[]][] = [
      [
        'annotation_1',
        [
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
      ],
      [
        'annotation_3',
        [
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_1',
            nPMIValue: null,
            countValue: 572,
          },
          {
            annotation: 'annotation_3',
            metric: 'third',
            run: 'run_1',
            nPMIValue: -0.157,
            countValue: 572,
          },
        ],
      ],
    ];
    const run = 'run_1';
    const metrics = ['nPMI@test', 'nPMI@other'];

    const result = convertToCSVResult(flaggedData, run, metrics);
    expect(result).toEqual(
      'data:text/csv;charset=utf-8,run_1,nPMI@test,nPMI@other\nannotation_1,0.5178,0.02157\nannotation_3,null,null'
    );
  });

  it('returns empty result when no metrics active', () => {
    const flaggedData: [string, ValueData[]][] = [
      [
        'annotation_1',
        [
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
      ],
      [
        'annotation_3',
        [
          {
            annotation: 'annotation_3',
            metric: 'test',
            run: 'run_1',
            nPMIValue: null,
            countValue: 572,
          },
          {
            annotation: 'annotation_3',
            metric: 'third',
            run: 'run_1',
            nPMIValue: -0.157,
            countValue: 572,
          },
        ],
      ],
    ];
    const run = 'run_1';
    const metrics: string[] = [];

    const result = convertToCSVResult(flaggedData, run, metrics);
    expect(result).toEqual('data:text/csv;charset=utf-8,run_1');
  });

  it('returns empty result when no flagged data', () => {
    const flaggedData: [string, ValueData[]][] = [];
    const run = 'run_1';
    const metrics = ['nPMI@test', 'nPMI@other'];

    const result = convertToCSVResult(flaggedData, run, metrics);
    expect(result).toEqual(
      'data:text/csv;charset=utf-8,run_1,nPMI@test,nPMI@other'
    );
  });
});
