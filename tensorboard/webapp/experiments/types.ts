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
export declare interface Experiment {
  id: string;
  repository_id?: string;
  name: string;
  start_time: number;
  owner?: string;
  description?: string;
  hparams?: string;
  tags?: string[];
  related_links?: Array<{name: string; url: string}>;
  // These state values were chosen to follow these AIPs
  // https://google.aip.dev/164 and https://google.aip.dev/216.
  state?: 'active' | 'hidden' | 'unspecified';
}

export interface ExperimentAlias {
  aliasText: string;
  aliasNumber: number;
}
