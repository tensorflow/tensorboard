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

/**
 * Contains TypeScript type definitions for the JSON-representation of the
 * protocol buffers defined in api.proto
 *
 * TODO(erez): Add the rest of the definitions once these are needed.
 */
declare namespace tf.hparams {
  export interface MetricName {
    group: string;
    tag: string;
  }

  export interface MetricValue {
    name: MetricName;
    value: number;
    trainingStep: number;
    wallTimeSecs: number;
  }

  export interface SessionGroup {
    name: string;
    hparams: {
      [hparamName: string]: bool | number | string;
    };
    metric_values: MetricValue[];
    monitor_url: string;
  }
}
