/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

export interface HparamInfo {
  description: string;
  displayName: string;
  name: string;
  type:
    | 'DATA_TYPE_UNSET'
    | 'DATA_TYPE_STRING'
    | 'DATA_TYPE_BOOL'
    | 'DATA_TYPE_FLOAT64';
}

export interface MetricInfo {
  datasetType: 'DATASET_UNKNOWN' | 'DATASET_TRAINING' | 'DATASET_VALIDATION';
  description: string;
  displayName: string;
  name: {tag: string; group: string};
}

export interface Schema {
  hparamColumn: Array<{
    hparamInfo: HparamInfo;
  }>;
  metricColumn: Array<{
    metricInfo: MetricInfo;
  }>;
}
